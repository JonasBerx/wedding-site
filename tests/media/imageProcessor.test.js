const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { processImage } = require('../../src/media/imageProcessor');

const fx = (n) => path.join(__dirname, '..', 'fixtures', n);

describe('processImage', () => {
  test('resizes JPEG to max 1920 longest edge and produces 600px thumb', async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 10, g: 200, b: 50 } } })
      .jpeg().toBuffer();
    const out = await processImage(big);
    expect(out.mime_type).toBe('image/jpeg');
    expect(out.width).toBeLessThanOrEqual(1920);
    expect(out.height).toBeLessThanOrEqual(1920);
    const meta = await sharp(out.buffer).metadata();
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(1920);
    const tmeta = await sharp(out.thumb_buffer).metadata();
    expect(Math.max(tmeta.width, tmeta.height)).toBeLessThanOrEqual(600);
  });

  test('passes small images through without upscaling', async () => {
    const small = fs.readFileSync(fx('sample.jpg'));
    const meta = await sharp(small).metadata();
    const out = await processImage(small);
    const outMeta = await sharp(out.buffer).metadata();
    expect(outMeta.width).toBe(meta.width);
  });

  test('strips EXIF metadata', async () => {
    const withExif = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 1, g: 2, b: 3 } } })
      .withMetadata({ exif: { IFD0: { Copyright: 'someone' } } }).jpeg().toBuffer();
    const out = await processImage(withExif);
    const m = await sharp(out.buffer).metadata();
    expect(m.exif).toBeUndefined();
  });

  test('throws on garbage buffer', async () => {
    await expect(processImage(Buffer.from([0, 1, 2, 3]))).rejects.toThrow();
  });
});
