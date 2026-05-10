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
