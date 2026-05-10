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

  const existingCols = db.prepare('PRAGMA table_info(rsvps)').all().map((c) => c.name);
  if (!existingCols.includes('event_type')) db.exec('ALTER TABLE rsvps ADD COLUMN event_type TEXT');
  if (!existingCols.includes('is_vegan'))   db.exec('ALTER TABLE rsvps ADD COLUMN is_vegan INTEGER');
  if (!existingCols.includes('meal_preference')) db.exec('ALTER TABLE rsvps ADD COLUMN meal_preference INTEGER');

  db.exec(`
    CREATE TABLE IF NOT EXISTS registry_items (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      title               TEXT NOT NULL,
      description         TEXT,
      claimed_by_rsvp_id  INTEGER REFERENCES rsvps(id),
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

    getRsvpByEmail(email) {
      return db.prepare('SELECT * FROM rsvps WHERE email = :email').get({ email }) || null;
    },

    insertRegistryItem({ title, description = null }) {
      return db.prepare(
        'INSERT INTO registry_items (title, description) VALUES (:title, :description)'
      ).run({ title, description });
    },

    getAllRegistryItems() {
      return db.prepare('SELECT * FROM registry_items ORDER BY id ASC').all();
    },

    getRegistryItemById(id) {
      return db.prepare('SELECT * FROM registry_items WHERE id = :id').get({ id }) || null;
    },

    getRegistryItemsWithClaimer() {
      return db.prepare(`
        SELECT ri.*, r.name AS claimer_name
        FROM registry_items ri
        LEFT JOIN rsvps r ON ri.claimed_by_rsvp_id = r.id
        ORDER BY ri.id ASC
      `).all();
    },

    getClaimedItemByRsvpId(rsvpId) {
      return db.prepare(
        'SELECT * FROM registry_items WHERE claimed_by_rsvp_id = :rsvpId'
      ).get({ rsvpId }) || null;
    },

    claimRegistryItem(itemId, rsvpId) {
      return db.prepare(
        'UPDATE registry_items SET claimed_by_rsvp_id = :rsvpId WHERE id = :itemId'
      ).run({ itemId, rsvpId });
    },

    unclaimRegistryItem(itemId) {
      return db.prepare(
        'UPDATE registry_items SET claimed_by_rsvp_id = NULL WHERE id = :itemId'
      ).run({ itemId });
    },

    deleteRegistryItem(id) {
      return db.prepare(
        'DELETE FROM registry_items WHERE id = :id AND claimed_by_rsvp_id IS NULL'
      ).run({ id });
    },

    close() {
      db.close();
    },
  };
}

module.exports = { initDb };
