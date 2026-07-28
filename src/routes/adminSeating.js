const express = require('express');
const { requireAuth } = require('../middleware/auth');

const MAX_TABLE_NAME = 60;
const MAX_GUEST_NAME = 120;

// SQLITE_CONSTRAINT_UNIQUE. Do not discriminate on err.code or err.message:
// node:sqlite sets code to a generic 'ERR_SQLITE_ERROR' for every failure, and
// the message text ("UNIQUE constraint failed: ...") is not a stable contract.
// errcode is a fixed numeric constant. seating_tables has exactly one unique
// constraint, so 2067 is unambiguous here.
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
    if (!Number.isInteger(table_number) || table_number < 1) {
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
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    const existing = db.getSeatingTableById(id);
    if (!existing) return res.status(404).json({ error: 'table_not_found' });

    const table_number = req.body?.table_number ?? existing.table_number;
    if (!Number.isInteger(table_number) || table_number < 1) {
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
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });
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

  return router;
}

module.exports = createAdminSeatingRouter;
module.exports.MAX_GUEST_NAME = MAX_GUEST_NAME;
module.exports.SQLITE_CONSTRAINT_UNIQUE = SQLITE_CONSTRAINT_UNIQUE;
