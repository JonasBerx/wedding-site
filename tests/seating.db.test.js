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
});
