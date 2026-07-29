const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('GET /api/seating', () => {
  let app, db, f, m;

  const seatParty = (email, names) => {
    db.upsertRsvp({
      name: names[0], email, attending: 1, event_type: 'full',
      attendees: names.map(n => ({
        name: n, first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid,
      })),
    });
    const rsvp = db.getRsvpByEmail(email);
    return db._rawAll('SELECT id FROM rsvp_attendees WHERE rsvp_id = ? ORDER BY position', rsvp.id);
  };

  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
    f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
  });
  afterEach(() => { db.close(); });

  test('unpublished returns no tables and no names', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const [alice] = seatParty('a@x.com', ['Alice']);
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: alice.id });

    const res = await request(app).get('/api/seating');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ published: false, tables: [] });
    expect(JSON.stringify(res.body)).not.toContain('Alice');
  });

  test('published returns tables ordered by number with alphabetical names', async () => {
    const t2 = db.createSeatingTable({ table_number: 2, name: null });
    const t1 = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const [zoe, adam] = seatParty('a@x.com', ['Zoe', 'Adam']);
    db.createSeatingAssignment({ table_id: t1.id, rsvp_attendee_id: zoe.id });
    db.createSeatingAssignment({ table_id: t1.id, rsvp_attendee_id: adam.id });
    db.createSeatingAssignment({ table_id: t2.id, guest_name: 'Oma Julia' });
    db.setSetting('seating_published', '1');

    const res = await request(app).get('/api/seating');
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(true);
    expect(res.body.tables).toEqual([
      { table_number: 1, name: 'Olijf', guests: ['Adam', 'Zoe'] },
      { table_number: 2, name: null,    guests: ['Oma Julia'] },
    ]);
  });

  test('published response leaks no ids or emails', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const [alice] = seatParty('secret@x.com', ['Alice']);
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: alice.id });
    db.setSetting('seating_published', '1');

    const res = await request(app).get('/api/seating');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('secret@x.com');
    expect(body).not.toContain('rsvp_attendee_id');
    expect(body).not.toContain('"id"');
  });
});
