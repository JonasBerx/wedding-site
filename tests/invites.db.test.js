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
