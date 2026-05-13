const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('GET /api/invite/:token', () => {
  let app, db;
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });
  afterEach(() => { db.close(); delete process.env.RSVP_DEADLINE; });

  test('returns metadata for an open token', async () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4, label: 'Smiths' });
    const res = await request(app).get(`/api/invite/${inv.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      deadline_passed: false,
      token: inv.token,
      status: 'open',
      event_type: 'full',
      max_party_size: 4,
      rsvp_email: null,
    });
  });

  test('returns rsvp_email for a consumed invite', async () => {
    const r = db.upsertRsvp({
      name: 'A', email: 'a@x.com', attending: 1, event_type: 'ceremony_party',
      attendees: [{ name: 'A' }],
    });
    const inv = db.createInviteToken({ event_type: 'ceremony_party', max_party_size: 2 });
    db.consumeInviteToken(inv.id, r.id);

    const res = await request(app).get(`/api/invite/${inv.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('consumed');
    expect(res.body.rsvp_email).toBe('a@x.com');
  });

  test('404 for unknown token', async () => {
    const res = await request(app).get('/api/invite/totally-fake');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('invite_not_found');
  });

  test('reports deadline_passed when RSVP_DEADLINE is in the past', async () => {
    process.env.RSVP_DEADLINE = '2000-01-01T00:00:00Z';
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const res = await request(app).get(`/api/invite/${inv.token}`);
    expect(res.body.deadline_passed).toBe(true);
  });
});

describe('admin invite endpoints — create + list', () => {
  let app, db;
  const AUTH = ['admin', 'secret'];
  beforeEach(() => {
    process.env.ADMIN_USER = AUTH[0];
    process.env.ADMIN_PASSWORD = AUTH[1];
    db = initDb(':memory:'); app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.PUBLIC_SITE_ORIGIN;
  });

  test('POST /api/admin/invites requires auth', async () => {
    const res = await request(app).post('/api/admin/invites').send({
      event_type: 'full', max_party_size: 2,
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/admin/invites creates an open invite and returns a URL', async () => {
    const res = await request(app).post('/api/admin/invites').auth(...AUTH).send({
      event_type: 'full', max_party_size: 4, label: 'Smiths',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      id: expect.any(Number),
      token: expect.any(String),
      url: expect.stringMatching(/\/rsvp\?invite=/),
      event_type: 'full',
      max_party_size: 4,
      label: 'Smiths',
      status: 'open',
    }));
  });

  test('POST honors PUBLIC_SITE_ORIGIN when set', async () => {
    process.env.PUBLIC_SITE_ORIGIN = 'https://wedding.example.com/';
    const res = await request(app).post('/api/admin/invites').auth(...AUTH).send({
      event_type: 'ceremony_party', max_party_size: 2,
    });
    expect(res.body.url.startsWith('https://wedding.example.com/rsvp?invite=')).toBe(true);
  });

  test('POST rejects bad bodies', async () => {
    const bad = [
      { event_type: 'wrong', max_party_size: 2 },
      { event_type: 'full', max_party_size: 0 },
      { event_type: 'full', max_party_size: 7 },
      { max_party_size: 2 },
      { event_type: 'full' },
      { event_type: 'full', max_party_size: 2, label: 'x'.repeat(121) },
    ];
    for (const b of bad) {
      const res = await request(app).post('/api/admin/invites').auth(...AUTH).send(b);
      expect(res.status).toBe(400);
    }
  });

  test('GET /api/admin/invites requires auth', async () => {
    const res = await request(app).get('/api/admin/invites');
    expect(res.status).toBe(401);
  });

  test('GET /api/admin/invites lists invites with linked rsvp data', async () => {
    db.createInviteToken({ event_type: 'full', max_party_size: 2, label: 'L1' });
    const inv = db.createInviteToken({ event_type: 'ceremony_party', max_party_size: 4 });
    const r = db.upsertRsvp({
      name: 'A', email: 'a@x.com', attending: 1, event_type: 'ceremony_party',
      attendees: [{ name: 'A' }, { name: 'B' }],
    });
    db.consumeInviteToken(inv.id, r.id);

    const res = await request(app).get('/api/admin/invites').auth(...AUTH);
    expect(res.status).toBe(200);
    expect(res.body.invites.length).toBe(2);
    const consumed = res.body.invites.find(x => x.id === inv.id);
    expect(consumed.rsvp_email).toBe('a@x.com');
    expect(consumed.rsvp_party_size).toBe(2);
    expect(consumed).toHaveProperty('url');
  });
});
