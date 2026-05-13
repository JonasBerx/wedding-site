const { initDb } = require('../src/db');

describe('initDb', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(()  => { db.close(); });

  test('rsvps table has new course-id columns and no old vegan/meal columns', () => {
    const res = db.insertRsvp({
      name: 'A', email: 'a@x.com', attending: 1,
      event_type: 'full', first_course_id: null, main_course_id: null,
      dietary_restrictions: null,
    });
    expect(res.changes).toBe(1);
    const all = db.getAllRsvps();
    expect(all[0]).toEqual(expect.objectContaining({
      first_course_id: null,
      main_course_id: null,
    }));
    expect(all[0]).not.toHaveProperty('is_vegan');
    expect(all[0]).not.toHaveProperty('meal_preference');
  });

  test('menu_items table accepts inserts and orders by sort_order within course', () => {
    const a = db.insertMenuItem({ course: 'first', name: 'Tomato', note: 'basil', is_vegan: 0 });
    const b = db.insertMenuItem({ course: 'first', name: 'Beet',   note: 'goat',  is_vegan: 0 });
    const c = db.insertMenuItem({ course: 'main',  name: 'Lamb',   note: 'jus',   is_vegan: 0 });
    expect(a.changes).toBe(1);
    expect(b.changes).toBe(1);
    expect(c.changes).toBe(1);
    const items = db.getMenuItems();
    expect(items.map(i => i.name)).toEqual(['Tomato', 'Beet', 'Lamb']);
    expect(items[0].sort_order).toBe(0);
    expect(items[1].sort_order).toBe(1);
    expect(items[2].sort_order).toBe(0);
  });

  test('updateMenuItemVegan flips the flag', () => {
    const a = db.insertMenuItem({ course: 'first', name: 'A', is_vegan: 0 });
    db.updateMenuItemVegan(a.lastInsertRowid, true);
    expect(db.getMenuItemById(a.lastInsertRowid).is_vegan).toBe(1);
    db.updateMenuItemVegan(a.lastInsertRowid, false);
    expect(db.getMenuItemById(a.lastInsertRowid).is_vegan).toBe(0);
  });

  test('countRsvpsForMenuItem counts both first and main references', () => {
    const f = db.insertMenuItem({ course: 'first', name: 'F' });
    const m = db.insertMenuItem({ course: 'main',  name: 'M' });
    db.insertRsvp({ name: 'A', email: 'a@x.com', attending: 1, event_type: 'full',
      first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid });
    db.insertRsvp({ name: 'B', email: 'b@x.com', attending: 1, event_type: 'full',
      first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid });
    expect(db.countRsvpsForMenuItem(f.lastInsertRowid)).toBe(2);
    expect(db.countRsvpsForMenuItem(m.lastInsertRowid)).toBe(2);
  });

  test('deleteMenuItem returns blocked when referenced and leaves item in place', () => {
    const f = db.insertMenuItem({ course: 'first', name: 'F' });
    const m = db.insertMenuItem({ course: 'main',  name: 'M' });
    db.insertRsvp({ name: 'A', email: 'a@x.com', attending: 1, event_type: 'full',
      first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid });
    const result = db.deleteMenuItem(f.lastInsertRowid);
    expect(result).toEqual({ changes: 0, blocked: true });
    expect(db.getMenuItemById(f.lastInsertRowid)).not.toBeNull();
  });

  test('deleteMenuItem compacts sort_order in the same course', () => {
    const a = db.insertMenuItem({ course: 'first', name: 'A' });
    const b = db.insertMenuItem({ course: 'first', name: 'B' });
    const c = db.insertMenuItem({ course: 'first', name: 'C' });
    db.deleteMenuItem(b.lastInsertRowid);
    const items = db.getMenuItems('first');
    expect(items.map(i => [i.name, i.sort_order])).toEqual([['A', 0], ['C', 1]]);
  });

  test('reorderMenuItems rewrites sort_order in the given order', () => {
    const a = db.insertMenuItem({ course: 'first', name: 'A' });
    const b = db.insertMenuItem({ course: 'first', name: 'B' });
    const c = db.insertMenuItem({ course: 'first', name: 'C' });
    const ok = db.reorderMenuItems('first', [c.lastInsertRowid, a.lastInsertRowid, b.lastInsertRowid]);
    expect(ok).toEqual({ ok: true });
    expect(db.getMenuItems('first').map(i => i.name)).toEqual(['C', 'A', 'B']);
  });

  test('reorderMenuItems rejects mismatched id set', () => {
    db.insertMenuItem({ course: 'first', name: 'A' });
    expect(db.reorderMenuItems('first', [9999])).toEqual({ ok: false });
  });

  test('upsertRsvp inserts on first call with was_update:false', () => {
    const r = db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'ceremony_party',
    });
    expect(r.was_update).toBe(false);
    expect(r.prev_attending).toBeNull();
    expect(typeof r.id).toBe('number');
    const stored = db.getRsvpByEmail('alice@example.com');
    expect(stored.name).toBe('Alice');
    expect(stored.event_type).toBe('ceremony_party');
  });

  test('upsertRsvp updates on duplicate email and reports prev_attending', () => {
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'ceremony_party',
    });
    const r = db.upsertRsvp({
      name: 'Alice Cooper', email: 'alice@example.com', attending: 0,
    });
    expect(r.was_update).toBe(true);
    expect(r.prev_attending).toBe(1);
    const stored = db.getRsvpByEmail('alice@example.com');
    expect(stored.name).toBe('Alice Cooper');
    expect(stored.attending).toBe(0);
    expect(stored.event_type).toBeNull();
  });

  test('upsertRsvp normalises email to lowercase + trim', () => {
    db.upsertRsvp({
      name: 'Alice', email: '  Alice@Example.COM  ', attending: 1,
      event_type: 'ceremony_party',
    });
    const stored = db.getRsvpByEmail('alice@example.com');
    expect(stored).not.toBeNull();
    expect(stored.email).toBe('alice@example.com');
  });

  test('getRsvpByEmail matches case-insensitively', () => {
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'ceremony_party',
    });
    expect(db.getRsvpByEmail('ALICE@example.com')).not.toBeNull();
    expect(db.getRsvpByEmail('  alice@example.com  ')).not.toBeNull();
  });

  test('upsertRsvp sets updated_at on update', () => {
    const a = db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'ceremony_party',
    });
    const before = db.getRsvpByEmail('alice@example.com');
    expect(before.updated_at).toBeNull();
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 0,
    });
    const after = db.getRsvpByEmail('alice@example.com');
    expect(after.updated_at).toBeTruthy();
  });
});

describe('rsvp_attendees schema', () => {
  test('rsvp_attendees table exists with the expected columns', () => {
    const db = initDb(':memory:');
    const cols = db._tableInfo('rsvp_attendees').map(c => c.name);
    expect(cols).toEqual(expect.arrayContaining([
      'id','rsvp_id','position','name','first_course_id','main_course_id','dietary_restrictions',
    ]));
    db.close();
  });

  test('initDb drops legacy rsvps with first_course_id/main_course_id on the row', () => {
    const { DatabaseSync } = require('node:sqlite');
    const path = require('node:path').join(require('node:os').tmpdir(), `wedplan-${Date.now()}.db`);
    const raw = new DatabaseSync(path);
    raw.exec(`CREATE TABLE rsvps (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE,
              attending INTEGER, event_type TEXT, first_course_id INTEGER, main_course_id INTEGER,
              dietary_restrictions TEXT, submitted_at TEXT, updated_at TEXT)`);
    raw.exec(`INSERT INTO rsvps (name, email, attending) VALUES ('Old','old@x.com',1)`);
    raw.close();

    const db = initDb(path);
    expect(db.getRsvpByEmail('old@x.com')).toBeNull();
    db.close();
    require('node:fs').unlinkSync(path);
  });
});
