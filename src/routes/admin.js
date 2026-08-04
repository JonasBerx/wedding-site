const express = require('express');
const { requireAuth } = require('../middleware/auth');

function buildInviteUrl(req, token) {
  const origin = process.env.PUBLIC_SITE_ORIGIN || `${req.protocol}://${req.get('host')}`;
  return `${origin.replace(/\/+$/, '')}/rsvp?invite=${encodeURIComponent(token)}`;
}

const MAX_NAME_LEN = 120;

// Same rules the guest route applies (src/routes/rsvp.js), so an admin edit
// cannot produce a name a guest submit would have rejected.
function cleanName(body) {
  const raw = body && typeof body.name === 'string' ? body.name.trim() : '';
  if (!raw || raw.length > MAX_NAME_LEN) return null;
  return raw;
}

function parseId(raw) {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function createAdminRouter(db) {
  const router = express.Router();

  router.post('/invites', requireAuth, (req, res) => {
    const { event_type, max_party_size, label } = req.body || {};
    if (!['full', 'ceremony', 'evening'].includes(event_type)) {
      return res.status(400).json({ error: 'invalid_invite_params' });
    }
    if (!Number.isInteger(max_party_size) || max_party_size < 1 || max_party_size > 6) {
      return res.status(400).json({ error: 'invalid_invite_params' });
    }
    if (label != null && (typeof label !== 'string' || label.length > 120)) {
      return res.status(400).json({ error: 'invalid_invite_params' });
    }
    const inv = db.createInviteToken({
      event_type,
      max_party_size,
      label: label ? label.trim() : null,
    });
    res.status(201).json({ ...inv, url: buildInviteUrl(req, inv.token) });
  });

  router.get('/invites', requireAuth, (req, res) => {
    const rows = db.getAllInvitesWithRsvp();
    res.json({ invites: rows.map(r => ({ ...r, url: buildInviteUrl(req, r.token) })) });
  });

  router.post('/invites/:id/release', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    let result;
    try {
      result = db.releaseInviteToken(id);
    } catch (err) {
      if (err.message === 'invite_not_found') {
        return res.status(404).json({ error: 'invite_not_found' });
      }
      console.error('release invite failed:', err);
      return res.status(500).json({ error: 'release_failed' });
    }
    const inv = db.getInviteById(id);
    res.json({ invite: { ...inv, url: buildInviteUrl(req, inv.token) }, released_gift: result.released_gift });
  });

  router.delete('/invites/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const existing = db.getInviteById(id);
    if (!existing) return res.status(404).json({ error: 'invite_not_found' });
    const changes = db.deleteInviteToken(id);
    if (changes === 0) return res.status(409).json({ error: 'invite_in_use' });
    res.status(204).end();
  });

  router.get('/rsvps', requireAuth, (req, res) => {
    res.json(db.getAllRsvps());
  });

  router.patch('/rsvps/:id', requireAuth, (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'invalid_id' });
    const name = cleanName(req.body);
    if (name === null) return res.status(400).json({ error: 'invalid_name' });

    const rsvp = db.renameRsvpLead(id, name);
    if (!rsvp) return res.status(404).json({ error: 'rsvp_not_found' });
    res.json({ rsvp });
  });

  router.patch('/rsvps/:id/attendees/:attendeeId', requireAuth, (req, res) => {
    const id = parseId(req.params.id);
    const attendeeId = parseId(req.params.attendeeId);
    if (id === null || attendeeId === null) return res.status(400).json({ error: 'invalid_id' });
    const name = cleanName(req.body);
    if (name === null) return res.status(400).json({ error: 'invalid_name' });

    // Distinguish "no such party" from "no such seat in this party" so the
    // dashboard can tell a stale row apart from a bad attendee id.
    if (!db.getAdminRsvpById(id)) return res.status(404).json({ error: 'rsvp_not_found' });

    const rsvp = db.renameAttendee(id, attendeeId, name);
    if (!rsvp) return res.status(404).json({ error: 'attendee_not_found' });
    res.json({ rsvp });
  });

  router.get('/meal-counts', requireAuth, (req, res) => {
    res.json(db.getMealCounts());
  });

  router.get('/registry', requireAuth, (req, res) => {
    res.json(db.getRegistryItemsWithClaimer());
  });

  router.post('/registry', requireAuth, (req, res) => {
    const { title, description, unclaimable } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    const result = db.insertRegistryItem({
      title,
      description: description || null,
      unclaimable: unclaimable ? 1 : 0,
    });
    res.status(201).json(db.getRegistryItemById(result.lastInsertRowid));
  });

  router.delete('/registry/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id must be an integer' });

    const item = db.getRegistryItemById(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const result = db.deleteRegistryItem(id);
    if (result.changes === 0) return res.status(409).json({ error: 'Item is claimed and cannot be deleted' });
    res.json({ ok: true });
  });

  return router;
}

module.exports = createAdminRouter;
