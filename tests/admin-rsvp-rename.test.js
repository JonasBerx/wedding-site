const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

function seedParty(db, { email = 'ana@example.com', lead = 'Ana', second = 'Bram' } = {}) {
  const f = Number(db.insertMenuItem({ course: 'first', name: 'Tomato' }).lastInsertRowid);
  const m = Number(db.insertMenuItem({ course: 'main', name: 'Lamb' }).lastInsertRowid);
  const { id } = db.upsertRsvp({
    name: lead, email, attending: 1, event_type: 'full',
    attendees: [
      { name: lead, first_course_id: f, main_course_id: m },
      { name: second, first_course_id: f, main_course_id: m },
    ],
  });
  return id;
}

describe('PATCH /api/admin/rsvps/:id — rename the lead', () => {
  let app, db, id;
  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
    id = seedParty(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('401 without credentials, and nothing changes', async () => {
    const res = await request(app).patch(`/api/admin/rsvps/${id}`).send({ name: 'Hacked' });
    expect(res.status).toBe(401);
    expect(db.getAdminRsvpById(id).name).toBe('Ana');
  });

  test('renames the lead and attendee 1, returning the updated RSVP', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}`)
      .auth('admin', 'secret')
      .send({ name: 'Anna Peeters' });

    expect(res.status).toBe(200);
    expect(res.body.rsvp.name).toBe('Anna Peeters');
    expect(res.body.rsvp.attendees[0].name).toBe('Anna Peeters');
    expect(res.body.rsvp.attendees[1].name).toBe('Bram');
    expect(res.body.rsvp.attendees[0].first_course_name).toBe('Tomato');
  });

  test('stores the name trimmed', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}`)
      .auth('admin', 'secret')
      .send({ name: '  Anna Peeters  ' });
    expect(res.status).toBe(200);
    expect(res.body.rsvp.name).toBe('Anna Peeters');
  });

  test.each([
    ['missing', {}],
    ['empty', { name: '' }],
    ['whitespace only', { name: '   ' }],
    ['not a string', { name: 42 }],
    ['too long', { name: 'x'.repeat(121) }],
  ])('400 invalid_name when the name is %s', async (_label, body) => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}`)
      .auth('admin', 'secret')
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_name');
    expect(db.getAdminRsvpById(id).name).toBe('Ana');
  });

  test('accepts a name of exactly 120 characters', async () => {
    const name = 'x'.repeat(120);
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}`)
      .auth('admin', 'secret')
      .send({ name });
    expect(res.status).toBe(200);
    expect(res.body.rsvp.name).toBe(name);
  });

  test('400 invalid_id for a non-numeric id', async () => {
    const res = await request(app)
      .patch('/api/admin/rsvps/abc')
      .auth('admin', 'secret')
      .send({ name: 'Anna' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_id');
  });

  test('404 rsvp_not_found for an unknown id', async () => {
    const res = await request(app)
      .patch('/api/admin/rsvps/9999')
      .auth('admin', 'secret')
      .send({ name: 'Anna' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('rsvp_not_found');
  });
});

describe('PATCH /api/admin/rsvps/:id/attendees/:attendeeId', () => {
  let app, db, id, attendees;
  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
    id = seedParty(db);
    attendees = db.getAdminRsvpById(id).attendees;
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('401 without credentials, and nothing changes', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/${attendees[1].id}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(401);
    expect(db.getAdminRsvpById(id).attendees[1].name).toBe('Bram');
  });

  test('renaming a later attendee leaves the lead name alone', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/${attendees[1].id}`)
      .auth('admin', 'secret')
      .send({ name: 'Bram Peeters' });

    expect(res.status).toBe(200);
    expect(res.body.rsvp.attendees[1].name).toBe('Bram Peeters');
    expect(res.body.rsvp.name).toBe('Ana');
  });

  test('renaming attendee 1 also renames the lead', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/${attendees[0].id}`)
      .auth('admin', 'secret')
      .send({ name: 'Anna Peeters' });

    expect(res.status).toBe(200);
    expect(res.body.rsvp.name).toBe('Anna Peeters');
    expect(res.body.rsvp.attendees[0].name).toBe('Anna Peeters');
  });

  test('the attendee id is unchanged by a rename', async () => {
    await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/${attendees[1].id}`)
      .auth('admin', 'secret')
      .send({ name: 'Bram Peeters' });
    expect(db.getAdminRsvpById(id).attendees[1].id).toBe(attendees[1].id);
  });

  test('400 invalid_name for a blank name', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/${attendees[1].id}`)
      .auth('admin', 'secret')
      .send({ name: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_name');
  });

  test('400 invalid_id for a non-numeric attendee id', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/abc`)
      .auth('admin', 'secret')
      .send({ name: 'Bram Peeters' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_id');
  });

  test('404 rsvp_not_found when the party does not exist', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/9999/attendees/${attendees[1].id}`)
      .auth('admin', 'secret')
      .send({ name: 'Bram Peeters' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('rsvp_not_found');
  });

  test('404 attendee_not_found for an unknown attendee id', async () => {
    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/9999`)
      .auth('admin', 'secret')
      .send({ name: 'Bram Peeters' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('attendee_not_found');
  });

  test('404 when the attendee belongs to another party, changing nothing', async () => {
    const otherId = seedParty(db, { email: 'cara@example.com', lead: 'Cara', second: 'Dirk' });
    const otherAttendee = db.getAdminRsvpById(otherId).attendees[0].id;

    const res = await request(app)
      .patch(`/api/admin/rsvps/${id}/attendees/${otherAttendee}`)
      .auth('admin', 'secret')
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('attendee_not_found');
    expect(db.getAdminRsvpById(otherId).name).toBe('Cara');
    expect(db.getAdminRsvpById(otherId).attendees[0].name).toBe('Cara');
  });
});
