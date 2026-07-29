const express = require('express');
const { requireAuth } = require('../middleware/auth');

const MAX_TABLE_NAME = 60;
const MAX_GUEST_NAME = 120;

// node:sqlite throws RangeError on reading back an integer outside the JS safe
// range, so an unbounded table_number would poison every later read of the row
// — including the SELECT * that PATCH and DELETE rely on, leaving the row
// unremovable through the API. A wedding has well under 999 tables.
const MAX_TABLE_NUMBER = 999;

const isValidTableNumber = (n) =>
  Number.isSafeInteger(n) && n >= 1 && n <= MAX_TABLE_NUMBER;

// Strips characters that render as nothing but survive trim(): C0/C1 controls,
// zero-width and bidi marks, and unpaired surrogates. Without this, a name that
// is nothing but a BEL or a zero-width space is truthy and would store as a
// blank chair on the public chart.
const INVISIBLE = new RegExp(
  '[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u2060\uFEFF]'
  + '|[\uD800-\uDBFF](?![\uDC00-\uDFFF])'
  + '|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]',
  'g',
);

// parseInt('1abc') is 1, which would delete a real row for a malformed id.
// Only accept an id that is entirely digits. Scoped to this router.
function parseId(raw) {
  if (!/^\d+$/.test(raw ?? '')) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// SQLITE_CONSTRAINT_UNIQUE. Do not discriminate on err.code or err.message:
// node:sqlite sets code to a generic 'ERR_SQLITE_ERROR' for every failure, and
// the message text ("UNIQUE constraint failed: ...") is not a stable contract.
// errcode is a fixed numeric constant. seating_tables has exactly one unique
// constraint (table_number) and seating_assignments has exactly one (the partial
// index on rsvp_attendee_id), so 2067 is unambiguous on either insert.
const SQLITE_CONSTRAINT_UNIQUE = 2067;

function parseTableName(raw) {
  if (raw == null) return { name: null };
  if (typeof raw !== 'string') return { error: 'invalid_table_name' };
  const trimmed = raw.trim();
  if (trimmed.length > MAX_TABLE_NAME) return { error: 'invalid_table_name' };
  return { name: trimmed ? trimmed : null };
}

function createAdminSeatingRouter(db) {
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    res.json({
      published: db.isSeatingPublished(),
      tables: db.getSeatingTablesWithAssignments(),
      unseated: db.getUnseatedAttendees(),
    });
  });

  router.post('/tables', requireAuth, (req, res) => {
    const { table_number, name } = req.body || {};
    if (!isValidTableNumber(table_number)) {
      return res.status(400).json({ error: 'invalid_table_number' });
    }
    const parsed = parseTableName(name);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    try {
      return res.status(201).json(db.createSeatingTable({ table_number, name: parsed.name }));
    } catch (err) {
      if (err.errcode === SQLITE_CONSTRAINT_UNIQUE) {
        return res.status(409).json({ error: 'table_number_taken' });
      }
      throw err;
    }
  });

  router.patch('/tables/:id', requireAuth, (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'invalid_id' });

    const existing = db.getSeatingTableById(id);
    if (!existing) return res.status(404).json({ error: 'table_not_found' });

    const table_number = req.body?.table_number ?? existing.table_number;
    if (!isValidTableNumber(table_number)) {
      return res.status(400).json({ error: 'invalid_table_number' });
    }
    const parsed = 'name' in (req.body || {})
      ? parseTableName(req.body.name)
      : { name: existing.name };
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    try {
      db.updateSeatingTable(id, { table_number, name: parsed.name });
    } catch (err) {
      if (err.errcode === SQLITE_CONSTRAINT_UNIQUE) {
        return res.status(409).json({ error: 'table_number_taken' });
      }
      throw err;
    }
    res.json(db.getSeatingTableById(id));
  });

  router.delete('/tables/:id', requireAuth, (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'invalid_id' });
    if (!db.getSeatingTableById(id)) return res.status(404).json({ error: 'table_not_found' });
    db.deleteSeatingTable(id);
    res.status(204).end();
  });

  router.put('/published', requireAuth, (req, res) => {
    const { published } = req.body || {};
    if (typeof published !== 'boolean') {
      return res.status(400).json({ error: 'invalid_published' });
    }
    db.setSetting('seating_published', published ? '1' : '0');
    res.json({ published });
  });

  // An assignment is either a linked attendee or a manually typed name, never
  // both — the table has a CHECK enforcing that. Everything is validated here
  // first so the CHECK is unreachable from HTTP.
  router.post('/assignments', requireAuth, (req, res) => {
    const { table_id, rsvp_attendee_id = null, guest_name = null } = req.body || {};
    if (!Number.isInteger(table_id) || table_id <= 0) {
      return res.status(400).json({ error: 'invalid_table_id' });
    }

    const hasAttendee = rsvp_attendee_id != null;
    const hasName = guest_name != null;
    if (hasAttendee === hasName) {
      return res.status(400).json({ error: 'invalid_assignment_target' });
    }

    let cleanName = null;
    if (hasName) {
      if (typeof guest_name !== 'string') {
        return res.status(400).json({ error: 'invalid_guest_name' });
      }
      cleanName = guest_name.replace(INVISIBLE, '').trim();
      if (!cleanName || cleanName.length > MAX_GUEST_NAME) {
        return res.status(400).json({ error: 'invalid_guest_name' });
      }
    }
    if (hasAttendee && !Number.isInteger(rsvp_attendee_id)) {
      return res.status(400).json({ error: 'invalid_assignment_target' });
    }

    if (!db.getSeatingTableById(table_id)) {
      return res.status(404).json({ error: 'table_not_found' });
    }
    // Seatable, not merely existent: a ceremony-only or evening-only guest is
    // never offered in the unseated list and must not be seatable either.
    if (hasAttendee && !db.getSeatableAttendeeById(rsvp_attendee_id)) {
      return res.status(404).json({ error: 'attendee_not_found' });
    }

    try {
      const created = db.createSeatingAssignment({
        table_id,
        rsvp_attendee_id: hasAttendee ? rsvp_attendee_id : null,
        guest_name: cleanName,
      });
      return res.status(201).json(created);
    } catch (err) {
      if (err.errcode === SQLITE_CONSTRAINT_UNIQUE) {
        return res.status(409).json({ error: 'already_seated' });
      }
      throw err;
    }
  });

  router.delete('/assignments/:id', requireAuth, (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'invalid_id' });
    const result = db.deleteSeatingAssignment(id);
    if (result.changes === 0) return res.status(404).json({ error: 'assignment_not_found' });
    res.status(204).end();
  });

  return router;
}

module.exports = createAdminSeatingRouter;
