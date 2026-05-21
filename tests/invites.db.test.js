const { initDb, _generateInviteToken } = require('../src/db');

describe('invite_tokens table', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(()  => { db.close(); });

  test('table exists with the expected columns', () => {
    const cols = db._tableInfo('invite_tokens').map(c => c.name);
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'token', 'event_type', 'max_party_size', 'label',
      'status', 'rsvp_id', 'created_at', 'consumed_at',
    ]));
  });

  test('has a UNIQUE index (from the UNIQUE constraint on token)', () => {
    const indexes = db._raw.prepare(`PRAGMA index_list('invite_tokens')`).all();
    const unique = indexes.filter(i => i.unique === 1);
    expect(unique.length).toBeGreaterThanOrEqual(1);
  });

  test('status defaults to "open" when not provided on insert', () => {
    db._raw.prepare(`
      INSERT INTO invite_tokens (token, event_type, max_party_size)
      VALUES ('tok-abc', 'full', 2)
    `).run();
    const row = db._raw.prepare(
      `SELECT status FROM invite_tokens WHERE token = 'tok-abc'`
    ).get();
    expect(row.status).toBe('open');
  });
});

describe('_generateInviteToken', () => {
  test('returns a 22-char URL-safe base64 string', () => {
    const t = _generateInviteToken();
    expect(typeof t).toBe('string');
    expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  test('produces unique values across calls', () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) set.add(_generateInviteToken());
    expect(set.size).toBe(50);
  });
});

describe('invite token helpers — create/read/consume/delete', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(()  => { db.close(); });

  test('createInviteToken inserts an open token with random unique token and correct fields', () => {
    const row1 = db.createInviteToken({ event_type: 'full', max_party_size: 2, label: 'Alice + Bob' });
    const row2 = db.createInviteToken({ event_type: 'evening', max_party_size: 4 });
    expect(row1.id).toBeGreaterThan(0);
    expect(typeof row1.token).toBe('string');
    expect(row1.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(row1.event_type).toBe('full');
    expect(row1.max_party_size).toBe(2);
    expect(row1.label).toBe('Alice + Bob');
    expect(row1.status).toBe('open');
    expect(row1.rsvp_id).toBeNull();
    expect(row1.consumed_at).toBeNull();
    expect(row2.label).toBeNull();
    expect(row2.token).not.toBe(row1.token);
  });

  test('createInviteToken rejects max_party_size of 0', () => {
    expect(() => db.createInviteToken({ event_type: 'full', max_party_size: 0 })).toThrow();
  });

  test('createInviteToken rejects max_party_size of 7', () => {
    expect(() => db.createInviteToken({ event_type: 'full', max_party_size: 7 })).toThrow();
  });

  test('getInviteByToken returns the row, or null for unknown token', () => {
    const created = db.createInviteToken({ event_type: 'full', max_party_size: 3 });
    const found = db.getInviteByToken(created.token);
    expect(found).not.toBeNull();
    expect(found.id).toBe(created.id);
    expect(db.getInviteByToken('does-not-exist')).toBeNull();
  });

  test('getInviteByToken returns null for falsy/non-string input', () => {
    expect(db.getInviteByToken('')).toBeNull();
    expect(db.getInviteByToken(null)).toBeNull();
    expect(db.getInviteByToken(undefined)).toBeNull();
    expect(db.getInviteByToken(123)).toBeNull();
  });

  test('getInviteById returns the row, or null for unknown id', () => {
    const created = db.createInviteToken({ event_type: 'full', max_party_size: 3 });
    const found = db.getInviteById(created.id);
    expect(found).not.toBeNull();
    expect(found.token).toBe(created.token);
    expect(db.getInviteById(999999)).toBeNull();
  });

  test('consumeInviteToken flips open → consumed and records rsvp_id and consumed_at', () => {
    const invite = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const rsvp = db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1, event_type: 'full',
      attendees: [{ name: 'Alice' }, { name: 'Bob' }],
    });
    const changes = db.consumeInviteToken(invite.id, rsvp.id);
    expect(changes).toBe(1);
    const after = db.getInviteById(invite.id);
    expect(after.status).toBe('consumed');
    expect(after.rsvp_id).toBe(rsvp.id);
    expect(after.consumed_at).not.toBeNull();
  });

  test('consumeInviteToken returns 0 when already consumed', () => {
    const invite = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const rsvp = db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1, event_type: 'full',
      attendees: [{ name: 'Alice' }],
    });
    expect(db.consumeInviteToken(invite.id, rsvp.id)).toBe(1);
    expect(db.consumeInviteToken(invite.id, rsvp.id)).toBe(0);
  });

  test('consumeInviteToken accepts released → consumed transition', () => {
    const r = db.upsertRsvp({
      name: 'A', email: 'a@x.com', attending: 1, event_type: 'evening',
      attendees: [{ name: 'A' }],
    });
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 2 });
    // Manually flip to 'released' via _raw to avoid depending on releaseInviteToken (Task 3).
    db._raw.prepare("UPDATE invite_tokens SET status='released' WHERE id = ?").run(inv.id);

    const changes = db.consumeInviteToken(inv.id, r.id);
    expect(changes).toBe(1);
    const after = db.getInviteById(inv.id);
    expect(after.status).toBe('consumed');
    expect(after.rsvp_id).toBe(r.id);
  });

  test('deleteInviteToken removes open tokens and refuses consumed ones', () => {
    const openInv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    expect(db.deleteInviteToken(openInv.id)).toBe(1);
    expect(db.getInviteById(openInv.id)).toBeNull();

    const consumedInv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const rsvp = db.upsertRsvp({
      name: 'C', email: 'c@example.com', attending: 1, event_type: 'full',
      attendees: [{ name: 'C' }],
    });
    db.consumeInviteToken(consumedInv.id, rsvp.id);
    expect(db.deleteInviteToken(consumedInv.id)).toBe(0);
    expect(db.getInviteById(consumedInv.id)).not.toBeNull();
  });

  test('getAllInvitesWithRsvp joins rsvp data with attendee count', () => {
    const openInv = db.createInviteToken({ event_type: 'evening', max_party_size: 3, label: 'open one' });
    const consumedInv = db.createInviteToken({ event_type: 'full', max_party_size: 4, label: 'consumed one' });
    const rsvp = db.upsertRsvp({
      name: 'Dana', email: 'dana@example.com', attending: 1, event_type: 'full',
      attendees: [{ name: 'Dana' }, { name: 'Eli' }],
    });
    db.consumeInviteToken(consumedInv.id, rsvp.id);

    const rows = db.getAllInvitesWithRsvp();
    expect(rows.length).toBe(2);
    const openRow = rows.find(r => r.id === openInv.id);
    const consRow = rows.find(r => r.id === consumedInv.id);

    expect(openRow.rsvp_email).toBeNull();
    expect(openRow.rsvp_party_size).toBe(0);

    expect(consRow.rsvp_email).toBe('dana@example.com');
    expect(consRow.rsvp_lead_name).toBe('Dana');
    expect(consRow.rsvp_attending).toBe(1);
    expect(consRow.rsvp_party_size).toBe(2);
  });
});

describe('releaseInviteToken', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(()  => { db.close(); });

  test('release on a consumed invite deletes the rsvp + attendees and resets the invite', () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const rsvp = db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1, event_type: 'full',
      attendees: [{ name: 'Alice' }, { name: 'Bob' }],
    });
    db.consumeInviteToken(inv.id, rsvp.id);

    const result = db.releaseInviteToken(inv.id);
    expect(result).toEqual({ released_gift: null });

    const after = db.getInviteById(inv.id);
    expect(after.status).toBe('released');
    expect(after.rsvp_id).toBeNull();
    expect(after.consumed_at).toBeNull();

    const rsvpRow = db._raw.prepare('SELECT * FROM rsvps WHERE id = ?').get(rsvp.id);
    expect(rsvpRow).toBeUndefined();
    const attendees = db._raw.prepare('SELECT * FROM rsvp_attendees WHERE rsvp_id = ?').all(rsvp.id);
    expect(attendees.length).toBe(0);
  });

  test('release on a consumed invite whose rsvp claimed a registry item returns the gift and unclaims it', () => {
    db.insertRegistryItem({ title: 'Honeymoon fund' });
    const item = db.getAllRegistryItems()[0];
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const rsvp = db.upsertRsvp({
      name: 'Alice', email: 'alice@example.com', attending: 1, event_type: 'full',
      attendees: [{ name: 'Alice' }],
    });
    db.consumeInviteToken(inv.id, rsvp.id);
    db.claimRegistryItem(item.id, rsvp.id);

    const result = db.releaseInviteToken(inv.id);
    expect(result).toEqual({ released_gift: { title: 'Honeymoon fund' } });

    const itemAfter = db.getRegistryItemById(item.id);
    expect(itemAfter.claimed_by_rsvp_id).toBeNull();
  });

  test('release on an already-released invite is idempotent', () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    db._raw.prepare("UPDATE invite_tokens SET status='released' WHERE id = ?").run(inv.id);

    const result = db.releaseInviteToken(inv.id);
    expect(result).toEqual({ released_gift: null });
    expect(db.getInviteById(inv.id).status).toBe('released');
  });

  test('release on an open invite is a no-op', () => {
    const inv = db.createInviteToken({ event_type: 'full', max_party_size: 2 });
    const result = db.releaseInviteToken(inv.id);
    expect(result).toEqual({ released_gift: null });
    expect(db.getInviteById(inv.id).status).toBe('open');
  });

  test('release on an unknown id throws invite_not_found', () => {
    expect(() => db.releaseInviteToken(999999)).toThrow(/invite_not_found/);
  });
});

describe('upsertRsvp + consumeInviteId atomicity', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('consumes the invite in the same transaction as the rsvp insert', () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 2 });
    const r = db.upsertRsvp({
      name: 'A', email: 'a@x.com', attending: 1, event_type: 'evening',
      attendees: [{ name: 'A' }],
    }, { consumeInviteId: inv.id });

    expect(r.invite_consumed).toBe(true);
    const after = db.getInviteById(inv.id);
    expect(after.status).toBe('consumed');
    expect(after.rsvp_id).toBe(r.id);
  });

  test('omitting consumeInviteId leaves invite_consumed=false and does not touch any invite', () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 2 });
    const r = db.upsertRsvp({
      name: 'A', email: 'a@x.com', attending: 1, event_type: 'evening',
      attendees: [{ name: 'A' }],
    });
    expect(r.invite_consumed).toBe(false);
    expect(db.getInviteById(inv.id).status).toBe('open');
  });

  test('second call against the same invite throws invite_already_used and does not insert the second rsvp', () => {
    const inv = db.createInviteToken({ event_type: 'evening', max_party_size: 2 });
    const r1 = db.upsertRsvp({
      name: 'A', email: 'a@x.com', attending: 1, event_type: 'evening',
      attendees: [{ name: 'A' }],
    }, { consumeInviteId: inv.id });
    expect(r1.invite_consumed).toBe(true);

    expect(() =>
      db.upsertRsvp({
        name: 'B', email: 'b@x.com', attending: 1, event_type: 'evening',
        attendees: [{ name: 'B' }],
      }, { consumeInviteId: inv.id })
    ).toThrow(/invite_already_used/);

    expect(db.getRsvpByEmail('b@x.com')).toBeNull();
  });
});
