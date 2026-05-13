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
