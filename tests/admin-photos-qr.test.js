const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

const AUTH = 'Basic ' + Buffer.from('admin:secret').toString('base64');

// PNG QR generation is a CPU-heavy pure-JS raster encode. In production it
// completes in ~90ms, but inside the Jest VM it runs ~50x slower (~5s for the
// 1024px default), which flakes against Jest's 5000ms default timeout under
// parallel-suite CPU contention. Give the PNG tests a generous explicit budget.
const QR_PNG_TIMEOUT_MS = 20000;

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
    const res = await request(app).get('/api/admin/photos/qr.svg').set('Authorization', AUTH).buffer(true).parse((res, cb) => {
      const data = [];
      res.on('data', (c) => data.push(c));
      res.on('end', () => cb(null, Buffer.concat(data)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(res.body.toString('utf8')).toMatch(/<svg/);
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
  }, QR_PNG_TIMEOUT_MS);

  test('GET qr.png supports size param within bounds', async () => {
    const res = await request(app).get('/api/admin/photos/qr.png?size=512').set('Authorization', AUTH);
    expect(res.status).toBe(200);
  }, QR_PNG_TIMEOUT_MS);

  test('exposes the target URL via GET qr-target for the admin UI', async () => {
    const res = await request(app).get('/api/admin/photos/qr-target').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://wedding.example/photos?k=love2026');
  });
});
