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

  test('stores attending as 1 for true, 0 for false', async () => {
    await request(app).post('/api/rsvp').send({ name: 'A', email: 'a@b.com', attending: true });
    await request(app).post('/api/rsvp').send({ name: 'B', email: 'b@b.com', attending: false });
    const [b, a] = db.getAllRsvps();
    expect(a.attending).toBe(1);
    expect(b.attending).toBe(0);
  });

  test('trims whitespace from name and email', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: '  Alice  ',
      email: '  alice@example.com  ',
      attending: true,
    });
    expect(res.status).toBe(201);
    const [rsvp] = db.getAllRsvps();
    expect(rsvp.name).toBe('Alice');
    expect(rsvp.email).toBe('alice@example.com');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      email: 'alice@example.com',
      attending: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when name is whitespace only', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: '   ',
      email: 'alice@example.com',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when email is not a valid address', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'not-an-email',
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

  test('returns 400 when attending is not a boolean', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: 'yes',
    });
    expect(res.status).toBe(400);
  });
});
