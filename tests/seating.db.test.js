const { initDb } = require('../src/db');

describe('seating schema', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('creates the three seating tables', () => {
    const names = db._rawAll(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).map(r => r.name);
    expect(names).toEqual(expect.arrayContaining([
      'seating_tables', 'seating_assignments', 'app_settings',
    ]));
  });

  test('rejects an assignment with neither attendee nor guest_name', () => {
    db._rawRun("INSERT INTO seating_tables (table_number) VALUES (1)");
    expect(() => db._rawRun(
      'INSERT INTO seating_assignments (table_id, rsvp_attendee_id, guest_name) VALUES (1, NULL, NULL)'
    )).toThrow();
  });

  test('rejects an assignment with both attendee and guest_name', () => {
    db._rawRun("INSERT INTO seating_tables (table_number) VALUES (1)");
    expect(() => db._rawRun(
      "INSERT INTO seating_assignments (table_id, rsvp_attendee_id, guest_name) VALUES (1, 1, 'Oma')"
    )).toThrow();
  });

  test('rejects a duplicate table_number', () => {
    db._rawRun("INSERT INTO seating_tables (table_number) VALUES (1)");
    expect(() => db._rawRun("INSERT INTO seating_tables (table_number) VALUES (1)")).toThrow();
  });

  test('accepts an attendee-only and a guest_name-only assignment', () => {
    db._rawRun("INSERT INTO seating_tables (table_number) VALUES (1)");
    db._rawRun("INSERT INTO rsvps (name, email, attending) VALUES ('A','a@x.com',1)");
    db._rawRun("INSERT INTO rsvp_attendees (rsvp_id, name, position) VALUES (1,'Ann',1)");
    expect(() => db._rawRun(
      'INSERT INTO seating_assignments (table_id, rsvp_attendee_id) VALUES (1, 1)')).not.toThrow();
    expect(() => db._rawRun(
      "INSERT INTO seating_assignments (table_id, guest_name) VALUES (1, 'Oma')")).not.toThrow();
  });

  test('the same attendee cannot be seated twice, but manual guests can repeat', () => {
    db._rawRun("INSERT INTO seating_tables (table_number) VALUES (1)");
    db._rawRun("INSERT INTO seating_tables (table_number) VALUES (2)");
    db._rawRun("INSERT INTO rsvps (name, email, attending) VALUES ('A','a@x.com',1)");
    db._rawRun("INSERT INTO rsvp_attendees (rsvp_id, name, position) VALUES (1,'Ann',1)");

    db._rawRun('INSERT INTO seating_assignments (table_id, rsvp_attendee_id) VALUES (1, 1)');
    expect(() => db._rawRun(
      'INSERT INTO seating_assignments (table_id, rsvp_attendee_id) VALUES (1, 1)')).toThrow();
    expect(() => db._rawRun(
      'INSERT INTO seating_assignments (table_id, rsvp_attendee_id) VALUES (2, 1)')).toThrow();

    expect(() => db._rawRun(
      "INSERT INTO seating_assignments (table_id, guest_name) VALUES (1, 'Oma')")).not.toThrow();
    expect(() => db._rawRun(
      "INSERT INTO seating_assignments (table_id, guest_name) VALUES (2, 'Oma')")).not.toThrow();
  });
});

describe('seating table methods', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('creates and lists tables ordered by number', () => {
    db.createSeatingTable({ table_number: 3, name: 'Salie' });
    db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    db.createSeatingTable({ table_number: 2, name: null });

    const rows = db.getSeatingTables();
    expect(rows.map(r => r.table_number)).toEqual([1, 2, 3]);
    expect(rows[0].name).toBe('Olijf');
    expect(rows[1].name).toBeNull();
  });

  test('getSeatingTableById returns null for a missing id', () => {
    expect(db.getSeatingTableById(999)).toBeNull();
  });

  test('updates number and name', () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    db.updateSeatingTable(t.id, { table_number: 9, name: 'Munt' });
    const row = db.getSeatingTableById(t.id);
    expect(row.table_number).toBe(9);
    expect(row.name).toBe('Munt');
  });

  test('deletes a table', () => {
    const t = db.createSeatingTable({ table_number: 1, name: null });
    expect(db.deleteSeatingTable(t.id).changes).toBe(1);
    expect(db.getSeatingTableById(t.id)).toBeNull();
  });
});

describe('seating assignment methods', () => {
  let db, f, m;

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
    return db._rawAll('SELECT id, name FROM rsvp_attendees WHERE rsvp_id = ? ORDER BY position', rsvp.id);
  };

  beforeEach(() => {
    db = initDb(':memory:');
    f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
  });
  afterEach(() => { db.close(); });

  test('seats a linked attendee and a manual guest, sorted alphabetically', () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const [alice] = seatParty('a@x.com', ['Zoe']);
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: alice.id });
    db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });

    const tables = db.getSeatingTablesWithAssignments();
    expect(tables).toHaveLength(1);
    expect(tables[0].assignments.map(a => a.display_name)).toEqual(['Oma Julia', 'Zoe']);
    expect(tables[0].assignments[1].rsvp_attendee_id).toBe(alice.id);
    expect(tables[0].assignments[0].rsvp_attendee_id).toBeNull();
  });

  test('refuses to seat the same attendee twice', () => {
    const t1 = db.createSeatingTable({ table_number: 1 });
    const t2 = db.createSeatingTable({ table_number: 2 });
    const [alice] = seatParty('a@x.com', ['Alice']);
    db.createSeatingAssignment({ table_id: t1.id, rsvp_attendee_id: alice.id });
    expect(() => db.createSeatingAssignment({ table_id: t2.id, rsvp_attendee_id: alice.id })).toThrow(/UNIQUE/);
  });

  test('deleting a table removes its assignments', () => {
    const t = db.createSeatingTable({ table_number: 1 });
    db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    db.deleteSeatingTable(t.id);
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  test('unseated lists only attending full-day attendees', () => {
    seatParty('full@x.com',     ['Alice', 'Bob']);
    seatParty('evening@x.com',  ['Eve'],   'evening');
    seatParty('ceremony@x.com', ['Cy'],    'ceremony');
    db.upsertRsvp({ name: 'No', email: 'no@x.com', attending: 0, attendees: [] });

    const unseated = db.getUnseatedAttendees();
    expect(unseated.map(u => u.name).sort()).toEqual(['Alice', 'Bob']);
    expect(unseated[0].party_name).toBe('Alice');
  });

  test('a seated attendee drops out of the unseated list', () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const [alice, bob] = seatParty('a@x.com', ['Alice', 'Bob']);
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: alice.id });

    const unseated = db.getUnseatedAttendees();
    expect(unseated.map(u => u.rsvp_attendee_id)).toEqual([bob.id]);
  });

  test('deleting an assignment returns the guest to unseated', () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const [alice] = seatParty('a@x.com', ['Alice']);
    const a = db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: alice.id });
    expect(db.deleteSeatingAssignment(a.id).changes).toBe(1);
    expect(db.getUnseatedAttendees()).toHaveLength(1);
  });
});

describe('app settings and seat durability', () => {
  let db, f, m;
  beforeEach(() => {
    db = initDb(':memory:');
    f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
  });
  afterEach(() => { db.close(); });

  test('seating is unpublished when the key is absent', () => {
    expect(db.getSetting('seating_published')).toBeNull();
    expect(db.isSeatingPublished()).toBe(false);
  });

  test('setSetting writes and overwrites', () => {
    db.setSetting('seating_published', '1');
    expect(db.isSeatingPublished()).toBe(true);
    db.setSetting('seating_published', '0');
    expect(db.isSeatingPublished()).toBe(false);
  });

  // The reason Task 1 exists. If this breaks, guests lose their seats silently.
  test('a seat survives the guest editing their RSVP', () => {
    const payload = (names) => ({
      name: names[0], email: 'a@x.com', attending: 1, event_type: 'full',
      attendees: names.map(n => ({
        name: n,
        first_course_id: f.lastInsertRowid,
        main_course_id: m.lastInsertRowid,
      })),
    });
    db.upsertRsvp(payload(['Alice', 'Bob']));
    const rsvp = db.getRsvpByEmail('a@x.com');
    const rows = db._rawAll('SELECT id FROM rsvp_attendees WHERE rsvp_id = ? ORDER BY position', rsvp.id);

    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: rows[0].id });
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: rows[1].id });

    // Guest edits their RSVP — corrects a name.
    db.upsertRsvp(payload(['Alice', 'Bobby']));

    const tables = db.getSeatingTablesWithAssignments();
    expect(tables[0].assignments.map(a => a.display_name)).toEqual(['Alice', 'Bobby']);
    expect(db.getUnseatedAttendees()).toHaveLength(0);
  });

  test('a shrinking party frees the seat it no longer needs', () => {
    const payload = (names) => ({
      name: names[0], email: 'a@x.com', attending: 1, event_type: 'full',
      attendees: names.map(n => ({
        name: n,
        first_course_id: f.lastInsertRowid,
        main_course_id: m.lastInsertRowid,
      })),
    });
    db.upsertRsvp(payload(['Alice', 'Bob']));
    const rsvp = db.getRsvpByEmail('a@x.com');
    const rows = db._rawAll('SELECT id FROM rsvp_attendees WHERE rsvp_id = ? ORDER BY position', rsvp.id);
    const t = db.createSeatingTable({ table_number: 1 });
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: rows[0].id });
    db.createSeatingAssignment({ table_id: t.id, rsvp_attendee_id: rows[1].id });

    db.upsertRsvp(payload(['Alice']));

    const tables = db.getSeatingTablesWithAssignments();
    expect(tables[0].assignments.map(a => a.display_name)).toEqual(['Alice']);
  });
});
