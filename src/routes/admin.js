const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createAdminRouter(db) {
  const router = express.Router();

  router.get('/rsvps', requireAuth, (req, res) => {
    res.json(db.getAllRsvps());
  });

  router.get('/registry', requireAuth, (req, res) => {
    res.json(db.getRegistryItemsWithClaimer());
  });

  router.post('/registry', requireAuth, (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const result = db.insertRegistryItem({ title, description: description || null });
    res.status(201).json(db.getRegistryItemById(result.lastInsertRowid));
  });

  router.delete('/registry/:id', requireAuth, (req, res) => {
    const result = db.deleteRegistryItem(Number(req.params.id));
    if (result.changes === 0) return res.status(409).json({ error: 'Item is claimed or does not exist' });
    res.json({ ok: true });
  });

  return router;
}

module.exports = createAdminRouter;
