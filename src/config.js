// Central resolution of runtime paths from environment variables.
function resolveDbPath(env = {}) {
  if (env.DB_PATH && env.DB_PATH.trim()) {
    return env.DB_PATH.trim();
  }
  return env.NODE_ENV === 'production' ? '/data/rsvps.db' : 'rsvps.db';
}

module.exports = { resolveDbPath };
