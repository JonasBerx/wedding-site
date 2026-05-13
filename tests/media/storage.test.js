const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ensureMediaDirs, originalPath, thumbPath, deleteFiles } = require('../../src/media/storage');

describe('media storage', () => {
  let tmp;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-')); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test('ensureMediaDirs creates originals/ and thumbs/', () => {
    ensureMediaDirs(tmp);
    expect(fs.existsSync(path.join(tmp, 'originals'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'thumbs'))).toBe(true);
  });

  test('originalPath and thumbPath return correct joined paths', () => {
    expect(originalPath(tmp, 'a.jpg')).toBe(path.join(tmp, 'originals', 'a.jpg'));
    expect(thumbPath(tmp, 'a.jpg')).toBe(path.join(tmp, 'thumbs', 'a.jpg'));
  });

  test('originalPath rejects path traversal', () => {
    expect(() => originalPath(tmp, '../escape.jpg')).toThrow(/invalid filename/);
    expect(() => originalPath(tmp, 'a/b.jpg')).toThrow(/invalid filename/);
  });

  test('deleteFiles removes both original and thumb if present', () => {
    ensureMediaDirs(tmp);
    const o = originalPath(tmp, 'x.jpg');
    const t = thumbPath(tmp, 'x.jpg');
    fs.writeFileSync(o, 'a'); fs.writeFileSync(t, 'b');
    deleteFiles(tmp, 'x.jpg', 'x.jpg');
    expect(fs.existsSync(o)).toBe(false);
    expect(fs.existsSync(t)).toBe(false);
  });

  test('deleteFiles tolerates missing files', () => {
    ensureMediaDirs(tmp);
    expect(() => deleteFiles(tmp, 'nope.jpg', 'nope.jpg')).not.toThrow();
  });
});
