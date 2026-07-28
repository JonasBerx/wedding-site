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
