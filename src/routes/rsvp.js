const express = require('express');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RSVP_PUBLIC_FIELDS = [
  'name', 'email', 'attending', 'event_type',
  'first_course_id', 'main_course_id', 'dietary_restrictions',
];

function publicShape(r) {
  const out = {};
  for (const k of RSVP_PUBLIC_FIELDS) out[k] = r[k];
  return out;
}

function deadlinePassed() {
  const v = process.env.RSVP_DEADLINE;
  if (!v) return false;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

function createRsvpRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const raw = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    if (!raw) return res.json({ deadline_passed: deadlinePassed(), rsvp: null });
    if (!EMAIL_RE.test(raw)) return res.status(400).json({ error: 'invalid email' });
    const r = db.getRsvpByEmail(raw);
    res.json({ deadline_passed: deadlinePassed(), rsvp: r ? publicShape(r) : null });
  });

  router.post('/', (req, res) => {
    const { name, email, attending, event_type, first_course_id, main_course_id, dietary_restrictions } = req.body;

    const trimmedName  = typeof name  === 'string' ? name.trim()  : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    if (!trimmedName || !trimmedEmail || typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'name, email, and attending (boolean) are required' });
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }

    let dbEventType = null;
    let dbFirstId   = null;
    let dbMainId    = null;

    if (attending) {
      if (event_type !== 'full' && event_type !== 'ceremony_party') {
        return res.status(400).json({ error: "event_type must be 'full' or 'ceremony_party'" });
      }
      dbEventType = event_type;

      if (event_type === 'full') {
        if (!Number.isInteger(first_course_id) || !Number.isInteger(main_course_id)) {
          return res.status(400).json({ error: 'first_course_id and main_course_id are required for full-day guests' });
        }
        const f = db.getMenuItemById(first_course_id);
        const m = db.getMenuItemById(main_course_id);
        if (!f || !m) return res.status(400).json({ error: 'menu_item_not_found' });
        if (f.course !== 'first' || m.course !== 'main') {
          return res.status(400).json({ error: 'course mismatch: first_course_id must reference a first course, main_course_id a main course' });
        }
        dbFirstId = f.id;
        dbMainId  = m.id;
      }
    }

    try {
      db.insertRsvp({
        name: trimmedName,
        email: trimmedEmail,
        attending: attending ? 1 : 0,
        event_type: dbEventType,
        first_course_id: dbFirstId,
        main_course_id:  dbMainId,
        dietary_restrictions: dietary_restrictions || null,
      });
      res.status(201).json({ message: 'RSVP received' });
    } catch (err) {
      console.error('RSVP insert failed:', err);
      res.status(500).json({ error: 'Failed to save RSVP' });
    }
  });

  return router;
}

module.exports = createRsvpRouter;
