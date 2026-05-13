const express = require('express');
const { requireAuth } = require('../middleware/auth');

function buildInviteUrl(req, token) {
  const origin = process.env.PUBLIC_SITE_ORIGIN || `${req.protocol}://${req.get('host')}`;
  return `${origin.replace(/\/+$/, '')}/rsvp?invite=${encodeURIComponent(token)}`;
}

function createAdminRouter(db) {
  const router = express.Router();

  router.post('/invites', requireAuth, (req, res) => {
    const { event_type, max_party_size, label } = req.body || {};
    if (event_type !== 'full' && event_type !== 'ceremony_party') {
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

  router.get('/rsvps', requireAuth, (req, res) => {
    res.json(db.getAllRsvps());
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
