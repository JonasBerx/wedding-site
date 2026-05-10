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
    const items = db.getMenuItems();
    expect(items.map(i => i.name)).toEqual(['Tomato', 'Beet', 'Lamb']);
    expect(items[0].sort_order).toBe(0);
    expect(items[1].sort_order).toBe(1);
    expect(items[2].sort_order).toBe(0);
  });
});
