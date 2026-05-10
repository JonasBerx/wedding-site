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
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    const result = db.insertRegistryItem({ title, description: description || null });
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
