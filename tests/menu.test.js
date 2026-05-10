const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('GET /api/menu', () => {
  let app, db;
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });
  afterEach(()  => { db.close(); });

  test('returns empty array when no items', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns items grouped by course in sort order, with public fields only', async () => {
    db.insertMenuItem({ course: 'main',  name: 'Lamb',   note: 'jus',   is_vegan: 0 });
    db.insertMenuItem({ course: 'first', name: 'Tomato', note: 'basil', is_vegan: 0 });
    db.insertMenuItem({ course: 'first', name: 'Roast veg', note: 'thyme', is_vegan: 1 });

    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: expect.any(Number), course: 'first', name: 'Tomato',    note: 'basil', is_vegan: 0 },
      { id: expect.any(Number), course: 'first', name: 'Roast veg', note: 'thyme', is_vegan: 1 },
      { id: expect.any(Number), course: 'main',  name: 'Lamb',      note: 'jus',   is_vegan: 0 },
    ]);
    // No internal fields leaked
    expect(res.body[0]).not.toHaveProperty('sort_order');
    expect(res.body[0]).not.toHaveProperty('created_at');
  });
});

const VALID_AUTH = 'Basic ' + Buffer.from('admin:secret').toString('base64');

describe('admin /api/admin/menu', () => {
  let app, db;
  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => { db.close(); });

  test('GET requires auth', async () => {
    const res = await request(app).get('/api/admin/menu');
    expect(res.status).toBe(401);
  });

  test('GET returns items with sort_order and referenced_count', async () => {
    db.insertMenuItem({ course: 'first', name: 'Tomato', note: null, is_vegan: 0 });
    const res = await request(app).get('/api/admin/menu').set('Authorization', VALID_AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(expect.objectContaining({
      course: 'first', name: 'Tomato', sort_order: 0, referenced_count: 0,
    }));
  });

  test('POST creates an item with default sort_order', async () => {
    const res = await request(app).post('/api/admin/menu')
      .set('Authorization', VALID_AUTH)
      .send({ course: 'first', name: 'Beet', note: 'goat', is_vegan: false });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      course: 'first', name: 'Beet', is_vegan: 0, sort_order: 0,
    }));
  });

  test('POST rejects invalid course', async () => {
    const res = await request(app).post('/api/admin/menu')
      .set('Authorization', VALID_AUTH)
      .send({ course: 'dessert', name: 'X' });
    expect(res.status).toBe(400);
  });

  test('POST rejects empty name', async () => {
    const res = await request(app).post('/api/admin/menu')
      .set('Authorization', VALID_AUTH)
      .send({ course: 'first', name: '   ' });
    expect(res.status).toBe(400);
  });

  test('PATCH toggles is_vegan', async () => {
    const inserted = db.insertMenuItem({ course: 'main', name: 'Risotto', is_vegan: 0 });
    const res = await request(app).patch(`/api/admin/menu/${inserted.lastInsertRowid}`)
      .set('Authorization', VALID_AUTH)
      .send({ is_vegan: true });
    expect(res.status).toBe(200);
    expect(res.body.is_vegan).toBe(1);
  });

  test('DELETE removes unreferenced item and compacts order', async () => {
    const a = db.insertMenuItem({ course: 'first', name: 'A' });
    const b = db.insertMenuItem({ course: 'first', name: 'B' });
    const c = db.insertMenuItem({ course: 'first', name: 'C' });
    const res = await request(app).delete(`/api/admin/menu/${b.lastInsertRowid}`)
      .set('Authorization', VALID_AUTH);
    expect(res.status).toBe(204);
    const items = db.getMenuItems('first');
    expect(items.map(i => [i.name, i.sort_order])).toEqual([['A', 0], ['C', 1]]);
  });

  test('DELETE blocked when item is referenced by an RSVP', async () => {
    const item = db.insertMenuItem({ course: 'first', name: 'Linked' });
    const main = db.insertMenuItem({ course: 'main',  name: 'M' });
    db.insertRsvp({
      name: 'X', email: 'x@x.com', attending: 1,
      event_type: 'full',
      first_course_id: item.lastInsertRowid,
      main_course_id:  main.lastInsertRowid,
    });
    const res = await request(app).delete(`/api/admin/menu/${item.lastInsertRowid}`)
      .set('Authorization', VALID_AUTH);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('referenced');
  });

  test('POST /reorder rewrites sort_order in the given order', async () => {
    const a = db.insertMenuItem({ course: 'first', name: 'A' });
    const b = db.insertMenuItem({ course: 'first', name: 'B' });
    const c = db.insertMenuItem({ course: 'first', name: 'C' });
    const res = await request(app).post('/api/admin/menu/reorder')
      .set('Authorization', VALID_AUTH)
      .send({ course: 'first', ordered_ids: [c.lastInsertRowid, a.lastInsertRowid, b.lastInsertRowid] });
    expect(res.status).toBe(200);
    const items = db.getMenuItems('first');
    expect(items.map(i => i.name)).toEqual(['C', 'A', 'B']);
  });

  test('POST /reorder rejects mismatched id set', async () => {
    db.insertMenuItem({ course: 'first', name: 'A' });
    const res = await request(app).post('/api/admin/menu/reorder')
      .set('Authorization', VALID_AUTH)
      .send({ course: 'first', ordered_ids: [9999] });
    expect(res.status).toBe(409);
  });
});
