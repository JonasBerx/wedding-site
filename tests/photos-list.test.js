const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');
const { ensureMediaDirs } = require('../src/media/storage');

describe('GET /api/photos', () => {
  let app, db, mediaDir;
  beforeAll(() => {
    process.env.GUEST_UPLOAD_PASSWORD = 'pw';
    process.env.COOKIE_SECRET = 'test-secret';
  });
  beforeEach(() => {
    mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'list-'));
    ensureMediaDirs(mediaDir);
    db = initDb(':memory:');
    app = createApp(db, { mediaDir });
  });
  afterEach(() => { db.close(); fs.rmSync(mediaDir, { recursive: true, force: true }); });

  test('returns an empty list when no photos', async () => {
    const res = await request(app).get('/api/photos');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.next_cursor).toBeNull();
  });

  test('lists visible photos newest first; excludes hidden', async () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:1 });
    const b = db.insertGuestPhoto({ media_type:'photo', filename:'b.jpg', thumb_filename:'b.jpg', mime_type:'image/jpeg', size_bytes:1 });
    db.setGuestPhotoHidden(a.id, 1);
    const res = await request(app).get('/api/photos');
    expect(res.body.items.map(i => i.filename)).toEqual(['b.jpg']);
    expect(res.body.items[0].media_url).toBe('/media/b.jpg');
  });

  test('respects limit and returns cursor', async () => {
    for (let i = 0; i < 5; i++) db.insertGuestPhoto({ media_type:'photo', filename:`p${i}.jpg`, thumb_filename:`p${i}.jpg`, mime_type:'image/jpeg', size_bytes:1 });
    const res = await request(app).get('/api/photos?limit=2');
    expect(res.body.items).toHaveLength(2);
    expect(res.body.next_cursor).toBeTruthy();
    const res2 = await request(app).get('/api/photos').query({ limit: 2, cursor: res.body.next_cursor });
    expect(res2.body.items).toHaveLength(2);
  });

  test('responds with Cache-Control: no-store', async () => {
    const res = await request(app).get('/api/photos');
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });
});
