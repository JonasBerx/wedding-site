const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { setGuestCookie, requireGuestSession } = require('../middleware/guestSession');
const { createRateLimiter } = require('../middleware/rateLimit');
const { sniff, isAllowed, isImage, isVideo } = require('../media/sniff');
const { processImage } = require('../media/imageProcessor');
const { processVideo } = require('../media/videoProcessor');
const { ensureMediaDirs, originalPath, thumbPath } = require('../media/storage');

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function toPublic(row) {
  return {
    id: row.id,
    media_type: row.media_type,
    filename: row.filename,
    thumb_filename: row.thumb_filename,
    mime_type: row.mime_type,
    width: row.width,
    height: row.height,
    duration_sec: row.duration_sec,
    size_bytes: row.size_bytes,
    caption: row.caption,
    uploader_name: row.uploader_name,
    uploaded_at: row.uploaded_at,
    media_url: `/media/${row.filename}`,
    thumb_url: `/media/thumbs/${row.thumb_filename}`,
  };
}

function createPhotosRouter(db, opts = {}) {
  const mediaDir = opts.mediaDir || './media';
  ensureMediaDirs(mediaDir);

  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });

  const uploadLimiter = createRateLimiter({
    max: 30,
    windowMs: 10 * 60 * 1000,
    keyFn: (req) => (req.signedCookies && req.signedCookies.guest_upload) ? req.ip : 'anon',
  });

  router.post('/session', (req, res) => {
    const pw = req.body && typeof req.body.password === 'string' ? req.body.password : null;
    if (!pw) return res.status(400).json({ error: 'password required' });
    const expected = process.env.GUEST_UPLOAD_PASSWORD;
    if (!expected || pw !== expected) return res.status(401).json({ error: 'invalid password' });
    setGuestCookie(res);
    return res.status(204).end();
  });

  // Wrap requireGuestSession to drain the request body before rejecting.
  // Without this, supertest/browsers get ECONNRESET when the server closes
  // the socket mid-stream while the client is still uploading a file.
  function requireGuestSessionDrain(req, res, next) {
    if (req.signedCookies && req.signedCookies.guest_upload === 'ok') {
      return next();
    }
    req.resume();
    req.on('end', () => res.status(401).json({ error: 'unauthenticated' }));
  }

  router.post('/',
    requireGuestSessionDrain,
    uploadLimiter,
    (req, res, next) => upload.single('file')(req, res, (err) => {
      if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file_too_large' });
      if (err) return res.status(400).json({ error: err.message || 'upload error' });
      next();
    }),
    async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'file required' });

      const ft = await sniff(req.file.buffer);
      if (!ft || !isAllowed(ft.mime)) {
        return res.status(415).json({ error: 'unsupported_media_type' });
      }

      const caption = typeof req.body.caption === 'string' && req.body.caption.trim()
        ? req.body.caption.trim().slice(0, 300) : null;
      const uploader_name = typeof req.body.uploader_name === 'string' && req.body.uploader_name.trim()
        ? req.body.uploader_name.trim().slice(0, 80) : null;

      let processed;
      try {
        if (isImage(ft.mime)) {
          processed = await processImage(req.file.buffer);
        } else if (isVideo(ft.mime)) {
          processed = await processVideo(req.file.buffer, mediaDir);
        } else {
          return res.status(415).json({ error: 'unsupported_media_type' });
        }
      } catch (err) {
        if (err && err.code === 'video_too_long') {
          return res.status(422).json({ error: 'video_too_long' });
        }
        console.error('Processing failed:', err);
        return res.status(422).json({ error: 'processing_failed' });
      }

      const id = crypto.randomBytes(8).toString('hex');
      const filename = `${id}.${processed.ext}`;
      const thumbFilename = `${id}.jpg`;

      const oPath = originalPath(mediaDir, filename);
      const tPath = thumbPath(mediaDir, thumbFilename);
      try {
        fs.writeFileSync(oPath, processed.buffer);
        fs.writeFileSync(tPath, processed.thumb_buffer);
      } catch (err) {
        try { fs.unlinkSync(oPath); } catch (_) {}
        try { fs.unlinkSync(tPath); } catch (_) {}
        return res.status(500).json({ error: 'write_failed' });
      }

      const row = db.insertGuestPhoto({
        media_type: isVideo(ft.mime) ? 'video' : 'photo',
        filename,
        thumb_filename: thumbFilename,
        mime_type: processed.mime_type,
        width: processed.width,
        height: processed.height,
        duration_sec: processed.duration_sec || null,
        size_bytes: processed.buffer.length,
        caption,
        uploader_name,
      });

      res.status(201).json(toPublic(row));
    });

  router.get('/', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const page = db.listVisibleGuestPhotos({ limit, cursor });
    res.set('Cache-Control', 'no-store');
    res.json({
      items: page.items.map(toPublic),
      next_cursor: page.next_cursor,
    });
  });

  return router;
}

createPhotosRouter.toPublic = toPublic;

createPhotosRouter.mediaRouter = function mediaRouter(db, opts = {}) {
  const mediaDir = opts.mediaDir || './media';
  const router = express.Router();
  const { assertSafeName } = require('../media/storage');

  function findVisibleByFilename(filename, kind) {
    const col = kind === 'thumb' ? 'thumb_filename' : 'filename';
    const row = db._raw.prepare(`SELECT * FROM guest_photos WHERE ${col} = :f AND hidden = 0`).get({ f: filename });
    return row || null;
  }

  router.get('/thumbs/:filename', (req, res) => {
    try { assertSafeName(req.params.filename); }
    catch { return res.status(400).json({ error: 'invalid filename' }); }
    const row = findVisibleByFilename(req.params.filename, 'thumb');
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('image/jpeg');
    return res.sendFile(thumbPath(mediaDir, req.params.filename));
  });

  router.get('/:filename', (req, res) => {
    try { assertSafeName(req.params.filename); }
    catch { return res.status(400).json({ error: 'invalid filename' }); }
    const row = findVisibleByFilename(req.params.filename, 'original');
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(row.mime_type);
    return res.sendFile(originalPath(mediaDir, req.params.filename));
  });

  return router;
};

module.exports = createPhotosRouter;
