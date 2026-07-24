import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';

const MODEL = 'gemini-3.1-flash-image';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimits = new Map();

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function parseBody(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === 'string') {
    return JSON.parse(body);
  }
  return {};
}

function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isRateLimited(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || 'unknown')
    .split(',')[0]
    .trim();
  const now = Date.now();
  const current = rateLimits.get(clientIp);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(clientIp, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

async function generateFallbackImage(title, prompt) {
  const combinedPrompt = encodeURIComponent(`Polished square 1:1 NFT artwork titled "${title}". ${prompt}`);
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${combinedPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
  
  const res = await fetch(pollinationsUrl);
  if (!res.ok) {
    throw new Error(`Fallback image generator failed with status ${res.status}`);
  }
  
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new Error('Fallback image returned empty buffer');
  }
  return buffer;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!isSameOriginRequest(req)) {
    return sendJson(res, 403, { error: 'Cross-origin image generation is not allowed.' });
  }

  if (isRateLimited(req)) {
    return sendJson(res, 429, { error: 'Too many image requests. Please wait before trying again.' });
  }

  let body;
  try {
    body = parseBody(req.body);
  } catch {
    return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (title.length < 2 || title.length > 80) {
    return sendJson(res, 400, { error: 'Title must be between 2 and 80 characters.' });
  }

  if (prompt.length < 20 || prompt.length > 800) {
    return sendJson(res, 400, { error: 'Prompt must be between 20 and 800 characters.' });
  }

  let imageBuffer = null;
  let mimeType = 'image/jpeg';
  let usedModel = MODEL;

  // Primary: Try Gemini AI if key is set
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const generationPrompt = [
        `Create a polished square NFT artwork titled "${title}".`,
        prompt,
        'Produce one complete 1:1 composition with strong visual hierarchy and gallery-ready detail.',
        'Do not add frames, UI elements, logos, captions, signatures, or written text unless the prompt explicitly asks for text.'
      ].join('\n\n');

      const interaction = await ai.interactions.create({
        model: MODEL,
        input: generationPrompt,
        response_format: {
          type: 'image',
          mime_type: 'image/jpeg',
          aspect_ratio: '1:1',
          image_size: '1K'
        }
      });

      const imageData = interaction.output_image?.data;
      mimeType = interaction.output_image?.mime_type || 'image/jpeg';

      if (imageData && mimeType.startsWith('image/')) {
        imageBuffer = Buffer.from(imageData, 'base64');
      }
    } catch (error) {
      console.warn('Gemini image generation quota exceeded or failed, attempting FLUX AI Engine fallback...', error?.message || error);
    }
  }

  // Fallback: Use FLUX AI Engine if Gemini failed or key missing
  if (!imageBuffer || imageBuffer.length === 0) {
    try {
      imageBuffer = await generateFallbackImage(title, prompt);
      usedModel = 'pollinations-flux';
    } catch (fallbackError) {
      console.error('All image generation methods failed:', fallbackError);
      return sendJson(res, 502, { error: 'Could not generate artwork image. Please try again.' });
    }
  }

  // Store output to Vercel Blob or return data URL
  try {
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
    let publicUrl = '';

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`ai-nft-studio/${randomUUID()}.${extension}`, imageBuffer, {
          access: 'public',
          addRandomSuffix: true,
          contentType: mimeType,
          cacheControlMaxAge: 31536000
        });
        publicUrl = blob.url;
      } catch (blobErr) {
        publicUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      }
    } else {
      publicUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }

    return sendJson(res, 200, {
      url: publicUrl,
      contentType: mimeType,
      model: usedModel
    });
  } catch (err) {
    console.error('Failed to process image payload:', err);
    return sendJson(res, 500, { error: 'Failed to process generated image.' });
  }
}
