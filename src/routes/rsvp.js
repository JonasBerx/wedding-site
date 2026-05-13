const express = require('express');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTENDEES = 6;

const RSVP_PUBLIC_FIELDS = ['name', 'email', 'attending', 'event_type', 'dietary_restrictions'];

function publicShape(r) {
  const out = {};
  for (const k of RSVP_PUBLIC_FIELDS) out[k] = r[k];
  out.attendees = (r.attendees || []).map(a => ({
    position: a.position,
    name: a.name,
    first_course_id: a.first_course_id,
    main_course_id:  a.main_course_id,
    dietary_restrictions: a.dietary_restrictions,
  }));
  return out;
}

function deadlinePassed() {
  const v = process.env.RSVP_DEADLINE;
  if (!v) return false;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

function validateAttendees(db, attendees, eventType) {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return { error: 'attendees array (1..6) required when attending' };
  }
  if (attendees.length > MAX_ATTENDEES) {
    return { error: 'too_many_attendees' };
  }
  const cleaned = [];
  for (const a of attendees) {
    const name = typeof a?.name === 'string' ? a.name.trim() : '';
    if (!name) return { error: 'attendee_name_required' };
    if (name.length > 120) return { error: 'attendee_name_too_long' };

    let firstId = null;
    let mainId = null;
    if (eventType === 'full') {
      if (!Number.isInteger(a.first_course_id) || !Number.isInteger(a.main_course_id)) {
        return { error: 'first_course_id and main_course_id are required for full-day guests' };
      }
      const f = db.getMenuItemById(a.first_course_id);
      const m = db.getMenuItemById(a.main_course_id);
      if (!f || !m) return { error: 'menu_item_not_found' };
      if (f.course !== 'first' || m.course !== 'main') {
        return { error: 'course mismatch: first_course_id must reference a first course, main_course_id a main course' };
      }
      firstId = f.id;
      mainId = m.id;
    }
    const diet = typeof a.dietary_restrictions === 'string' && a.dietary_restrictions.trim()
      ? a.dietary_restrictions.trim() : null;
    cleaned.push({ name, first_course_id: firstId, main_course_id: mainId, dietary_restrictions: diet });
  }
  return { cleaned };
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
    if (deadlinePassed()) return res.status(409).json({ error: 'deadline_passed' });

    const { name, email, attending, event_type, dietary_restrictions, attendees } = req.body;
    const trimmedName  = typeof name  === 'string' ? name.trim()  : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    if (!trimmedName || !trimmedEmail || typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'name, email, and attending (boolean) are required' });
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }

    let dbEventType = null;
    let dbAttendees = [];

    if (attending) {
      if (event_type !== 'full' && event_type !== 'ceremony_party') {
        return res.status(400).json({ error: "event_type must be 'full' or 'ceremony_party'" });
      }
      dbEventType = event_type;
      const v = validateAttendees(db, attendees, event_type);
      if (v.error) return res.status(400).json({ error: v.error });
      dbAttendees = v.cleaned;
      dbAttendees[0].name = trimmedName;
    }

    let result;
    try {
      result = db.upsertRsvp({
        name: trimmedName,
        email: trimmedEmail,
        attending: attending ? 1 : 0,
        event_type: dbEventType,
        dietary_restrictions: typeof dietary_restrictions === 'string' && dietary_restrictions.trim()
          ? dietary_restrictions.trim() : null,
        attendees: dbAttendees,
      });
    } catch (err) {
      console.error('RSVP upsert failed:', err);
      return res.status(500).json({ error: 'Failed to save RSVP' });
    }

    let releasedGift = null;
    if (result.was_update && result.prev_attending === 1 && !attending) {
      try {
        const claim = db.getClaimedItemByRsvpId(result.id);
        if (claim) {
          db.unclaimRegistryItem(claim.id);
          releasedGift = { title: claim.title };
        }
      } catch (err) {
        console.error('Auto-release of registry claim failed:', err);
      }
    }

    const body = { message: 'RSVP received', was_update: result.was_update };
    if (releasedGift) body.released_gift = releasedGift;
    res.status(201).json(body);
  });

  return router;
}

module.exports = createRsvpRouter;
