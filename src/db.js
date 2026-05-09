const { DatabaseSync } = require('node:sqlite');

function initDb(path = 'rsvps.db') {
  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      attending INTEGER NOT NULL,
      meal_preference TEXT,
      dietary_restrictions TEXT,
      submitted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
    )
  `);

  return {
    insertRsvp({ name, email, attending, meal_preference, dietary_restrictions }) {
      const stmt = db.prepare(`
        INSERT INTO rsvps (name, email, attending, meal_preference, dietary_restrictions)
        VALUES (:name, :email, :attending, :meal_preference, :dietary_restrictions)
      `);
      return stmt.run({ name, email, attending, meal_preference, dietary_restrictions });
    },

    getAllRsvps() {
      return db.prepare('SELECT * FROM rsvps ORDER BY id DESC').all();
    },

    close() {
      db.close();
    },
  };
}

module.exports = { initDb };
