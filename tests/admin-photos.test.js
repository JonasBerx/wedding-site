const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');
const { ensureMediaDirs } = require('../src/media/storage');

const AUTH = 'Basic ' + Buffer.from('admin:secret').toString('base64');

describe('admin photos', () => {
  let app, db, mediaDir;
  beforeAll(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.COOKIE_SECRET = 'test-secret';
  });
  beforeEach(() => {
    mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adm-'));
    ensureMediaDirs(mediaDir);
    db = initDb(':memory:');
    app = createApp(db, { mediaDir });
  });
  afterEach(() => { db.close(); fs.rmSync(mediaDir, { recursive: true, force: true }); });

  test('GET requires auth', async () => {
    const res = await request(app).get('/api/admin/photos');
    expect(res.status).toBe(401);
  });

  test('GET returns all photos including hidden + stats', async () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:100 });
    db.setGuestPhotoHidden(a.id, 1);
    db.insertGuestPhoto({ media_type:'photo', filename:'b.jpg', thumb_filename:'b.jpg', mime_type:'image/jpeg', size_bytes:200 });
    const res = await request(app).get('/api/admin/photos').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.stats).toEqual({ total: 2, hidden: 1, total_bytes: 300 });
  });

  test('PATCH toggles hidden flag', async () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:1 });
    const res = await request(app).patch(`/api/admin/photos/${a.id}`).set('Authorization', AUTH).send({ hidden: true });
    expect(res.status).toBe(200);
    expect(db.getGuestPhotoById(a.id).hidden).toBe(1);
  });

  test('DELETE removes row and disk files', async () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:1 });
    fs.writeFileSync(path.join(mediaDir, 'originals', 'a.jpg'), 'x');
    fs.writeFileSync(path.join(mediaDir, 'thumbs', 'a.jpg'), 'y');
    const res = await request(app).delete(`/api/admin/photos/${a.id}`).set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(db.getGuestPhotoById(a.id)).toBeNull();
    expect(fs.existsSync(path.join(mediaDir, 'originals', 'a.jpg'))).toBe(false);
    expect(fs.existsSync(path.join(mediaDir, 'thumbs', 'a.jpg'))).toBe(false);
  });

  test('DELETE on missing id returns 404', async () => {
    const res = await request(app).delete('/api/admin/photos/999').set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});
