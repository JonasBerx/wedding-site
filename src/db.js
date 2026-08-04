const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

function _generateInviteToken() {
  return crypto.randomBytes(16).toString('base64url');
}

// Reconcile a party's attendee rows in place. rsvp_attendees.id is referenced
// by the seating feature, so a guest editing their RSVP must not churn ids:
// re-inserting would cascade their seat away silently. Match each submitted
// person to their existing row by name first, so that a drop-out, a reorder or
// a corrected typo all keep the right person on the right row.
//
// Pass 2 cannot tell a rename from a substitution — ['Alice','Bob'] becoming
// ['Bob','Cara'] looks identical whether Alice was renamed or replaced by Cara.
// It deliberately reads a same-size swap as a rename, so the row and its seat
// are retained by whoever takes that slot. Only a net shrink leaves rows
// unclaimed, and those are the ones freed at the end.
function reconcileAttendees(db, rsvpId, desired) {
  const available = db.prepare(
    'SELECT id, name FROM rsvp_attendees WHERE rsvp_id = :id ORDER BY position'
  ).all({ id: rsvpId });

  const claimedIdFor = new Array(desired.length).fill(null);
  const norm = (s) => String(s ?? '').trim().toLowerCase();

  // Pass 1: the same person, wherever they moved to in the list.
  desired.forEach((a, idx) => {
    const at = available.findIndex(r => norm(r.name) === norm(a.name));
    if (at !== -1) claimedIdFor[idx] = available.splice(at, 1)[0].id;
  });

  // Pass 2: leftover rows absorb renames and typo corrections, in list order.
  desired.forEach((a, idx) => {
    if (claimedIdFor[idx] == null && available.length > 0) {
      claimedIdFor[idx] = available.shift().id;
    }
  });

  const upd = db.prepare(`
    UPDATE rsvp_attendees SET
      position = :position,
      name = :name,
      first_course_id = :first_course_id,
      main_course_id = :main_course_id,
      dietary_restrictions = :dietary_restrictions
    WHERE id = :id AND rsvp_id = :rsvp_id
  `);
  const ins = db.prepare(`
    INSERT INTO rsvp_attendees (rsvp_id, position, name, first_course_id, main_course_id, dietary_restrictions)
    VALUES (:rsvp_id, :position, :name, :first_course_id, :main_course_id, :dietary_restrictions)
  `);

  // Positions are transiently duplicated inside this loop: a row still holding
  // position N is only rewritten when its own turn comes, so a reorder or a
  // mid-list insert has two rows sharing a position part-way through. Do NOT
  // add a UNIQUE(rsvp_id, position) index — it would abort those edits.
  desired.forEach((a, idx) => {
    const fields = {
      rsvp_id: rsvpId,
      position: idx + 1,
      name: a.name,
      first_course_id: a.first_course_id ?? null,
      main_course_id:  a.main_course_id  ?? null,
      dietary_restrictions: a.dietary_restrictions ?? null,
    };
    if (claimedIdFor[idx] != null) upd.run({ ...fields, id: claimedIdFor[idx] });
    else ins.run(fields);
  });

  const del = db.prepare('DELETE FROM rsvp_attendees WHERE id = :id');
  for (const row of available) del.run({ id: row.id });
}

// Attendee rows in the admin shape — menu names resolved, ids included.
// Shared by getAllRsvps and getAdminRsvpById so the two cannot drift apart.
function adminAttendeeRows(db, rsvpIds) {
  if (rsvpIds.length === 0) return [];
  const placeholders = rsvpIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT a.*,
           f.name AS first_course_name,
           m.name AS main_course_name
    FROM rsvp_attendees a
    LEFT JOIN menu_items f ON a.first_course_id = f.id
    LEFT JOIN menu_items m ON a.main_course_id  = m.id
    WHERE a.rsvp_id IN (${placeholders})
    ORDER BY a.rsvp_id, a.position
  `).all(...rsvpIds);
}

function initDb(path = 'rsvps.db') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');

  // ── rsvps schema migration. Older databases may predate the
  // `updated_at` column and/or the `rsvp_attendees` table. These are
  // migrated in place below (ALTER TABLE / CREATE TABLE IF NOT EXISTS) —
  // existing guest RSVP data must never be dropped.
  const tableNames = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(r => r.name);
  const rsvpCols = tableNames.includes('rsvps')
    ? db.prepare('PRAGMA table_info(rsvps)').all().map(c => c.name)
    : [];
  const hasUpdatedAt = rsvpCols.includes('updated_at');
  const hasAttendeesTable = tableNames.includes('rsvp_attendees');

  if (rsvpCols.length > 0 && !hasUpdatedAt) {
    // Backfill with the current time for pre-existing rows; new rows are
    // written explicitly by upsertRsvp/touchRsvp going forward.
    db.exec("ALTER TABLE rsvps ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP");
  }

  if (!hasAttendeesTable) {
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
      song TEXT,
      submitted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
      updated_at TEXT
    )
  `);

  // Idempotent migration for existing rsvps tables created before `song` was added.
  const rsvpColsNow = db.prepare('PRAGMA table_info(rsvps)').all().map(c => c.name);
  if (!rsvpColsNow.includes('song')) {
    db.exec('ALTER TABLE rsvps ADD COLUMN song TEXT');
  }

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

  // ── invite_tokens event_type migration.
  // The original CHECK allowed only ('full','ceremony_party'). SQLite cannot
  // ALTER a CHECK constraint, so when an old table is detected we rebuild it
  // with the new ('full','ceremony','evening') constraint, preserving all rows.
  const inviteTokensSql = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'"
  ).get();
  if (inviteTokensSql && inviteTokensSql.sql.includes('ceremony_party')) {
    db.exec('BEGIN');
    try {
      db.exec(`
        CREATE TABLE invite_tokens_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          token           TEXT NOT NULL UNIQUE,
          event_type      TEXT NOT NULL CHECK (event_type IN ('full','ceremony','evening')),
          max_party_size  INTEGER NOT NULL CHECK (max_party_size BETWEEN 1 AND 6),
          label           TEXT,
          status          TEXT NOT NULL CHECK (status IN ('open','consumed','released')) DEFAULT 'open',
          rsvp_id         INTEGER REFERENCES rsvps(id) ON DELETE SET NULL,
          created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
          consumed_at     TEXT
        )
      `);
      db.exec(`INSERT INTO invite_tokens_new
        (id, token, event_type, max_party_size, label, status, rsvp_id, created_at, consumed_at)
        SELECT id, token, event_type, max_party_size, label, status, rsvp_id, created_at, consumed_at
        FROM invite_tokens`);
      db.exec('DROP TABLE invite_tokens');
      db.exec('ALTER TABLE invite_tokens_new RENAME TO invite_tokens');
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS invite_tokens (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      token           TEXT NOT NULL UNIQUE,
      event_type      TEXT NOT NULL CHECK (event_type IN ('full','ceremony','evening')),
      max_party_size  INTEGER NOT NULL CHECK (max_party_size BETWEEN 1 AND 6),
      label           TEXT,
      status          TEXT NOT NULL CHECK (status IN ('open','consumed','released')) DEFAULT 'open',
      rsvp_id         INTEGER REFERENCES rsvps(id) ON DELETE SET NULL,
      created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
      consumed_at     TEXT
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS invite_tokens_rsvp_id ON invite_tokens(rsvp_id)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_photos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      media_type      TEXT    NOT NULL CHECK (media_type IN ('photo','video')),
      filename        TEXT    NOT NULL UNIQUE,
      thumb_filename  TEXT    NOT NULL,
      mime_type       TEXT    NOT NULL,
      width           INTEGER,
      height          INTEGER,
      duration_sec    REAL,
      size_bytes      INTEGER NOT NULL,
      caption         TEXT,
      uploader_name   TEXT,
      hidden          INTEGER NOT NULL DEFAULT 0,
      uploaded_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_guest_photos_visible_uploaded
            ON guest_photos (hidden, uploaded_at DESC, id DESC)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS seating_tables (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL UNIQUE,
      name         TEXT,
      created_at   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS seating_assignments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id         INTEGER NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
      rsvp_attendee_id INTEGER REFERENCES rsvp_attendees(id) ON DELETE CASCADE,
      guest_name       TEXT,
      position         INTEGER NOT NULL DEFAULT 0,
      CHECK ((rsvp_attendee_id IS NULL) <> (guest_name IS NULL))
    )
  `);

  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS seating_assignments_attendee
            ON seating_assignments(rsvp_attendee_id) WHERE rsvp_attendee_id IS NOT NULL`);
  db.exec(`CREATE INDEX IF NOT EXISTS seating_assignments_table
            ON seating_assignments(table_id)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )
  `);

  // Shared by the getSetting method and isSeatingPublished, so neither has to
  // reach for `this` (which would break if a method is destructured off).
  const getSetting = (key) => {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = :key').get({ key });
    return row ? row.value : null;
  };

  // Local (not `this`-bound) so the rename methods can reuse it even when
  // they are destructured off the returned object.
  const getAdminRsvpById = (id) => {
    if (!Number.isInteger(id)) return null;
    const row = db.prepare('SELECT * FROM rsvps WHERE id = :id').get({ id });
    if (!row) return null;
    return { ...row, attendees: adminAttendeeRows(db, [row.id]) };
  };

  // Single write path for the lead name so renameRsvpLead and renameAttendee
  // cannot drift on how name and updated_at are written together.
  const touchRsvp = (rsvpId, name = undefined) => {
    if (name === undefined) {
      db.prepare(`
        UPDATE rsvps
           SET updated_at = strftime('%Y-%m-%dT%H:%M:%f','now')
         WHERE id = :id
      `).run({ id: rsvpId });
      return;
    }
    db.prepare(`
      UPDATE rsvps
         SET name = :name,
             updated_at = strftime('%Y-%m-%dT%H:%M:%f','now')
       WHERE id = :id
    `).run({ id: rsvpId, name });
  };

  return {
    insertRsvp({ name, email, attending, event_type = null, dietary_restrictions = null }) {
      return db.prepare(`
        INSERT INTO rsvps (name, email, attending, event_type, dietary_restrictions)
        VALUES (:name, :email, :attending, :event_type, :dietary_restrictions)
      `).run({ name, email, attending, event_type, dietary_restrictions });
    },

    upsertRsvp({ name, email, attending, event_type = null, dietary_restrictions = null, song = null, attendees = [] }, opts = {}) {
      const { consumeInviteId = null } = opts;
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
              dietary_restrictions = :dietary_restrictions,
              song = :song,
              updated_at = strftime('%Y-%m-%dT%H:%M:%f','now')
            WHERE id = :id
          `).run({ id: existing.id, name, attending, event_type, dietary_restrictions, song });
          outcome = { id: existing.id, was_update: true, prev_attending: existing.attending };
        } else {
          const result = db.prepare(`
            INSERT INTO rsvps (name, email, attending, event_type, dietary_restrictions, song)
            VALUES (:name, :email, :attending, :event_type, :dietary_restrictions, :song)
          `).run({ name, email: normEmail, attending, event_type, dietary_restrictions, song });
          outcome = { id: result.lastInsertRowid, was_update: false, prev_attending: null };
        }

        reconcileAttendees(db, outcome.id, (attending === 1 && Array.isArray(attendees)) ? attendees : []);

        let invite_consumed = false;
        if (consumeInviteId != null) {
          const result = db.prepare(`
            UPDATE invite_tokens
               SET status = 'consumed',
                   rsvp_id = :rsvpId,
                   consumed_at = strftime('%Y-%m-%dT%H:%M:%f','now')
             WHERE id = :inviteId
               AND status IN ('open','released')
          `).run({ rsvpId: outcome.id, inviteId: consumeInviteId });
          if (result.changes === 0) {
            throw new Error('invite_already_used');
          }
          invite_consumed = true;
        }

        db.exec('COMMIT');
        return { ...outcome, invite_consumed };
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    getAllRsvps() {
      const rsvps = db.prepare(`SELECT * FROM rsvps ORDER BY id DESC`).all();
      if (rsvps.length === 0) return [];
      const attendees = adminAttendeeRows(db, rsvps.map(r => r.id));
      const grouped = new Map(rsvps.map(r => [r.id, []]));
      for (const a of attendees) grouped.get(a.rsvp_id).push(a);
      return rsvps.map(r => ({ ...r, attendees: grouped.get(r.id) }));
    },

    getAdminRsvpById,

    // Admin corrections. Deliberately NOT routed through upsertRsvp: its
    // reconcileAttendees matches people by name and cannot tell a rename from a
    // substitution (see the comment at the top of this file). A targeted UPDATE
    // also leaves rsvp_attendees.id alone, so seating assignments survive.
    //
    // The guest route pins attendee position 1 to the lead name
    // (src/routes/rsvp.js), so both sides move together here — otherwise a later
    // guest re-submit would silently undo half the correction.
    renameRsvpLead(rsvpId, name) {
      if (!Number.isInteger(rsvpId)) return null;
      db.exec('BEGIN IMMEDIATE');
      try {
        const row = db.prepare('SELECT id FROM rsvps WHERE id = :id').get({ id: rsvpId });
        if (!row) {
          db.exec('ROLLBACK');
          return null;
        }
        touchRsvp(rsvpId, name);
        db.prepare(
          'UPDATE rsvp_attendees SET name = :name WHERE rsvp_id = :id AND position = 1'
        ).run({ id: rsvpId, name });
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return getAdminRsvpById(rsvpId);
    },

    renameAttendee(rsvpId, attendeeId, name) {
      if (!Number.isInteger(rsvpId) || !Number.isInteger(attendeeId)) return null;
      db.exec('BEGIN IMMEDIATE');
      try {
        const row = db.prepare(
          'SELECT id, position FROM rsvp_attendees WHERE id = :id AND rsvp_id = :rsvp_id'
        ).get({ id: attendeeId, rsvp_id: rsvpId });
        if (!row) {
          db.exec('ROLLBACK');
          return null;
        }
        db.prepare(
          'UPDATE rsvp_attendees SET name = :name WHERE id = :id AND rsvp_id = :rsvp_id'
        ).run({ id: attendeeId, rsvp_id: rsvpId, name });
        if (row.position === 1) {
          touchRsvp(rsvpId, name);
        } else {
          touchRsvp(rsvpId);
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return getAdminRsvpById(rsvpId);
    },

    getEmailByRsvpId(id) {
      if (!Number.isInteger(id)) return null;
      const row = db.prepare('SELECT email FROM rsvps WHERE id = :id').get({ id });
      return row ? row.email : null;
    },

    getRsvpByEmail(email) {
      const normEmail = String(email || '').trim().toLowerCase();
      if (!normEmail) return null;
      const row = db.prepare('SELECT * FROM rsvps WHERE email = :email').get({ email: normEmail });
      if (!row) return null;
      const attendees = db.prepare(
        'SELECT position, name, first_course_id, main_course_id, dietary_restrictions FROM rsvp_attendees WHERE rsvp_id = :id ORDER BY position'
      ).all({ id: row.id });
      return { ...row, attendees };
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
        'SELECT COUNT(*) AS n FROM rsvp_attendees WHERE first_course_id = :id OR main_course_id = :id'
      ).get({ id }).n;
    },

    deleteMenuItem(id) {
      const item = db.prepare('SELECT * FROM menu_items WHERE id = :id').get({ id });
      if (!item) return { changes: 0, blocked: false };
      const refs = db.prepare(
        'SELECT COUNT(*) AS n FROM rsvp_attendees WHERE first_course_id = :id OR main_course_id = :id'
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

    // ── seating_tables
    createSeatingTable({ table_number, name = null }) {
      const result = db.prepare(
        'INSERT INTO seating_tables (table_number, name) VALUES (:table_number, :name)'
      ).run({ table_number, name });
      return { id: Number(result.lastInsertRowid), table_number, name };
    },

    getSeatingTables() {
      return db.prepare('SELECT * FROM seating_tables ORDER BY table_number ASC').all();
    },

    getSeatingTableById(id) {
      return db.prepare('SELECT * FROM seating_tables WHERE id = :id').get({ id }) || null;
    },

    // Full replace: omitting `name` clears it. Callers doing partial updates
    // must read the current row first.
    updateSeatingTable(id, { table_number, name = null }) {
      return db.prepare(
        'UPDATE seating_tables SET table_number = :table_number, name = :name WHERE id = :id'
      ).run({ id, table_number, name });
    },

    deleteSeatingTable(id) {
      return db.prepare('DELETE FROM seating_tables WHERE id = :id').run({ id });
    },

    // ── seating_assignments
    createSeatingAssignment({ table_id, rsvp_attendee_id = null, guest_name = null }) {
      const next = db.prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM seating_assignments WHERE table_id = :table_id'
      ).get({ table_id }).next_pos;
      const result = db.prepare(`
        INSERT INTO seating_assignments (table_id, rsvp_attendee_id, guest_name, position)
        VALUES (:table_id, :rsvp_attendee_id, :guest_name, :position)
      `).run({ table_id, rsvp_attendee_id, guest_name, position: next });
      return { id: Number(result.lastInsertRowid) };
    },

    deleteSeatingAssignment(id) {
      return db.prepare('DELETE FROM seating_assignments WHERE id = :id').run({ id });
    },

    getSeatingTablesWithAssignments() {
      const tables = db.prepare('SELECT * FROM seating_tables ORDER BY table_number ASC').all();
      if (tables.length === 0) return [];
      const rows = db.prepare(`
        SELECT sa.id, sa.table_id, sa.position, sa.rsvp_attendee_id,
               COALESCE(sa.guest_name, ra.name) AS display_name
        FROM seating_assignments sa
        LEFT JOIN rsvp_attendees ra ON ra.id = sa.rsvp_attendee_id
        ORDER BY sa.table_id, sa.position
      `).all();
      const grouped = new Map(tables.map(t => [t.id, []]));
      for (const r of rows) {
        if (!grouped.has(r.table_id)) continue;
        grouped.get(r.table_id).push({
          id: r.id,
          display_name: r.display_name,
          rsvp_attendee_id: r.rsvp_attendee_id,
          position: r.position,
        });
      }
      // Alphabetical for guests scanning without a search box; position breaks ties.
      for (const list of grouped.values()) {
        list.sort((a, b) =>
          a.display_name.localeCompare(b.display_name, 'nl', { sensitivity: 'base' })
          || a.position - b.position);
      }
      return tables.map(t => ({
        id: t.id,
        table_number: t.table_number,
        name: t.name,
        assignments: grouped.get(t.id),
      }));
    },

    // Seats are freed by attendee-row deletion: cancelling an RSVP reconciles the
    // party to zero rows and the FK cascade removes the assignments, and the same
    // holds when an invite is released. rsvps.event_type is locked at the route
    // (src/routes/rsvp.js), so a guest cannot downgrade full -> evening/ceremony
    // and strand a seat here.
    getUnseatedAttendees() {
      return db.prepare(`
        SELECT ra.id AS rsvp_attendee_id, ra.name AS name, r.name AS party_name
        FROM rsvp_attendees ra
        JOIN rsvps r ON r.id = ra.rsvp_id
        WHERE r.attending = 1
          AND r.event_type = 'full'
          AND NOT EXISTS (
            SELECT 1 FROM seating_assignments sa WHERE sa.rsvp_attendee_id = ra.id
          )
        ORDER BY r.name, ra.position
      `).all();
    },

    // Write-side counterpart to getUnseatedAttendees: same "dinner guest"
    // predicate, so an attendee that never appears in the unseated list can
    // never be seated through the API either.
    getSeatableAttendeeById(id) {
      return db.prepare(`
        SELECT ra.*
        FROM rsvp_attendees ra
        JOIN rsvps r ON r.id = ra.rsvp_id
        WHERE ra.id = :id AND r.attending = 1 AND r.event_type = 'full'
      `).get({ id }) || null;
    },

    // ── app_settings
    getSetting(key) {
      return getSetting(key);
    },

    setSetting(key, value) {
      return db.prepare(`
        INSERT INTO app_settings (key, value) VALUES (:key, :value)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run({ key, value: String(value) });
    },

    isSeatingPublished() {
      return getSetting('seating_published') === '1';
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
    getMealCounts() {
      const firstRows = db.prepare(`
        SELECT m.id   AS menu_item_id,
               m.name AS name,
               m.sort_order,
               COUNT(*) AS count
        FROM rsvp_attendees a
        JOIN rsvps r       ON a.rsvp_id = r.id
        JOIN menu_items m  ON a.first_course_id = m.id
        WHERE r.attending = 1 AND r.event_type = 'full'
        GROUP BY m.id
        ORDER BY m.sort_order ASC, m.id ASC
      `).all().map(r => ({ course: 'first', menu_item_id: r.menu_item_id, name: r.name, count: r.count }));

      const mainRows = db.prepare(`
        SELECT m.id   AS menu_item_id,
               m.name AS name,
               m.sort_order,
               COUNT(*) AS count
        FROM rsvp_attendees a
        JOIN rsvps r       ON a.rsvp_id = r.id
        JOIN menu_items m  ON a.main_course_id = m.id
        WHERE r.attending = 1 AND r.event_type = 'full'
        GROUP BY m.id
        ORDER BY m.sort_order ASC, m.id ASC
      `).all().map(r => ({ course: 'main', menu_item_id: r.menu_item_id, name: r.name, count: r.count }));

      return [...firstRows, ...mainRows];
    },

    // ── invite_tokens
    createInviteToken({ event_type, max_party_size, label = null }) {
      const token = _generateInviteToken();
      const result = db.prepare(`
        INSERT INTO invite_tokens (token, event_type, max_party_size, label)
        VALUES (:token, :event_type, :max_party_size, :label)
      `).run({ token, event_type, max_party_size, label });
      return db.prepare('SELECT * FROM invite_tokens WHERE id = :id')
        .get({ id: result.lastInsertRowid });
    },

    getInviteByToken(token) {
      if (!token || typeof token !== 'string') return null;
      return db.prepare('SELECT * FROM invite_tokens WHERE token = :token').get({ token }) || null;
    },

    getInviteById(id) {
      return db.prepare('SELECT * FROM invite_tokens WHERE id = :id').get({ id }) || null;
    },

    consumeInviteToken(inviteId, rsvpId) {
      const result = db.prepare(`
        UPDATE invite_tokens
        SET status = 'consumed',
            rsvp_id = :rsvpId,
            consumed_at = strftime('%Y-%m-%dT%H:%M:%f','now')
        WHERE id = :inviteId AND status IN ('open','released')
      `).run({ inviteId, rsvpId });
      return result.changes;
    },

    deleteInviteToken(inviteId) {
      const result = db.prepare(
        `DELETE FROM invite_tokens WHERE id = :inviteId AND status = 'open'`
      ).run({ inviteId });
      return result.changes;
    },

    getAllInvitesWithRsvp() {
      return db.prepare(`
        SELECT
          it.*,
          r.email      AS rsvp_email,
          r.name       AS rsvp_lead_name,
          r.attending  AS rsvp_attending,
          COALESCE((SELECT COUNT(*) FROM rsvp_attendees a WHERE a.rsvp_id = r.id), 0) AS rsvp_party_size
        FROM invite_tokens it
        LEFT JOIN rsvps r ON r.id = it.rsvp_id
        ORDER BY it.created_at DESC, it.id DESC
      `).all();
    },

    releaseInviteToken(inviteId) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const inv = db.prepare('SELECT * FROM invite_tokens WHERE id = :id').get({ id: inviteId });
        if (!inv) {
          db.exec('ROLLBACK');
          throw new Error('invite_not_found');
        }
        if (inv.status !== 'consumed') {
          db.exec('COMMIT');
          return { released_gift: null };
        }

        let released_gift = null;
        if (inv.rsvp_id) {
          const claim = db.prepare(
            'SELECT id, title FROM registry_items WHERE claimed_by_rsvp_id = :rid'
          ).get({ rid: inv.rsvp_id });
          if (claim) {
            db.prepare(
              'UPDATE registry_items SET claimed_by_rsvp_id = NULL WHERE id = :id'
            ).run({ id: claim.id });
            released_gift = { title: claim.title };
          }
          // attendees cascade via FK ON DELETE CASCADE (PRAGMA foreign_keys=ON),
          // but explicit delete is harmless safety against pragma-off setups.
          db.prepare('DELETE FROM rsvp_attendees WHERE rsvp_id = :id').run({ id: inv.rsvp_id });
          db.prepare('DELETE FROM rsvps WHERE id = :id').run({ id: inv.rsvp_id });
        }

        db.prepare(`
          UPDATE invite_tokens
             SET status = 'released', rsvp_id = NULL, consumed_at = NULL
           WHERE id = :id
        `).run({ id: inviteId });

        db.exec('COMMIT');
        return { released_gift };
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch (_) { /* no active txn */ }
        throw err;
      }
    },

    insertGuestPhoto({ media_type, filename, thumb_filename, mime_type, width = null, height = null, duration_sec = null, size_bytes, caption = null, uploader_name = null }) {
      const result = db.prepare(`
        INSERT INTO guest_photos (media_type, filename, thumb_filename, mime_type, width, height, duration_sec, size_bytes, caption, uploader_name)
        VALUES (:media_type, :filename, :thumb_filename, :mime_type, :width, :height, :duration_sec, :size_bytes, :caption, :uploader_name)
      `).run({ media_type, filename, thumb_filename, mime_type, width, height, duration_sec, size_bytes, caption, uploader_name });
      const id = result.lastInsertRowid;
      const row = db.prepare('SELECT * FROM guest_photos WHERE id = :id').get({ id });
      return { ...row, id };
    },

    getGuestPhotoById(id) {
      return db.prepare('SELECT * FROM guest_photos WHERE id = :id').get({ id }) || null;
    },

    listVisibleGuestPhotos({ limit = 30, cursor = null } = {}) {
      const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
      let rows;
      if (cursor) {
        const [ts, idStr] = String(cursor).split('|');
        const cursorId = parseInt(idStr, 10);
        rows = db.prepare(`
          SELECT * FROM guest_photos
          WHERE hidden = 0
            AND (uploaded_at < :ts OR (uploaded_at = :ts AND id < :id))
          ORDER BY uploaded_at DESC, id DESC
          LIMIT :limit
        `).all({ ts, id: cursorId, limit: cappedLimit + 1 });
      } else {
        rows = db.prepare(`
          SELECT * FROM guest_photos
          WHERE hidden = 0
          ORDER BY uploaded_at DESC, id DESC
          LIMIT :limit
        `).all({ limit: cappedLimit + 1 });
      }
      const hasMore = rows.length > cappedLimit;
      const items = hasMore ? rows.slice(0, cappedLimit) : rows;
      const next_cursor = hasMore
        ? `${items[items.length - 1].uploaded_at}|${items[items.length - 1].id}`
        : null;
      return { items, next_cursor };
    },

    listAllGuestPhotos() {
      return db.prepare('SELECT * FROM guest_photos ORDER BY uploaded_at DESC, id DESC').all();
    },

    setGuestPhotoHidden(id, hidden) {
      return db.prepare('UPDATE guest_photos SET hidden = :hidden WHERE id = :id')
        .run({ id, hidden: hidden ? 1 : 0 }).changes;
    },

    deleteGuestPhoto(id) {
      return db.prepare('DELETE FROM guest_photos WHERE id = :id').run({ id }).changes;
    },

    getGuestPhotoStats() {
      const r = db.prepare(`
        SELECT COUNT(*) AS total,
               COALESCE(SUM(hidden), 0) AS hidden,
               COALESCE(SUM(size_bytes), 0) AS total_bytes
        FROM guest_photos
      `).get();
      return { total: r.total, hidden: r.hidden, total_bytes: r.total_bytes };
    },

    // Test-only helper. PRAGMA does not accept bound parameters in SQLite,
    // so we allowlist a simple-identifier shape instead.
    _tableInfo(name) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`_tableInfo: invalid table name ${name}`);
      }
      return db.prepare(`PRAGMA table_info(${name})`).all();
    },
    // Test-only: run an arbitrary query. Do not use in production code.
    _rawAll(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    // Test-only: run an arbitrary statement. Do not use in production code.
    _rawRun(sql, ...params) {
      return db.prepare(sql).run(...params);
    },
    // Test-only: raw DatabaseSync handle. Do not use in production code.
    _raw: db,
    close() { db.close(); },
  };
}

module.exports = { initDb, _generateInviteToken };
