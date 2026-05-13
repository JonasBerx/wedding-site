const express = require('express');
const { setGuestCookie } = require('../middleware/guestSession');

function createPhotosRouter(db, _opts = {}) {
  const router = express.Router();

  router.post('/session', (req, res) => {
    const pw = req.body && typeof req.body.password === 'string' ? req.body.password : null;
    if (!pw) return res.status(400).json({ error: 'password required' });
    const expected = process.env.GUEST_UPLOAD_PASSWORD;
    if (!expected || pw !== expected) return res.status(401).json({ error: 'invalid password' });
    setGuestCookie(res);
    return res.status(204).end();
  });

  return router;
}

createPhotosRouter.mediaRouter = function mediaRouter(_db, _opts) {
  return express.Router();
};

module.exports = createPhotosRouter;
