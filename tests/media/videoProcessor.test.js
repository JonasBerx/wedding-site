const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { processVideo } = require('../../src/media/videoProcessor');

const fx = (n) => path.join(__dirname, '..', 'fixtures', n);

describe('processVideo', () => {
  let tmp;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-')); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test('produces re-encoded mp4 and poster jpg for a short clip', async () => {
    const out = await processVideo(fs.readFileSync(fx('sample.mp4')), tmp);
    expect(out.mime_type).toBe('video/mp4');
    expect(out.ext).toBe('mp4');
    expect(out.buffer.length).toBeGreaterThan(0);
    expect(out.thumb_buffer.length).toBeGreaterThan(0);
    expect(out.duration_sec).toBeGreaterThan(0);
    expect(out.duration_sec).toBeLessThan(10);
    expect(out.width).toBeGreaterThan(0);
  }, 30000);

  test('rejects videos longer than MAX_DURATION_SEC', async () => {
    await expect(processVideo(fs.readFileSync(fx('long.mp4')), tmp))
      .rejects.toMatchObject({ code: 'video_too_long' });
  }, 30000);

  test('rejects unreadable bytes', async () => {
    await expect(processVideo(Buffer.from([0, 1, 2, 3]), tmp)).rejects.toThrow();
  });
});
