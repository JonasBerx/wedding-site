const express = require('express');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createRsvpRouter(db) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { name, email, attending, meal_preference, dietary_restrictions } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    if (!trimmedName || !trimmedEmail || typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'name, email, and attending (boolean) are required' });
    }

    if (!EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }

    try {
      db.insertRsvp({
        name: trimmedName,
        email: trimmedEmail,
        attending: attending ? 1 : 0,
        meal_preference: meal_preference || null,
        dietary_restrictions: dietary_restrictions || null,
      });
      res.status(201).json({ message: 'RSVP received' });
    } catch (err) {
      console.error('RSVP insert failed:', err);
      res.status(500).json({ error: 'Failed to save RSVP' });
    }
  });

  return router;
}

module.exports = createRsvpRouter;
