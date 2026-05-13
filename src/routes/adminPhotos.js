const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { deleteFiles } = require('../media/storage');
const createPhotosRouter = require('./photos');
const { toPublic } = createPhotosRouter;

function createAdminPhotosRouter(db, opts = {}) {
  const mediaDir = opts.mediaDir || './media';
  const router = express.Router();

  const QRCode = require('qrcode');

  function qrTargetUrl() {
    const base = process.env.PUBLIC_SITE_URL || 'http://localhost:5173';
    const pw = process.env.GUEST_UPLOAD_PASSWORD || '';
    return `${base}/photos?k=${encodeURIComponent(pw)}`;
  }

  router.get('/qr-target', requireAuth, (req, res) => {
    res.json({ url: qrTargetUrl() });
  });

  router.get('/qr.svg', requireAuth, async (req, res) => {
    try {
      const svg = await QRCode.toString(qrTargetUrl(), { type: 'svg', errorCorrectionLevel: 'M', margin: 4 });
      res.type('application/svg+xml').send(svg);
    } catch (err) {
      console.error('QR svg error:', err);
      res.status(500).json({ error: 'qr_failed' });
    }
  });

  router.get('/qr.png', requireAuth, async (req, res) => {
    const requested = parseInt(req.query.size, 10);
    const size = Math.min(Math.max(Number.isInteger(requested) ? requested : 1024, 128), 2048);
    try {
      const buf = await QRCode.toBuffer(qrTargetUrl(), { type: 'png', width: size, errorCorrectionLevel: 'M', margin: 4 });
      res.type('image/png').send(buf);
    } catch (err) {
      console.error('QR png error:', err);
      res.status(500).json({ error: 'qr_failed' });
    }
  });

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
