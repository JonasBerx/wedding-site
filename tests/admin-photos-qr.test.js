const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

const AUTH = 'Basic ' + Buffer.from('admin:secret').toString('base64');

describe('admin QR', () => {
  let app, db;
  beforeAll(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.GUEST_UPLOAD_PASSWORD = 'love2026';
    process.env.PUBLIC_SITE_URL = 'https://wedding.example';
    process.env.COOKIE_SECRET = 'test-secret';
  });
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db, { mediaDir: '/tmp/x' }); });
  afterEach(() => { db.close(); });

  test('GET qr.svg requires auth', async () => {
    const res = await request(app).get('/api/admin/photos/qr.svg');
    expect(res.status).toBe(401);
  });

  test('GET qr.svg returns image/svg+xml encoding the upload URL', async () => {
    const res = await request(app).get('/api/admin/photos/qr.svg').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/svg/);
    expect(res.text).toMatch(/<svg/);
  });

  test('GET qr.png returns image/png', async () => {
    const res = await request(app).get('/api/admin/photos/qr.png').set('Authorization', AUTH).buffer(true).parse((res, cb) => {
      const data = [];
      res.on('data', (c) => data.push(c));
      res.on('end', () => cb(null, Buffer.concat(data)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.body.slice(0, 4).toString('hex')).toBe('89504e47');
  });

  test('GET qr.png supports size param within bounds', async () => {
    const res = await request(app).get('/api/admin/photos/qr.png?size=512').set('Authorization', AUTH);
    expect(res.status).toBe(200);
  });

  test('exposes the target URL via GET qr-target for the admin UI', async () => {
    const res = await request(app).get('/api/admin/photos/qr-target').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://wedding.example/photos?k=love2026');
  });
});
