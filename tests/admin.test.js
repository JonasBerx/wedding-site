const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('GET /api/admin/rsvps — auth', () => {
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
    const res = await request(app).get('/api/admin/rsvps');
    expect(res.status).toBe(401);
  });

  test('returns 401 with wrong password', async () => {
    const res = await request(app).get('/api/admin/rsvps').auth('admin', 'wrong');
    expect(res.status).toBe(401);
  });

  test('returns all RSVPs as JSON array', async () => {
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1, event_type: 'full', is_vegan: 0, meal_preference: 1, dietary_restrictions: null });
    const res = await request(app).get('/api/admin/rsvps').auth('admin', 'secret');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Alice');
    expect(res.body[0].event_type).toBe('full');
  });
});

describe('GET /api/admin/registry', () => {
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
    const res = await request(app).get('/api/admin/registry');
    expect(res.status).toBe(401);
  });

  test('returns items with claimer_name for claimed items', async () => {
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    db.insertRegistryItem({ title: 'Honeymoon fund' });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    const res = await request(app).get('/api/admin/registry').auth('admin', 'secret');
    expect(res.status).toBe(200);
    expect(res.body[0].claimer_name).toBe('Alice');
  });

  test('returns null claimer_name for unclaimed items', async () => {
    db.insertRegistryItem({ title: 'Test' });
    const res = await request(app).get('/api/admin/registry').auth('admin', 'secret');
    expect(res.body[0].claimer_name).toBeNull();
  });
});

describe('POST /api/admin/registry', () => {
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
    const res = await request(app).post('/api/admin/registry').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  test('returns 400 if title missing', async () => {
    const res = await request(app).post('/api/admin/registry')
      .auth('admin', 'secret').send({ description: 'no title' });
    expect(res.status).toBe(400);
  });

  test('creates item and returns it as JSON', async () => {
    const res = await request(app).post('/api/admin/registry')
      .auth('admin', 'secret')
      .send({ title: 'Honeymoon fund', description: 'Contribute to our trip' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Honeymoon fund');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 if title is empty string', async () => {
    const res = await request(app).post('/api/admin/registry')
      .auth('admin', 'secret').send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/registry/:id', () => {
  let app, db;
  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
    db.insertRegistryItem({ title: 'Test' });
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('returns 401 with no credentials', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).delete(`/api/admin/registry/${item.id}`);
    expect(res.status).toBe(401);
  });

  test('deletes unclaimed item', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).delete(`/api/admin/registry/${item.id}`).auth('admin', 'secret');
    expect(res.status).toBe(200);
    expect(db.getAllRegistryItems()).toHaveLength(0);
  });

  test('returns 409 when item is claimed', async () => {
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    const res = await request(app).delete(`/api/admin/registry/${item.id}`).auth('admin', 'secret');
    expect(res.status).toBe(409);
  });

  test('returns 404 for non-existent item', async () => {
    const res = await request(app).delete('/api/admin/registry/99999').auth('admin', 'secret');
    expect(res.status).toBe(404);
  });
});
