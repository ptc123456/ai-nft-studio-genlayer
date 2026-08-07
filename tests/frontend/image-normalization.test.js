import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';

import { normalizeArtwork } from '../../api/generate-image.js';

test('normalizes generated JPEG evidence to PNG for Studionet vision providers', async () => {
  const jpeg = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 3,
      background: '#22c55e'
    }
  }).jpeg().toBuffer();

  const normalized = await normalizeArtwork(jpeg);
  const metadata = await sharp(normalized).metadata();

  assert.equal(metadata.format, 'png');
  assert.deepEqual(normalized.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
});
