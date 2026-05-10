const express = require('express');
const { requireAuth } = require('../middleware/auth');

function publicShape(item) {
  return {
    id: item.id,
    course: item.course,
    name: item.name,
    note: item.note,
    is_vegan: item.is_vegan,
  };
}

function adminShape(item, referencedCount) {
  return { ...publicShape(item), sort_order: item.sort_order, referenced_count: referencedCount };
}

function createMenuRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(db.getMenuItems().map(publicShape));
  });

  return router;
}

function createAdminMenuRouter(db) {
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    const items = db.getMenuItems();
    res.json(items.map(i => adminShape(i, db.countRsvpsForMenuItem(i.id))));
  });

  router.post('/reorder', requireAuth, (req, res) => {
    const { course, ordered_ids } = req.body;
    if (course !== 'first' && course !== 'main') {
      return res.status(400).json({ error: "course must be 'first' or 'main'" });
    }
    if (!Array.isArray(ordered_ids) || ordered_ids.some(x => !Number.isInteger(x))) {
      return res.status(400).json({ error: 'ordered_ids must be an array of integers' });
    }
    const result = db.reorderMenuItems(course, ordered_ids);
    if (!result.ok) return res.status(409).json({ error: 'ordered_ids does not match current items for this course' });
    res.json({ ok: true });
  });

  router.post('/', requireAuth, (req, res) => {
    const { course, name, note, is_vegan } = req.body;
    if (course !== 'first' && course !== 'main') {
      return res.status(400).json({ error: "course must be 'first' or 'main'" });
    }
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    const result = db.insertMenuItem({
      course,
      name: name.trim(),
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      is_vegan: is_vegan ? 1 : 0,
    });
    const item = db.getMenuItemById(result.lastInsertRowid);
    res.status(201).json(adminShape(item, 0));
  });

  router.patch('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id must be an integer' });
    if (typeof req.body.is_vegan !== 'boolean') {
      return res.status(400).json({ error: 'is_vegan (boolean) is required' });
    }
    const existing = db.getMenuItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    db.updateMenuItemVegan(id, req.body.is_vegan);
    const item = db.getMenuItemById(id);
    res.json(adminShape(item, db.countRsvpsForMenuItem(id)));
  });

  router.delete('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id must be an integer' });
    const existing = db.getMenuItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    const result = db.deleteMenuItem(id);
    if (result.blocked) return res.status(409).json({ error: 'referenced' });
    res.status(204).end();
  });

  return router;
}

module.exports = createMenuRouter;
module.exports.createAdminMenuRouter = createAdminMenuRouter;
