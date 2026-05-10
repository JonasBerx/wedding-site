const path = require('path');
const fs = require('fs');
const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('Static file serving', () => {
  let app, db;
  const distDir = path.join(__dirname, '../dist');
  const indexPath = path.join(distDir, 'index.html');
  const fixtureHtml = '<!doctype html><html><body>wedding</body></html>';

  beforeAll(() => {
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(indexPath, fixtureHtml);
  });

  afterAll(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  test('GET / serves index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('wedding');
  });

  test('GET /unknown-page serves index.html for SPA routing', async () => {
    const res = await request(app).get('/some-unknown-page');
    expect(res.status).toBe(200);
    expect(res.text).toContain('wedding');
  });

  test('API routes still respond (not swallowed by static fallback)', async () => {
    const res = await request(app).post('/api/rsvp').send({});
    expect(res.status).not.toBe(404);
  });
});
