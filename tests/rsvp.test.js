const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('POST /api/rsvp', () => {
  let app, db;

  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  test('returns 201 with all valid fields', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      meal_preference: 'Fish',
      dietary_restrictions: 'Nut allergy',
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('RSVP received');
  });

  test('returns 201 without optional fields', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Bob',
      email: 'bob@example.com',
      attending: false,
    });
    expect(res.status).toBe(201);
  });

  test('stores optional fields in database', async () => {
    await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      meal_preference: 'Vegetarian',
      dietary_restrictions: 'Gluten free',
    });
    const rsvps = db.getAllRsvps();
    expect(rsvps[0].meal_preference).toBe('Vegetarian');
    expect(rsvps[0].dietary_restrictions).toBe('Gluten free');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      email: 'alice@example.com',
      attending: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when attending is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(res.status).toBe(400);
  });
});
