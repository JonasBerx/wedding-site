const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { deleteFiles } = require('../media/storage');
const createPhotosRouter = require('./photos');
const { toPublic } = createPhotosRouter;

function createAdminPhotosRouter(db, opts = {}) {
  const mediaDir = opts.mediaDir || './media';
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    const items = db.listAllGuestPhotos().map(toPublic);
    const stats = db.getGuestPhotoStats();
    res.json({ items, stats });
  });

  router.patch('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });
    if (!db.getGuestPhotoById(id)) return res.status(404).json({ error: 'not_found' });
    const hidden = req.body && req.body.hidden ? 1 : 0;
    db.setGuestPhotoHidden(id, hidden);
    res.json({ ok: true, hidden });
  });

  router.delete('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });
    const row = db.getGuestPhotoById(id);
    if (!row) return res.status(404).json({ error: 'not_found' });
    try { deleteFiles(mediaDir, row.filename, row.thumb_filename); }
    catch (err) { console.error('Failed to delete files:', err); }
    db.deleteGuestPhoto(id);
    res.json({ ok: true });
  });

  return router;
}

module.exports = createAdminPhotosRouter;
