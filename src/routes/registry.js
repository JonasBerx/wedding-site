const express = require('express');

function createRegistryRouter(db) {
  const router = express.Router();

  router.get('/validate', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const rsvp = db.getRsvpByEmail(email);
    if (!rsvp) return res.status(404).json({ error: 'No RSVP found for that email' });
    const claimed = db.getClaimedItemByRsvpId(rsvp.id);
    res.json({ claimedItemId: claimed ? claimed.id : null });
  });

  router.get('/', (req, res) => {
    const items = db.getAllRegistryItems();
    res.json(items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      claimed: item.claimed_by_rsvp_id !== null,
    })));
  });

  router.post('/claim', (req, res) => {
    const { item_id, email } = req.body;
    if (!item_id || !email) return res.status(400).json({ error: 'item_id and email are required' });

    const rsvp = db.getRsvpByEmail(email);
    if (!rsvp) return res.status(404).json({ error: 'No RSVP found for that email' });

    const existing = db.getClaimedItemByRsvpId(rsvp.id);
    if (existing) return res.status(409).json({ error: 'You already have a claim. Release it first.' });

    const item = db.getRegistryItemById(item_id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.claimed_by_rsvp_id !== null) return res.status(409).json({ error: 'Item is already claimed' });

    const claimResult = db.claimRegistryItem(item_id, rsvp.id);
    if (claimResult.changes === 0) return res.status(409).json({ error: 'Item is already claimed' });
    res.json({ ok: true });
  });

  router.post('/unclaim', (req, res) => {
    const { item_id, email } = req.body;
    if (!item_id || !email) return res.status(400).json({ error: 'item_id and email are required' });

    const rsvp = db.getRsvpByEmail(email);
    if (!rsvp) return res.status(404).json({ error: 'No RSVP found for that email' });

    const item = db.getRegistryItemById(item_id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.claimed_by_rsvp_id !== rsvp.id) return res.status(403).json({ error: 'You do not own this claim' });

    db.unclaimRegistryItem(item_id);
    res.json({ ok: true });
  });

  return router;
}

module.exports = createRegistryRouter;
