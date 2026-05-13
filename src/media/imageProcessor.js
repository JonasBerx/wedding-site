const sharp = require('sharp');

const MAX_EDGE = 1920;
const THUMB_EDGE = 600;
const JPEG_Q = 82;
const THUMB_Q = 78;

async function processImage(buffer) {
  const pipeline = sharp(buffer).rotate();
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Could not read image dimensions');
  }
  const longestEdge = Math.max(meta.width, meta.height);
  const targetEdge = Math.min(MAX_EDGE, longestEdge);

  const mainBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: targetEdge, height: targetEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_Q, mozjpeg: true })
    .toBuffer();
  const mainMeta = await sharp(mainBuffer).metadata();

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_Q, mozjpeg: true })
    .toBuffer();

  return {
    mime_type: 'image/jpeg',
    ext: 'jpg',
    buffer: mainBuffer,
    thumb_buffer: thumbBuffer,
    width: mainMeta.width,
    height: mainMeta.height,
  };
}

module.exports = { processImage };
