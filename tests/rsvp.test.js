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

  // ── existing field validation ──────────────────────────────

  test('returns 201 with all valid fields (full day, meat)', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'full',
      is_vegan: false,
      meal_preference: 2,
      dietary_restrictions: 'Nut allergy',
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('RSVP received');
  });

  test('returns 201 without optional fields (not attending)', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Bob',
      email: 'bob@example.com',
      attending: false,
    });
    expect(res.status).toBe(201);
  });

  test('stores new fields in database', async () => {
    await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'full',
      is_vegan: false,
      meal_preference: 1,
      dietary_restrictions: 'Gluten free',
    });
    const rsvps = db.getAllRsvps();
    expect(rsvps[0].event_type).toBe('full');
    expect(rsvps[0].is_vegan).toBe(0);
    expect(rsvps[0].meal_preference).toBe(1);
    expect(rsvps[0].dietary_restrictions).toBe('Gluten free');
  });

  test('stores attending as 1 for true, 0 for false', async () => {
    await request(app).post('/api/rsvp').send({ name: 'A', email: 'a@b.com', attending: true, event_type: 'ceremony_party' });
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
      event_type: 'ceremony_party',
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

  // ── event_type validation ──────────────────────────────────

  test('returns 400 when attending=true and event_type is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when attending=true and event_type is invalid', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'dinner_only',
    });
    expect(res.status).toBe(400);
  });

  test('returns 201 for ceremony_party guest (no meal required)', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'ceremony_party',
    });
    expect(res.status).toBe(201);
    const [rsvp] = db.getAllRsvps();
    expect(rsvp.event_type).toBe('ceremony_party');
    expect(rsvp.meal_preference).toBeNull();
    expect(rsvp.is_vegan).toBeNull();
  });

  test('returns 201 for full-day vegan guest (no meal_preference needed)', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'full',
      is_vegan: true,
    });
    expect(res.status).toBe(201);
    const [rsvp] = db.getAllRsvps();
    expect(rsvp.is_vegan).toBe(1);
    expect(rsvp.meal_preference).toBeNull();
  });

  test('returns 400 when full-day non-vegan guest omits meal_preference', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'full',
      is_vegan: false,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when full-day non-vegan guest sends invalid meal_preference', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: true,
      event_type: 'full',
      is_vegan: false,
      meal_preference: 3,
    });
    expect(res.status).toBe(400);
  });

  test('stores null event_type and meal fields when not attending', async () => {
    await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: false,
      event_type: 'full',
      meal_preference: 1,
    });
    const [rsvp] = db.getAllRsvps();
    expect(rsvp.event_type).toBeNull();
    expect(rsvp.is_vegan).toBeNull();
    expect(rsvp.meal_preference).toBeNull();
  });
});
