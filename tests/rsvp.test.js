const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('POST /api/rsvp', () => {
  let app, db;

  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  // ── course-id validation ───────────────────────────────────

  test('returns 201 with first/main course ids for full-day guests', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'full', token: inv.token,
      attendees: [
        { name: 'Alice', first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid },
      ],
    });
    expect(res.status).toBe(201);
  });

  test('full-day rejects when first_course_id missing', async () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full', token: inv.token,
      attendees: [{ name: 'A', main_course_id: 1 }],
    });
    expect(res.status).toBe(400);
  });

  test('full-day rejects when course id refers to wrong course', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full', token: inv.token,
      attendees: [{ name: 'A', first_course_id: m.lastInsertRowid, main_course_id: f.lastInsertRowid }],
    });
    expect(res.status).toBe(400);
  });

  test('full-day rejects when course id does not exist', async () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full', token: inv.token,
      attendees: [{ name: 'A', first_course_id: 999, main_course_id: 1000 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/menu_item_not_found/);
  });

  test('evening stores null for both course ids', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'B', email: 'b@x.com', attending: true, event_type: 'evening', token: inv.token,
      attendees: [{ name: 'B', first_course_id: 1, main_course_id: 1 }],
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('b@x.com');
    expect(stored.attendees[0].first_course_id).toBeNull();
    expect(stored.attendees[0].main_course_id).toBeNull();
  });

  test('not attending stores null for both course ids', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'C', email: 'c@x.com', attending: false,
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('c@x.com');
    expect(stored.attendees).toEqual([]);
  });

  // ── general field validation ───────────────────────────────

  test('returns 201 without optional fields (not attending)', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Bob',
      email: 'bob@example.com',
      attending: false,
    });
    expect(res.status).toBe(201);
  });

  test('stores attending as 1 for true, 0 for false', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({ name: 'A', email: 'a@b.com', attending: true, event_type: 'evening', token: inv.token, attendees: [{ name: 'A' }] });
    await request(app).post('/api/rsvp').send({ name: 'B', email: 'b@b.com', attending: false });
    const [b, a] = db.getAllRsvps();
    expect(a.attending).toBe(1);
    expect(b.attending).toBe(0);
  });

  test('trims whitespace from name and email', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: '  Alice  ',
      email: '  alice@example.com  ',
      attending: true,
      event_type: 'evening',
      token: inv.token,
      attendees: [{ name: 'Alice' }],
    });
    expect(res.status).toBe(201);
    const [rsvp] = db.getAllRsvps();
    expect(rsvp.name).toBe('Alice');
    expect(rsvp.email).toBe('alice@example.com');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      email: 'alice@example.com',
      attending: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when name is whitespace only', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: '   ',
      email: 'alice@example.com',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when email is not a valid address', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'not-an-email',
      attending: true,
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when attending is missing', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when attending is not a boolean', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice',
      email: 'alice@example.com',
      attending: 'yes',
    });
    expect(res.status).toBe(400);
  });

  test('full-day requires at least one attendee', async () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full', token: inv.token,
      attendees: [],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/attendees/);
  });

  test('caps attendees at 6', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'X' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Y' });
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 6 });
    const seven = Array.from({ length: 7 }, (_, i) => ({
      name: `P${i+1}`, first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid,
    }));
    const res = await request(app).post('/api/rsvp').send({
      name: 'P1', email: 'a@x.com', attending: true, event_type: 'full', token: inv.token,
      attendees: seven,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too_many_attendees/);
  });

  test('lead attendee name is forced to top-level name', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'X' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Y' });
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Top Name', email: 'a@x.com', attending: true, event_type: 'full', token: inv.token,
      attendees: [
        { name: 'WRONG', first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid },
      ],
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('a@x.com');
    expect(stored.attendees[0].name).toBe('Top Name');
  });
});

describe('GET /api/rsvp', () => {
  let app, db;
  beforeEach(() => {
    delete process.env.RSVP_DEADLINE;
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.RSVP_DEADLINE;
  });

  test('without email returns deadline_passed:false and rsvp:null', async () => {
    const res = await request(app).get('/api/rsvp');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deadline_passed: false, rsvp: null });
  });

  test('with empty email behaves like no email', async () => {
    const res = await request(app).get('/api/rsvp?email=');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deadline_passed: false, rsvp: null });
  });

  test('with malformed email returns 400', async () => {
    const res = await request(app).get('/api/rsvp?email=not-an-email');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid email');
  });

  test('with unknown email returns rsvp:null', async () => {
    const res = await request(app).get('/api/rsvp?email=ghost@example.com');
    expect(res.status).toBe(200);
    expect(res.body.rsvp).toBeNull();
  });

  test('with known email returns the public shape', async () => {
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1, event_type: 'full',
      dietary_restrictions: 'gluten free',
      attendees: [{
        name: 'Alice',
        first_course_id: f.lastInsertRowid,
        main_course_id:  m.lastInsertRowid,
        dietary_restrictions: null,
      }],
    });
    const res = await request(app).get('/api/rsvp?email=alice@example.com');
    expect(res.status).toBe(200);
    expect(res.body.deadline_passed).toBe(false);
    expect(res.body.rsvp).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      attending: 1,
      event_type: 'full',
      dietary_restrictions: 'gluten free',
      song: null,
      attendees: [{
        position: 1,
        name: 'Alice',
        first_course_id: f.lastInsertRowid,
        main_course_id:  m.lastInsertRowid,
        dietary_restrictions: null,
      }],
    });
  });

  test('song roundtrips through POST and GET (trimmed, empty → null)', async () => {
    const inv1 = db.createInviteToken({ event_type: 'evening', max_party_size: 2 });
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true,
      token: inv1.token,
      song: '  Edith Piaf — La Vie en Rose  ',
      attendees: [{ name: 'A' }],
    });
    const r1 = await request(app).get('/api/rsvp?email=a@x.com');
    expect(r1.body.rsvp.song).toBe('Edith Piaf — La Vie en Rose');

    // Edit clears the song to empty string → stored as null.
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      song: '   ',
      attendees: [{ name: 'A' }],
    });
    const r2 = await request(app).get('/api/rsvp?email=a@x.com');
    expect(r2.body.rsvp.song).toBeNull();
  });

  test('reports deadline_passed:true when RSVP_DEADLINE is in the past', async () => {
    process.env.RSVP_DEADLINE = '2000-01-01T00:00:00Z';
    const res = await request(app).get('/api/rsvp');
    expect(res.body.deadline_passed).toBe(true);
  });

  test('reports deadline_passed:false when RSVP_DEADLINE is in the future', async () => {
    process.env.RSVP_DEADLINE = '2099-01-01T00:00:00Z';
    const res = await request(app).get('/api/rsvp');
    expect(res.body.deadline_passed).toBe(false);
  });

  test('ignores malformed RSVP_DEADLINE (treats as not set)', async () => {
    process.env.RSVP_DEADLINE = 'not-a-date';
    const res = await request(app).get('/api/rsvp');
    expect(res.body.deadline_passed).toBe(false);
  });

  test('lookup is case-insensitive', async () => {
    db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1,
      event_type: 'evening',
    });
    const res = await request(app).get('/api/rsvp?email=ALICE@example.com');
    expect(res.body.rsvp).not.toBeNull();
    expect(res.body.rsvp.email).toBe('alice@example.com');
  });
});

describe('POST /api/rsvp upsert + deadline + release', () => {
  let app, db;
  beforeEach(() => {
    delete process.env.RSVP_DEADLINE;
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.RSVP_DEADLINE;
  });

  test('first POST inserts and returns was_update:false', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'evening', token: inv.token, attendees: [{ name: 'Alice' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.was_update).toBe(false);
    expect(res.body).not.toHaveProperty('released_gift');
  });

  test('second POST with same email updates and returns was_update:true', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'evening', token: inv.token, attendees: [{ name: 'Alice' }],
    });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice C', email: 'alice@example.com', attending: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.was_update).toBe(true);
    const stored = db.getRsvpByEmail('alice@example.com');
    expect(stored.attending).toBe(0);
    expect(stored.name).toBe('Alice C');
  });

  test('returns 409 deadline_passed when RSVP_DEADLINE in the past', async () => {
    process.env.RSVP_DEADLINE = '2000-01-01T00:00:00Z';
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'evening', attendees: [{ name: 'Alice' }],
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('deadline_passed');
    expect(db.getRsvpByEmail('alice@example.com')).toBeNull();
  });

  test('release: yes->no transition releases the registry claim', async () => {
    db.insertRegistryItem({ title: 'Honeymoon fund' });
    const item = db.getAllRegistryItems()[0];

    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'evening', token: inv.token, attendees: [{ name: 'Alice' }],
    });
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);

    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.released_gift).toEqual({ title: 'Honeymoon fund' });

    const reread = db.getRegistryItemById(item.id);
    expect(reread.claimed_by_rsvp_id).toBeNull();
  });

  test('release: yes->no with no claim does not include released_gift', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'evening', token: inv.token, attendees: [{ name: 'Alice' }],
    });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: false,
    });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('released_gift');
  });

  test('release: yes->yes (same event_type) does NOT release the claim', async () => {
    db.insertRegistryItem({ title: 'Honeymoon fund' });
    const item = db.getAllRegistryItems()[0];
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 4 });

    await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'full', token: inv.token,
      attendees: [{ name: 'Alice', first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid }],
    });
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);

    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'alice@example.com', attending: true,
      event_type: 'full',
      attendees: [
        { name: 'Alice', first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid },
        { name: 'Bob',   first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('released_gift');
    expect(db.getRegistryItemById(item.id).claimed_by_rsvp_id).toBe(rsvp.id);
  });

  test('case-insensitive email upsert (Alice@... and alice@... become one row)', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'Alice', email: 'Alice@Example.COM', attending: true,
      event_type: 'evening', token: inv.token, attendees: [{ name: 'Alice' }],
    });
    const res = await request(app).post('/api/rsvp').send({
      name: 'Alice C', email: 'alice@example.com', attending: false,
    });
    expect(res.body.was_update).toBe(true);
    expect(db.getAllRsvps()).toHaveLength(1);
  });
});

describe('POST /api/rsvp event_type_locked on edits', () => {
  let app, db;
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });
  afterEach(() => { db.close(); });

  test('edit posting a different event_type returns 400 event_type_locked', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening', token: inv.token,
      attendees: [{ name: 'A' }],
    });
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'full',
      attendees: [{ name: 'A', first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('event_type_locked');
  });

  test('edit posting the same event_type still works', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening', token: inv.token,
      attendees: [{ name: 'A' }],
    });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      attendees: [{ name: 'A' }, { name: 'B' }],
    });
    expect(res.status).toBe(201);
  });

  test('edit with attending=false ignores event_type and succeeds', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening', token: inv.token,
      attendees: [{ name: 'A' }],
    });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: false,
    });
    expect(res.status).toBe(201);
  });

  test('edit omitting event_type still works and preserves the stored value', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening', token: inv.token,
      attendees: [{ name: 'A' }],
    });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true,
      // no event_type
      attendees: [{ name: 'A' }],
    });
    expect(res.status).toBe(201);
    expect(db.getRsvpByEmail('a@x.com').event_type).toBe('evening');
  });
});

describe('POST /api/rsvp invite-token gating', () => {
  let app, db;
  beforeEach(() => {
    delete process.env.RSVP_DEADLINE;
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.RSVP_DEADLINE;
  });

  test('first submit attending=true without a token → 400 invite_required', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      attendees: [{ name: 'A' }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invite_required');
    expect(db.getRsvpByEmail('a@x.com')).toBeNull();
  });

  test('first submit with unknown token → 400 invalid_invite', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      token: 'does-not-exist',
      attendees: [{ name: 'A' }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_invite');
    expect(db.getRsvpByEmail('a@x.com')).toBeNull();
  });

  test('first submit consumes the token; second use with same token → 409 invite_already_used', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    const first = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      token: inv.token, attendees: [{ name: 'A' }],
    });
    expect(first.status).toBe(201);
    expect(db.getInviteById(inv.id).status).toBe('consumed');

    const second = await request(app).post('/api/rsvp').send({
      name: 'B', email: 'b@x.com', attending: true, event_type: 'evening',
      token: inv.token, attendees: [{ name: 'B' }],
    });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('invite_already_used');
    expect(db.getRsvpByEmail('b@x.com')).toBeNull();
  });

  test("first submit uses the token's event_type; client-sent event_type is ignored", async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    const f = db.insertMenuItem({ course: 'first', name: 'Tomato' });
    const m = db.insertMenuItem({ course: 'main',  name: 'Lamb' });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true,
      event_type: 'full', // client lies; should be ignored
      token: inv.token,
      attendees: [{ name: 'A', first_course_id: f.lastInsertRowid, main_course_id: m.lastInsertRowid }],
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('a@x.com');
    expect(stored.event_type).toBe('evening');
    // Course ids dropped because token said evening.
    expect(stored.attendees[0].first_course_id).toBeNull();
    expect(stored.attendees[0].main_course_id).toBeNull();
  });

  test('first submit with attendees.length > token.max_party_size → 400 too_many_attendees', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 2 });
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      token: inv.token,
      attendees: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('too_many_attendees');
    expect(db.getRsvpByEmail('a@x.com')).toBeNull();
  });

  test('edit path ignores token entirely', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      token: inv.token, attendees: [{ name: 'A' }],
    });

    // Edit with a junk token: still works.
    const edit1 = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      token: 'whatever-bogus', attendees: [{ name: 'A' }, { name: 'B' }],
    });
    expect(edit1.status).toBe(201);

    // Edit with no token: still works.
    const edit2 = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      attendees: [{ name: 'A' }],
    });
    expect(edit2.status).toBe(201);
  });

  test('released invite is reusable: release then fresh first-submit succeeds', async () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    const first = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      token: inv.token, attendees: [{ name: 'A' }],
    });
    expect(first.status).toBe(201);
    expect(db.getInviteById(inv.id).status).toBe('consumed');

    db.releaseInviteToken(inv.id);
    expect(db.getInviteById(inv.id).status).toBe('released');

    const reuse = await request(app).post('/api/rsvp').send({
      name: 'B', email: 'b@x.com', attending: true, event_type: 'evening',
      token: inv.token, attendees: [{ name: 'B' }],
    });
    expect(reuse.status).toBe(201);
    expect(db.getInviteById(inv.id).status).toBe('consumed');
  });

  test('first submit attending=false succeeds without a token', async () => {
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: false,
    });
    expect(res.status).toBe(201);
    const stored = db.getRsvpByEmail('a@x.com');
    expect(stored.attending).toBe(0);
  });

  test('deadline_passed preempts invite_required', async () => {
    process.env.RSVP_DEADLINE = '2000-01-01T00:00:00Z';
    const res = await request(app).post('/api/rsvp').send({
      name: 'A', email: 'a@x.com', attending: true, event_type: 'evening',
      attendees: [{ name: 'A' }],
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('deadline_passed');
  });
});
