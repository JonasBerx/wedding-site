const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

const AUTH = ['admin', 'secret'];

describe('/api/admin/seating — tables', () => {
  let app, db;

  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('requires auth', async () => {
    expect((await request(app).get('/api/admin/seating')).status).toBe(401);
  });

  test('creates a table', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: 'Olijf' });
    expect(res.status).toBe(201);
    expect(res.body.table_number).toBe(1);
    expect(res.body.name).toBe('Olijf');
  });

  test('stores an empty name as null', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: '   ' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBeNull();
  });

  test('rejects a non-positive table_number', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_number');
  });

  test('rejects a name over 60 chars', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: 'x'.repeat(61) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_name');
  });

  test('rejects a duplicate table_number with 409', async () => {
    await request(app).post('/api/admin/seating/tables').auth(...AUTH).send({ table_number: 1 });
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('table_number_taken');
  });

  test('renames and renumbers', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ table_number: 4, name: 'Munt' });
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(4);
    expect(res.body.name).toBe('Munt');
  });

  test('patching only the number keeps the existing name', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ table_number: 4 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Olijf');
  });

  test('patching a missing table is 404', async () => {
    const res = await request(app).patch('/api/admin/seating/tables/999')
      .auth(...AUTH).send({ table_number: 4 });
    expect(res.status).toBe(404);
  });

  test('deletes a table and its assignments', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    const res = await request(app).delete(`/api/admin/seating/tables/${t.id}`).auth(...AUTH);
    expect(res.status).toBe(204);
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  test('publish toggle round-trips', async () => {
    const res = await request(app).put('/api/admin/seating/published')
      .auth(...AUTH).send({ published: true });
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(true);
    expect(db.isSeatingPublished()).toBe(true);

    const off = await request(app).put('/api/admin/seating/published')
      .auth(...AUTH).send({ published: false });
    expect(off.body.published).toBe(false);
  });

  test('rejects a non-boolean published value', async () => {
    const res = await request(app).put('/api/admin/seating/published')
      .auth(...AUTH).send({ published: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_published');
  });

  test('every route requires auth', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const responses = await Promise.all([
      request(app).get('/api/admin/seating'),
      request(app).post('/api/admin/seating/tables').send({ table_number: 2 }),
      request(app).patch(`/api/admin/seating/tables/${t.id}`).send({ table_number: 2 }),
      request(app).delete(`/api/admin/seating/tables/${t.id}`),
      request(app).put('/api/admin/seating/published').send({ published: true }),
    ]);
    expect(responses.map(r => r.status)).toEqual([401, 401, 401, 401, 401]);
    // and nothing was mutated
    expect(db.getSeatingTableById(t.id)).not.toBeNull();
    expect(db.isSeatingPublished()).toBe(false);
  });

  test('renumbering onto a taken number is 409', async () => {
    db.createSeatingTable({ table_number: 1 });
    const b = db.createSeatingTable({ table_number: 2, name: 'Munt' });
    const res = await request(app).patch(`/api/admin/seating/tables/${b.id}`)
      .auth(...AUTH).send({ table_number: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('table_number_taken');
    // unchanged
    expect(db.getSeatingTableById(b.id).table_number).toBe(2);
  });

  test('a non-unique database error surfaces as a 500 JSON response', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const boom = Object.assign(new Error('disk I/O error'), { errcode: 10 });
    db.createSeatingTable = () => { throw boom; };

    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    spy.mockRestore();
  });

  test('accepts an explicit null name', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: null });
    expect(res.status).toBe(201);
    expect(res.body.name).toBeNull();
  });

  test('rejects a non-string name', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_name');
  });

  test('accepts a 60-char name', async () => {
    const name = 'x'.repeat(60);
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });

  test('patching with an empty body is a no-op', async () => {
    const t = db.createSeatingTable({ table_number: 3, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({});
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(3);
    expect(res.body.name).toBe('Olijf');
  });

  test('patching with no body at all is a no-op', async () => {
    const t = db.createSeatingTable({ table_number: 3, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`).auth(...AUTH);
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(3);
    expect(res.body.name).toBe('Olijf');
  });

  test('patching name to null clears it', async () => {
    const t = db.createSeatingTable({ table_number: 3, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ name: null });
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(3);
    expect(res.body.name).toBeNull();
  });

  // node:sqlite throws RangeError reading back an unsafe integer, which would
  // 500 every later read of the row — including the SELECT * behind PATCH and
  // DELETE, leaving the row unremovable through the API.
  test('rejects an out-of-range table_number', async () => {
    for (const table_number of [1e17, Number.MAX_SAFE_INTEGER + 1, 1000, 1.5, '1', 0, -1]) {
      const res = await request(app).post('/api/admin/seating/tables')
        .auth(...AUTH).send({ table_number });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_table_number');
    }
    expect(db.getSeatingTables()).toHaveLength(0);
  });

  test('accepts table_number 999 but not 1000', async () => {
    const ok = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 999 });
    expect(ok.status).toBe(201);
    const over = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1000 });
    expect(over.status).toBe(400);
  });

  test('a huge table_number cannot be stored, so reads stay healthy', async () => {
    const created = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1e17 });
    expect(created.status).toBe(400);
    const list = await request(app).get('/api/admin/seating').auth(...AUTH);
    expect(list.status).toBe(200);
    expect(list.body.tables).toHaveLength(0);
  });

  test('patching to a huge table_number leaves the table readable and deletable', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ table_number: 1e17 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_number');

    const list = await request(app).get('/api/admin/seating').auth(...AUTH);
    expect(list.status).toBe(200);
    expect(list.body.tables[0].table_number).toBe(1);
    const del = await request(app).delete(`/api/admin/seating/tables/${t.id}`).auth(...AUTH);
    expect(del.status).toBe(204);
  });

  // parseInt('1abc') === 1 would delete a different, real table.
  test('a malformed table id is rejected, never coerced onto another row', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    for (const id of ['1abc', 'abc', '1.5', '-1', '1e2', '%20', '+1', '01abc']) {
      const del = await request(app).delete(`/api/admin/seating/tables/${id}`).auth(...AUTH);
      expect([del.status, del.body.error]).toEqual([400, 'invalid_id']);
      const patch = await request(app).patch(`/api/admin/seating/tables/${id}`)
        .auth(...AUTH).send({ table_number: 7 });
      expect([patch.status, patch.body.error]).toEqual([400, 'invalid_id']);
    }
    expect(db.getSeatingTableById(t.id)).toMatchObject({ table_number: 1, name: 'Olijf' });
  });

  test('GET returns published state, tables with assignments and unseated guests', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    const res = await request(app).get('/api/admin/seating').auth(...AUTH);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(false);
    expect(res.body.tables).toHaveLength(1);
    expect(res.body.tables[0].assignments).toHaveLength(1);
    expect(Array.isArray(res.body.unseated)).toBe(true);
  });
});

describe('/api/admin/seating — assignments', () => {
  let app, db, f, m;

  const seatParty = (email, names, event_type = 'full') => {
    db.upsertRsvp({
      name: names[0], email, attending: 1, event_type,
      attendees: names.map(n => ({
        name: n,
        first_course_id: event_type === 'full' ? f.lastInsertRowid : null,
        main_course_id:  event_type === 'full' ? m.lastInsertRowid : null,
      })),
    });
    const rsvp = db.getRsvpByEmail(email);
    return db._rawAll('SELECT id FROM rsvp_attendees WHERE rsvp_id = ? ORDER BY position', rsvp.id);
  };

  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
    f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('seats a linked attendee', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const [alice] = seatParty('a@x.com', ['Alice']);
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, rsvp_attendee_id: alice.id });
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
  });

  test('seats a manual guest', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, guest_name: '  Oma Julia  ' });
    expect(res.status).toBe(201);
    const chart = db.getSeatingTablesWithAssignments();
    expect(chart[0].assignments[0].display_name).toBe('Oma Julia');
  });

  test('rejects when neither target is given', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_assignment_target');
  });

  test('rejects when both targets are given', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const [alice] = seatParty('a@x.com', ['Alice']);
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, rsvp_attendee_id: alice.id, guest_name: 'Oma' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_assignment_target');
  });

  test('rejects an empty or overlong guest_name', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const empty = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, guest_name: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toBe('invalid_guest_name');

    const long = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, guest_name: 'x'.repeat(121) });
    expect(long.body.error).toBe('invalid_guest_name');
  });

  test('404 for an unknown table or attendee', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const noTable = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: 999, guest_name: 'Oma' });
    expect(noTable.status).toBe(404);

    const noAttendee = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, rsvp_attendee_id: 999 });
    expect(noAttendee.status).toBe(404);
  });

  test('409 when the attendee is already seated', async () => {
    const t1 = db.createSeatingTable({ table_number: 1 });
    const t2 = db.createSeatingTable({ table_number: 2 });
    const [alice] = seatParty('a@x.com', ['Alice']);
    await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t1.id, rsvp_attendee_id: alice.id });
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t2.id, rsvp_attendee_id: alice.id });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('already_seated');
  });

  test('unseats a guest', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const a = db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    const res = await request(app).delete(`/api/admin/seating/assignments/${a.id}`).auth(...AUTH);
    expect(res.status).toBe(204);
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  test('GET / returns tables, unseated and published together', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const [alice, bob] = seatParty('a@x.com', ['Alice', 'Bob']);
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: alice.id });

    const res = await request(app).get('/api/admin/seating').auth(...AUTH);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(false);
    expect(res.body.tables[0].assignments[0].display_name).toBe('Alice');
    expect(res.body.unseated).toEqual([
      { rsvp_attendee_id: bob.id, name: 'Bob', party_name: 'Alice' },
    ]);
  });

  test('both assignment routes require auth and mutate nothing', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const a = db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    const responses = await Promise.all([
      request(app).post('/api/admin/seating/assignments').send({ table_id: t.id, guest_name: 'Opa' }),
      request(app).delete(`/api/admin/seating/assignments/${a.id}`),
    ]);
    expect(responses.map(r => r.status)).toEqual([401, 401]);
    expect(db._rawAll('SELECT id FROM seating_assignments').map(r => r.id)).toEqual([a.id]);
  });

  test('rejects an invalid table_id without touching the database', async () => {
    for (const table_id of [undefined, null, 0, -1, '1', 1.5, [1], { id: 1 }]) {
      const res = await request(app).post('/api/admin/seating/assignments')
        .auth(...AUTH).send({ table_id, guest_name: 'Oma' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_table_id');
    }
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  // The CHECK constraint must be unreachable from HTTP: every odd payload has to
  // come back as a clean 4xx, never a 500.
  test('odd target payloads are rejected with a 4xx, never a 500', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const bodies = [
      { guest_name: 123 },
      { guest_name: ['Oma'] },
      { guest_name: { name: 'Oma' } },
      { guest_name: true },
      { rsvp_attendee_id: '5' },
      { rsvp_attendee_id: 1.5 },
      { rsvp_attendee_id: [1] },
      { rsvp_attendee_id: { id: 1 } },
      { rsvp_attendee_id: true },
      { rsvp_attendee_id: 0 },
      { rsvp_attendee_id: -1 },
    ];
    for (const body of bodies) {
      const res = await request(app).post('/api/admin/seating/assignments')
        .auth(...AUTH).send({ table_id: t.id, ...body });
      expect([400, 404]).toContain(res.status);
    }
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  test('accepts a 120-char guest_name', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const guest_name = 'x'.repeat(120);
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, guest_name });
    expect(res.status).toBe(201);
    expect(db.getSeatingTablesWithAssignments()[0].assignments[0].display_name).toBe(guest_name);
  });

  test('deleting a missing or non-numeric assignment id', async () => {
    const missing = await request(app).delete('/api/admin/seating/assignments/999').auth(...AUTH);
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('assignment_not_found');

    const bad = await request(app).delete('/api/admin/seating/assignments/abc').auth(...AUTH);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('invalid_id');
  });

  // The unseated list only ever offers attending full-day guests; the write
  // side must agree, or a ceremony-only guest ends up on the public chart.
  test('refuses to seat a non-dinner or non-attending attendee', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const [cy] = seatParty('ceremony@x.com', ['Cy'], 'ceremony');
    const [eve] = seatParty('evening@x.com', ['Eve'], 'evening');

    for (const attendee of [cy, eve]) {
      const res = await request(app).post('/api/admin/seating/assignments')
        .auth(...AUTH).send({ table_id: t.id, rsvp_attendee_id: attendee.id });
      expect([res.status, res.body.error]).toEqual([404, 'attendee_not_found']);
    }
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
    expect(db.getSeatingTablesWithAssignments()[0].assignments).toHaveLength(0);
  });

  test('a malformed assignment id is rejected, never coerced onto another row', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const a = db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    for (const id of ['1abc', 'abc', '1.5', '-1', '1e2', '%20', '+1']) {
      const res = await request(app).delete(`/api/admin/seating/assignments/${id}`).auth(...AUTH);
      expect([res.status, res.body.error]).toEqual([400, 'invalid_id']);
    }
    expect(db._rawAll('SELECT id FROM seating_assignments').map(r => r.id)).toEqual([a.id]);
  });

  // A name made only of invisible characters survives trim() and would render
  // as a blank chair on the public chart.
  test('rejects a guest_name made only of invisible characters', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    for (const guest_name of ['\u0007', '\uD800', '\u200B', '\uFEFF', '\u0000', '\u200E ']) {
      const res = await request(app).post('/api/admin/seating/assignments')
        .auth(...AUTH).send({ table_id: t.id, guest_name });
      expect([res.status, res.body.error]).toEqual([400, 'invalid_guest_name']);
    }
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  test('strips invisible characters from an otherwise real guest_name', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, guest_name: ' Oma\u200B Julia\uFEFF ' });
    expect(res.status).toBe(201);
    expect(db.getSeatingTablesWithAssignments()[0].assignments[0].display_name).toBe('Oma Julia');
  });

  test('a non-unique database error on assignment insert surfaces as a 500', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const t = db.createSeatingTable({ table_number: 1 });
    db.createSeatingAssignment = () => {
      throw Object.assign(new Error('disk I/O error'), { errcode: 10 });
    };
    const res = await request(app).post('/api/admin/seating/assignments')
      .auth(...AUTH).send({ table_id: t.id, guest_name: 'Oma' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    spy.mockRestore();
  });
});
