const { DatabaseSync } = require('node:sqlite');

function initDb(path = 'rsvps.db') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');

  // ── rsvps shape guard. The site has no real RSVPs yet; this is a
  // destructive reset by design. We drop and rebuild if:
  //   (a) the legacy single-meal columns are present on rsvps, or
  //   (b) the rsvp_attendees child table is missing, or
  //   (c) the previous editable-RSVP markers (updated_at, UNIQUE(email)) are missing.
  const tableNames = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(r => r.name);
  const rsvpCols = tableNames.includes('rsvps')
    ? db.prepare('PRAGMA table_info(rsvps)').all().map(c => c.name)
    : [];
  const hasLegacyMealCols = rsvpCols.includes('first_course_id') || rsvpCols.includes('main_course_id')
                         || rsvpCols.includes('is_vegan') || rsvpCols.includes('meal_preference');
  const hasUpdatedAt = rsvpCols.includes('updated_at');
  const hasAttendeesTable = tableNames.includes('rsvp_attendees');
  if (rsvpCols.length > 0 && (hasLegacyMealCols || !hasUpdatedAt || !hasAttendeesTable)) {
    db.exec('DROP TABLE IF EXISTS rsvp_attendees');
    db.exec('DROP TABLE rsvps');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      course      TEXT NOT NULL CHECK (course IN ('first','main')),
      name        TEXT NOT NULL,
      note        TEXT,
      is_vegan    INTEGER NOT NULL DEFAULT 0,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      attending INTEGER NOT NULL,
      event_type TEXT,
      dietary_restrictions TEXT,
      submitted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
      updated_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvp_attendees (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      rsvp_id               INTEGER NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
      position              INTEGER NOT NULL,
      name                  TEXT NOT NULL,
      first_course_id       INTEGER REFERENCES menu_items(id),
      main_course_id        INTEGER REFERENCES menu_items(id),
      dietary_restrictions  TEXT
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS rsvp_attendees_rsvp_id ON rsvp_attendees(rsvp_id)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS registry_items (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      title               TEXT NOT NULL,
      description         TEXT,
      claimed_by_rsvp_id  INTEGER REFERENCES rsvps(id),
      unclaimable         INTEGER NOT NULL DEFAULT 0,
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Idempotent migration for existing tables created before `unclaimable` was added.
  const registryCols = db.prepare('PRAGMA table_info(registry_items)').all().map(c => c.name);
  if (!registryCols.includes('unclaimable')) {
    db.exec('ALTER TABLE registry_items ADD COLUMN unclaimable INTEGER NOT NULL DEFAULT 0');
  }

  return {
    insertRsvp({ name, email, attending, event_type = null, first_course_id = null, main_course_id = null, dietary_restrictions = null }) {
      return db.prepare(`
        INSERT INTO rsvps (name, email, attending, event_type, first_course_id, main_course_id, dietary_restrictions)
        VALUES (:name, :email, :attending, :event_type, :first_course_id, :main_course_id, :dietary_restrictions)
      `).run({ name, email, attending, event_type, first_course_id, main_course_id, dietary_restrictions });
    },

    upsertRsvp({ name, email, attending, event_type = null, first_course_id = null, main_course_id = null, dietary_restrictions = null }) {
      const normEmail = String(email || '').trim().toLowerCase();
      db.exec('BEGIN IMMEDIATE');
      try {
        const existing = db.prepare('SELECT id, attending FROM rsvps WHERE email = :email').get({ email: normEmail });
        let outcome;
        if (existing) {
          db.prepare(`
            UPDATE rsvps SET
              name = :name,
              attending = :attending,
              event_type = :event_type,
              first_course_id = :first_course_id,
              main_course_id = :main_course_id,
              dietary_restrictions = :dietary_restrictions,
              updated_at = strftime('%Y-%m-%dT%H:%M:%f','now')
            WHERE id = :id
          `).run({
            id: existing.id, name, attending,
            event_type, first_course_id, main_course_id, dietary_restrictions,
          });
          outcome = { id: existing.id, was_update: true, prev_attending: existing.attending };
        } else {
          const result = db.prepare(`
            INSERT INTO rsvps (name, email, attending, event_type, first_course_id, main_course_id, dietary_restrictions)
            VALUES (:name, :email, :attending, :event_type, :first_course_id, :main_course_id, :dietary_restrictions)
          `).run({
            name, email: normEmail, attending,
            event_type, first_course_id, main_course_id, dietary_restrictions,
          });
          outcome = { id: result.lastInsertRowid, was_update: false, prev_attending: null };
        }
        db.exec('COMMIT');
        return outcome;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    getAllRsvps() {
      return db.prepare(`
        SELECT r.*,
               f.name AS first_course_name,
               m.name AS main_course_name
        FROM rsvps r
        LEFT JOIN menu_items f ON r.first_course_id = f.id
        LEFT JOIN menu_items m ON r.main_course_id  = m.id
        ORDER BY r.id DESC
      `).all();
    },

    getRsvpByEmail(email) {
      const normEmail = String(email || '').trim().toLowerCase();
      if (!normEmail) return null;
      return db.prepare('SELECT * FROM rsvps WHERE email = :email').get({ email: normEmail }) || null;
    },

    // ── menu_items
    insertMenuItem({ course, name, note = null, is_vegan = 0 }) {
      const next = db.prepare(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM menu_items WHERE course = :course'
      ).get({ course }).next_order;
      return db.prepare(`
        INSERT INTO menu_items (course, name, note, is_vegan, sort_order)
        VALUES (:course, :name, :note, :is_vegan, :sort_order)
      `).run({ course, name, note, is_vegan: is_vegan ? 1 : 0, sort_order: next });
    },

    getMenuItems(course) {
      if (course) {
        return db.prepare(
          'SELECT * FROM menu_items WHERE course = :course ORDER BY sort_order ASC'
        ).all({ course });
      }
      return db.prepare(
        'SELECT * FROM menu_items ORDER BY course ASC, sort_order ASC'
      ).all();
    },

    getMenuItemById(id) {
      return db.prepare('SELECT * FROM menu_items WHERE id = :id').get({ id }) || null;
    },

    updateMenuItemVegan(id, is_vegan) {
      return db.prepare(
        'UPDATE menu_items SET is_vegan = :is_vegan WHERE id = :id'
      ).run({ id, is_vegan: is_vegan ? 1 : 0 });
    },

    countRsvpsForMenuItem(id) {
      return db.prepare(
        'SELECT COUNT(*) AS n FROM rsvps WHERE first_course_id = :id OR main_course_id = :id'
      ).get({ id }).n;
    },

    deleteMenuItem(id) {
      const item = db.prepare('SELECT * FROM menu_items WHERE id = :id').get({ id });
      if (!item) return { changes: 0, blocked: false };
      const refs = db.prepare(
        'SELECT COUNT(*) AS n FROM rsvps WHERE first_course_id = :id OR main_course_id = :id'
      ).get({ id }).n;
      if (refs > 0) return { changes: 0, blocked: true };
      let result;
      db.exec('BEGIN');
      try {
        result = db.prepare('DELETE FROM menu_items WHERE id = :id').run({ id });
        // Compact sort_order for the remaining items in the same course.
        const remaining = db.prepare(
          'SELECT id FROM menu_items WHERE course = :course ORDER BY sort_order ASC'
        ).all({ course: item.course });
        const upd = db.prepare('UPDATE menu_items SET sort_order = :so WHERE id = :id');
        remaining.forEach((r, idx) => upd.run({ so: idx, id: r.id }));
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return { changes: result.changes, blocked: false };
    },

    reorderMenuItems(course, orderedIds) {
      const existing = db.prepare(
        'SELECT id FROM menu_items WHERE course = :course'
      ).all({ course }).map(r => r.id);
      const sameSet = existing.length === orderedIds.length
        && existing.every(id => orderedIds.includes(id));
      if (!sameSet) return { ok: false };
      db.exec('BEGIN');
      try {
        const upd = db.prepare('UPDATE menu_items SET sort_order = :so WHERE id = :id AND course = :course');
        orderedIds.forEach((id, idx) => upd.run({ so: idx, id, course }));
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return { ok: true };
    },

    // ── registry_items
    insertRegistryItem({ title, description = null, unclaimable = 0 }) {
      return db.prepare(
        'INSERT INTO registry_items (title, description, unclaimable) VALUES (:title, :description, :unclaimable)'
      ).run({ title, description, unclaimable: unclaimable ? 1 : 0 });
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
        'UPDATE registry_items SET claimed_by_rsvp_id = :rsvpId WHERE id = :itemId AND claimed_by_rsvp_id IS NULL'
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
    // Test-only helper. PRAGMA does not accept bound parameters in SQLite,
    // so we allowlist a simple-identifier shape instead.
    _tableInfo(name) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`_tableInfo: invalid table name ${name}`);
      }
      return db.prepare(`PRAGMA table_info(${name})`).all();
    },
    close() { db.close(); },
  };
}

module.exports = { initDb };
