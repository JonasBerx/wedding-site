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
