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

describe('GET /admin — content', () => {
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

  test('shows all RSVPs in an HTML table', async () => {
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1, meal_preference: 'Fish', dietary_restrictions: null });
    db.insertRsvp({ name: 'Bob', email: 'bob@example.com', attending: 0, meal_preference: null, dietary_restrictions: 'Vegan' });

    const res = await request(app).get('/admin').auth('admin', 'secret');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Alice');
    expect(res.text).toContain('alice@example.com');
    expect(res.text).toContain('Yes');
    expect(res.text).toContain('Fish');
    expect(res.text).toContain('Bob');
    expect(res.text).toContain('No');
    expect(res.text).toContain('Vegan');
  });

  test('shows RSVP count in the heading', async () => {
    db.insertRsvp({ name: 'Alice', email: 'a@example.com', attending: 1, meal_preference: null, dietary_restrictions: null });
    const res = await request(app).get('/admin').auth('admin', 'secret');
    expect(res.text).toContain('1');
  });

  test('shows empty table when no RSVPs', async () => {
    const res = await request(app).get('/admin').auth('admin', 'secret');
    expect(res.status).toBe(200);
    expect(res.text).toContain('RSVPs');
  });

  test('escapes HTML special characters in guest data', async () => {
    db.insertRsvp({ name: '<script>alert(1)</script>', email: 'x@example.com', attending: 1, meal_preference: null, dietary_restrictions: null });
    const res = await request(app).get('/admin').auth('admin', 'secret');
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
});
