const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('security headers', () => {
  let app, db;
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });
  afterEach(() => { db.close(); delete process.env.FRONTEND_URL; });

  test('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('sets a Content-Security-Policy with the configured directives', async () => {
    const res = await request(app).get('/api/menu');
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toMatch(/font-src[^;]*fonts\.gstatic\.com/);
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
    expect(csp).toMatch(/style-src[^;]*fonts\.googleapis\.com/);
  });

  test('no CORS header when FRONTEND_URL is unset', async () => {
    const res = await request(app).get('/api/menu').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('applies CORS with the explicit origin when FRONTEND_URL is set', async () => {
    process.env.FRONTEND_URL = 'https://wedding.example.com';
    const db2 = initDb(':memory:');
    const app2 = createApp(db2);
    const res = await request(app2)
      .get('/api/menu')
      .set('Origin', 'https://wedding.example.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://wedding.example.com');
    db2.close();
  });
});
