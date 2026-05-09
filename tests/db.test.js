const { initDb } = require('../src/db');

describe('initDb', () => {
  let db;

  beforeEach(() => {
    db = initDb(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  test('insertRsvp stores a record and getAllRsvps returns it', () => {
    db.insertRsvp({
      name: 'Alice',
      email: 'alice@example.com',
      attending: 1,
      meal_preference: 'Fish',
      dietary_restrictions: null,
    });
    const rsvps = db.getAllRsvps();
    expect(rsvps).toHaveLength(1);
    expect(rsvps[0].name).toBe('Alice');
    expect(rsvps[0].email).toBe('alice@example.com');
    expect(rsvps[0].attending).toBe(1);
    expect(rsvps[0].meal_preference).toBe('Fish');
    expect(rsvps[0].dietary_restrictions).toBeNull();
  });

  test('getAllRsvps returns records most recent first', () => {
    db.insertRsvp({ name: 'Alice', email: 'a@example.com', attending: 1, meal_preference: null, dietary_restrictions: null });
    db.insertRsvp({ name: 'Bob', email: 'b@example.com', attending: 0, meal_preference: null, dietary_restrictions: null });
    const rsvps = db.getAllRsvps();
    expect(rsvps).toHaveLength(2);
    expect(rsvps[0].name).toBe('Bob');
  });

  test('getAllRsvps returns empty array when no records', () => {
    expect(db.getAllRsvps()).toEqual([]);
  });
});
