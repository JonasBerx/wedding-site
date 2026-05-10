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

  // ── course-id validation ───────────────────────────────────

  test('returns 201 with first/main course ids for full-day guests', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'full',
      first_course_id: f.lastInsertRowid,
      main_course_id:  m.lastInsertRowid,
    });
    expect(res.status).toBe(201);
  });

  test('full-day rejects when first_course_id missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full',
      main_course_id: 1,
    });
    expect(res.status).toBe(400);
  });

  test('full-day rejects when course id refers to wrong course', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full',
      first_course_id: m.lastInsertRowid, // wrong course
      main_course_id:  f.lastInsertRowid, // wrong course
    });
    expect(res.status).toBe(400);
  });

  test('full-day rejects when course id does not exist', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full',
      first_course_id: 999, main_course_id: 1000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/menu_item_not_found/);
  });

  test('ceremony_party stores null for both course ids', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'B', email: 'b@x.com', attending: true, event_type: 'ceremony_party',
      first_course_id: 1, main_course_id: 1, // should be ignored
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('b@x.com');
    expect(stored.first_course_id).toBeNull();
    expect(stored.main_course_id).toBeNull();
  });

  test('not attending stores null for both course ids', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'C', email: 'c@x.com', attending: false,
      first_course_id: 1, main_course_id: 1,
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('c@x.com');
    expect(stored.first_course_id).toBeNull();
    expect(stored.main_course_id).toBeNull();
  });

  // ── general field validation ───────────────────────────────

  test('returns 201 without optional fields (not attending)', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Bob',
      email: 'bob@example.com',
      attending: false,
    });
    expect(res.status).toBe(201);
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
});

describe('GET /api/rsvp', () => {
  let app, db;
  beforeEach(() => {
    delete process.env.RSVP_DEADLINE;
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.RSVP_DEADLINE;
  });

  test('without email returns deadline_passed:false and rsvp:null', async () => {
    const res = await request(app).get('/api/rsvp');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deadline_passed: false, rsvp: null });
  });

  test('with empty email behaves like no email', async () => {
    const res = await request(app).get('/api/rsvp?email=');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deadline_passed: false, rsvp: null });
  });

  test('with malformed email returns 400', async () => {
    const res = await request(app).get('/api/rsvp?email=not-an-email');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid email');
  });

  test('with unknown email returns rsvp:null', async () => {
    const res = await request(app).get('/api/rsvp?email=ghost@example.com');
    expect(res.status).toBe(200);
    expect(res.body.rsvp).toBeNull();
  });

  test('with known email returns the public shape', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'full',
      first_course_id: f.lastInsertRowid,
      main_course_id:  m.lastInsertRowid,
      dietary_restrictions: 'gluten free',
    });
    const res = await request(app).get('/api/rsvp?email=alice@example.com');
    expect(res.status).toBe(200);
    expect(res.body.deadline_passed).toBe(false);
    expect(res.body.rsvp).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      attending: 1,
      event_type: 'full',
      first_course_id: f.lastInsertRowid,
      main_course_id:  m.lastInsertRowid,
      dietary_restrictions: 'gluten free',
    });
  });

  test('reports deadline_passed:true when RSVP_DEADLINE is in the past', async () => {
    process.env.RSVP_DEADLINE = '2000-01-01T00:00:00Z';
    const res = await request(app).get('/api/rsvp');
    expect(res.body.deadline_passed).toBe(true);
  });

  test('reports deadline_passed:false when RSVP_DEADLINE is in the future', async () => {
    process.env.RSVP_DEADLINE = '2099-01-01T00:00:00Z';
    const res = await request(app).get('/api/rsvp');
    expect(res.body.deadline_passed).toBe(false);
  });

  test('ignores malformed RSVP_DEADLINE (treats as not set)', async () => {
    process.env.RSVP_DEADLINE = 'not-a-date';
    const res = await request(app).get('/api/rsvp');
    expect(res.body.deadline_passed).toBe(false);
  });

  test('lookup is case-insensitive', async () => {
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'ceremony_party',
    });
    const res = await request(app).get('/api/rsvp?email=ALICE@example.com');
    expect(res.body.rsvp).not.toBeNull();
    expect(res.body.rsvp.email).toBe('alice@example.com');
  });
});
