const fs = require('node:fs');
const path = require('node:path');
const { sniff, isAllowed } = require('../../src/media/sniff');

const fx = (n) => path.join(__dirname, '..', 'fixtures', n);

describe('media sniff', () => {
  test('detects JPEG', async () => {
    const r = await sniff(fs.readFileSync(fx('sample.jpg')));
    expect(r.mime).toBe('image/jpeg');
    expect(r.ext).toBe('jpg');
  });
  test('detects PNG', async () => {
    const r = await sniff(fs.readFileSync(fx('sample.png')));
    expect(r.mime).toBe('image/png');
  });
  test('detects MP4', async () => {
    const r = await sniff(fs.readFileSync(fx('sample.mp4')));
    expect(r.mime).toBe('video/mp4');
  });
  test('returns null for garbage', async () => {
    const r = await sniff(fs.readFileSync(fx('not-an-image.bin')));
    expect(r).toBeNull();
  });
  test('isAllowed gates by allowlist', () => {
    expect(isAllowed('image/jpeg')).toBe(true);
    expect(isAllowed('application/x-msdownload')).toBe(false);
  });
});
