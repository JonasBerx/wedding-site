const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('GET /admin — authentication', () => {
  let app, db;

  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('returns 401 with no credentials', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(401);
  });

  test('returns 401 with wrong password', async () => {
    const res = await request(app).get('/admin').auth('admin', 'wrong');
    expect(res.status).toBe(401);
  });

  test('returns 401 with wrong username', async () => {
    const res = await request(app).get('/admin').auth('hacker', 'secret');
    expect(res.status).toBe(401);
  });

  test('returns 200 with correct credentials', async () => {
    const res = await request(app).get('/admin').auth('admin', 'secret');
    expect(res.status).toBe(200);
  });
});
