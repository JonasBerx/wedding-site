const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');
const { ensureMediaDirs } = require('../src/media/storage');

describe('GET /media/*', () => {
  let app, db, mediaDir;
  beforeAll(() => { process.env.COOKIE_SECRET = 'test-secret'; });
  beforeEach(() => {
    mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdir-'));
    ensureMediaDirs(mediaDir);
    db = initDb(':memory:');
    app = createApp(db, { mediaDir });
  });
  afterEach(() => { db.close(); fs.rmSync(mediaDir, { recursive: true, force: true }); });

  function seedFile(rel, name, body) {
    fs.writeFileSync(path.join(mediaDir, rel, name), body);
  }

  test('serves an original file with cache headers', async () => {
    db.insertGuestPhoto({ media_type:'photo', filename:'hello.jpg', thumb_filename:'hello.jpg', mime_type:'image/jpeg', size_bytes:5 });
    seedFile('originals', 'hello.jpg', 'hello');
    seedFile('thumbs', 'hello.jpg', 'hello');
    const res = await request(app).get('/media/hello.jpg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
    expect(res.headers['cache-control']).toMatch(/immutable/);
    expect(res.body.toString()).toBe('hello');
  });

  test('serves a thumb', async () => {
    db.insertGuestPhoto({ media_type:'photo', filename:'hello.jpg', thumb_filename:'hello.jpg', mime_type:'image/jpeg', size_bytes:5 });
    seedFile('thumbs', 'hello.jpg', 'thumb-bytes');
    const res = await request(app).get('/media/thumbs/hello.jpg');
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('thumb-bytes');
  });

  test('returns 404 when DB row is missing', async () => {
    seedFile('originals', 'orphan.jpg', 'x');
    const res = await request(app).get('/media/orphan.jpg');
    expect(res.status).toBe(404);
  });

  test('returns 404 when hidden=1', async () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'h.jpg', thumb_filename:'h.jpg', mime_type:'image/jpeg', size_bytes:1 });
    db.setGuestPhotoHidden(a.id, 1);
    seedFile('originals', 'h.jpg', 'x');
    const res = await request(app).get('/media/h.jpg');
    expect(res.status).toBe(404);
  });

  test('rejects path traversal', async () => {
    const res = await request(app).get('/media/..%2Fescape.jpg');
    expect(res.status).toBe(400);
  });
});
