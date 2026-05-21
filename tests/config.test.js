const { resolveDbPath } = require('../src/config');

describe('resolveDbPath', () => {
  test('explicit DB_PATH wins over everything', () => {
    expect(resolveDbPath({ DB_PATH: '/custom/x.db', NODE_ENV: 'production' })).toBe('/custom/x.db');
  });

  test('production with no DB_PATH defaults to the /data volume', () => {
    expect(resolveDbPath({ NODE_ENV: 'production' })).toBe('/data/rsvps.db');
  });

  test('non-production defaults to a local rsvps.db', () => {
    expect(resolveDbPath({})).toBe('rsvps.db');
    expect(resolveDbPath({ NODE_ENV: 'development' })).toBe('rsvps.db');
  });

  test('an empty DB_PATH is ignored', () => {
    expect(resolveDbPath({ DB_PATH: '', NODE_ENV: 'production' })).toBe('/data/rsvps.db');
  });
});
