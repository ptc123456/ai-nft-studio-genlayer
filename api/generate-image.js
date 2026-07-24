import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';

const MODEL = 'pollinations-flux';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sendJson(res, 503, {
      error: 'Artwork storage is not configured. Link a Vercel Blob store and try again.'
    });
  }

  try {
    const combinedPrompt = encodeURIComponent(`Polished square 1:1 NFT artwork titled "${title}". ${prompt}`);
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${combinedPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    const imgResponse = await fetch(pollinationsUrl, {
      signal: AbortSignal.timeout(45_000)
    });
    if (!imgResponse.ok) {
      throw new Error(`FLUX image engine returned status ${imgResponse.status}`);
    }

    const mimeType = (imgResponse.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!mimeType.startsWith('image/')) {
      throw new Error(`FLUX image engine returned invalid content type: ${mimeType || 'unknown'}`);
    }

    const declaredSize = Number(imgResponse.headers.get('content-length') || 0);
    if (declaredSize > 10 * 1024 * 1024) {
      throw new Error('INVALID_IMAGE_SIZE');
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    if (imageBuffer.length === 0 || imageBuffer.length > 10 * 1024 * 1024) {
      throw new Error('INVALID_IMAGE_SIZE');
    }

    const extension =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const blob = await put(`ai-nft-studio/${randomUUID()}.${extension}`, imageBuffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: mimeType,
      cacheControlMaxAge: 31536000
    });
    const publicUrl = blob.url;

    if (
      typeof publicUrl !== 'string' ||
      !publicUrl.startsWith('https://') ||
      publicUrl.length > 500
    ) {
      throw new Error('INVALID_PUBLIC_ARTWORK_URL');
    }

    return sendJson(res, 200, {
      url: publicUrl,
      contentType: mimeType,
      model: MODEL
    });
  } catch (error) {
    console.error('FLUX AI image generation error:', error?.message || error);
    return sendJson(res, 502, { error: 'Could not generate artwork. Please adjust your prompt and try again.' });
  }
}
