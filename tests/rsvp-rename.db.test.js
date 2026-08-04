const { initDb } = require('../src/db');

// A full-day party of two: Ana (position 1, also the lead) and Bram (position 2).
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

describe('getAdminRsvpById', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('returns the party with attendee ids and resolved course names', () => {
    const id = seedParty(db);
    const rsvp = db.getAdminRsvpById(id);
    expect(rsvp.name).toBe('Ana');
    expect(rsvp.attendees).toHaveLength(2);
    expect(rsvp.attendees[0].id).toEqual(expect.any(Number));
    expect(rsvp.attendees[0].position).toBe(1);
    expect(rsvp.attendees[0].first_course_name).toBe('Tomato');
    expect(rsvp.attendees[0].main_course_name).toBe('Lamb');
  });

  test('returns null for an unknown id', () => {
    expect(db.getAdminRsvpById(9999)).toBeNull();
  });

  test('getAllRsvps still resolves course names after the refactor', () => {
    seedParty(db);
    const all = db.getAllRsvps();
    expect(all).toHaveLength(1);
    expect(all[0].attendees[0].first_course_name).toBe('Tomato');
    expect(all[0].attendees[1].main_course_name).toBe('Lamb');
  });
});

describe('renameRsvpLead', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('renames the lead and attendee position 1 together', () => {
    const id = seedParty(db);
    const rsvp = db.renameRsvpLead(id, 'Anna Peeters');
    expect(rsvp.name).toBe('Anna Peeters');
    expect(rsvp.attendees[0].name).toBe('Anna Peeters');
    expect(rsvp.attendees[1].name).toBe('Bram');
  });

  test('succeeds for a not-attending RSVP that has no attendee rows', () => {
    const { id } = db.upsertRsvp({
      name: 'Ana', email: 'ana@example.com', attending: 0, attendees: [],
    });
    const rsvp = db.renameRsvpLead(id, 'Anna Peeters');
    expect(rsvp.name).toBe('Anna Peeters');
    expect(rsvp.attendees).toHaveLength(0);
  });

  test('returns null for an unknown RSVP id', () => {
    expect(db.renameRsvpLead(9999, 'Nobody')).toBeNull();
  });

  test('sets updated_at, which starts out null', () => {
    const id = seedParty(db);
    expect(db.getAdminRsvpById(id).updated_at).toBeNull();
    expect(db.renameRsvpLead(id, 'Anna Peeters').updated_at).toEqual(expect.any(String));
  });
});

describe('renameAttendee', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('renaming attendee position 1 also renames the lead', () => {
    const id = seedParty(db);
    const a1 = db.getAdminRsvpById(id).attendees[0].id;
    const rsvp = db.renameAttendee(id, a1, 'Anna Peeters');
    expect(rsvp.attendees[0].name).toBe('Anna Peeters');
    expect(rsvp.name).toBe('Anna Peeters');
  });

  test('renaming a later attendee leaves the lead name alone', () => {
    const id = seedParty(db);
    const a2 = db.getAdminRsvpById(id).attendees[1].id;
    const rsvp = db.renameAttendee(id, a2, 'Bram Peeters');
    expect(rsvp.attendees[1].name).toBe('Bram Peeters');
    expect(rsvp.name).toBe('Ana');
    expect(rsvp.attendees[0].name).toBe('Ana');
  });

  test('sets updated_at even when only a later attendee changes', () => {
    const id = seedParty(db);
    const a2 = db.getAdminRsvpById(id).attendees[1].id;
    expect(db.renameAttendee(id, a2, 'Bram Peeters').updated_at).toEqual(expect.any(String));
  });

  test('returns null for an unknown attendee id', () => {
    const id = seedParty(db);
    expect(db.renameAttendee(id, 9999, 'Nobody')).toBeNull();
  });

  test('refuses an attendee that belongs to another party, changing nothing', () => {
    const idA = seedParty(db, { email: 'ana@example.com' });
    const idB = seedParty(db, { email: 'cara@example.com', lead: 'Cara', second: 'Dirk' });
    const otherAttendee = db.getAdminRsvpById(idB).attendees[0].id;

    expect(db.renameAttendee(idA, otherAttendee, 'Hijacked')).toBeNull();
    expect(db.getAdminRsvpById(idA).name).toBe('Ana');
    expect(db.getAdminRsvpById(idB).name).toBe('Cara');
    expect(db.getAdminRsvpById(idB).attendees[0].name).toBe('Cara');
  });
});

describe('renames preserve attendee identity', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('attendee ids are unchanged and the seat survives, showing the new name', () => {
    const id = seedParty(db);
    const before = db.getAdminRsvpById(id).attendees.map(a => a.id);

    const table = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    db.createSeatingAssignment({ table_id: table.id, rsvp_attendee_id: before[1] });

    db.renameAttendee(id, before[1], 'Bram Peeters');
    db.renameRsvpLead(id, 'Anna Peeters');

    const after = db.getAdminRsvpById(id).attendees.map(a => a.id);
    expect(after).toEqual(before);

    const chart = db.getSeatingTablesWithAssignments();
    expect(chart[0].assignments).toHaveLength(1);
    expect(chart[0].assignments[0].rsvp_attendee_id).toBe(before[1]);
    expect(chart[0].assignments[0].display_name).toBe('Bram Peeters');
  });
});
