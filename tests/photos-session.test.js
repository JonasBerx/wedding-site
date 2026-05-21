const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('POST /api/photos/session', () => {
  let app, db;
  beforeAll(() => {
    process.env.GUEST_UPLOAD_PASSWORD = 'love2026';
    process.env.COOKIE_SECRET = 'test-secret';
  });
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db, { mediaDir: '/tmp/x' }); });
  afterEach(() => { db.close(); });

  test('returns 204 and sets a signed cookie for correct password', async () => {
    const res = await request(app).post('/api/photos/session').send({ password: 'love2026' });
    expect(res.status).toBe(204);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.join(';')).toMatch(/guest_upload=/);
    expect(setCookie.join(';')).toMatch(/HttpOnly/i);
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/photos/session').send({ password: 'nope' });
    expect(res.status).toBe(401);
  });

  test('returns 400 if password missing', async () => {
    const res = await request(app).post('/api/photos/session').send({});
    expect(res.status).toBe(400);
  });

  test('rate-limits POST /api/photos/session after 10 attempts', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app).post('/api/photos/session').send({ password: 'wrong' });
    }
    expect(last.status).toBe(429);
    expect(last.body.error).toBe('rate_limited');
  });
});
