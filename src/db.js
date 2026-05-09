const { DatabaseSync } = require('node:sqlite');

function initDb(path = 'rsvps.db') {
  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      attending INTEGER NOT NULL,
      event_type TEXT,
      is_vegan INTEGER,
      meal_preference INTEGER,
      dietary_restrictions TEXT,
      submitted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
    )
  `);

  // Migrate existing databases: add columns not yet present
  const existingCols = db.prepare('PRAGMA table_info(rsvps)').all().map((c) => c.name);
  if (!existingCols.includes('event_type')) db.exec('ALTER TABLE rsvps ADD COLUMN event_type TEXT');
  if (!existingCols.includes('is_vegan'))   db.exec('ALTER TABLE rsvps ADD COLUMN is_vegan INTEGER');
  if (!existingCols.includes('meal_preference')) db.exec('ALTER TABLE rsvps ADD COLUMN meal_preference INTEGER');

  return {
    insertRsvp({ name, email, attending, event_type = null, is_vegan = null, meal_preference = null, dietary_restrictions = null }) {
      const stmt = db.prepare(`
        INSERT INTO rsvps (name, email, attending, event_type, is_vegan, meal_preference, dietary_restrictions)
        VALUES (:name, :email, :attending, :event_type, :is_vegan, :meal_preference, :dietary_restrictions)
      `);
      return stmt.run({ name, email, attending, event_type, is_vegan, meal_preference, dietary_restrictions });
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
