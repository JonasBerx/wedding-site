const express = require('express');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createRsvpRouter(db) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { name, email, attending, event_type, is_vegan, meal_preference, dietary_restrictions } = req.body;

    const trimmedName  = typeof name  === 'string' ? name.trim()  : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    if (!trimmedName || !trimmedEmail || typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'name, email, and attending (boolean) are required' });
    }

    if (!EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }

    let dbEventType = null;
    let dbIsVegan   = null;
    let dbMeal      = null;

    if (attending) {
      if (event_type !== 'full' && event_type !== 'ceremony_party') {
        return res.status(400).json({ error: "event_type must be 'full' or 'ceremony_party'" });
      }
      dbEventType = event_type;

      if (event_type === 'full') {
        dbIsVegan = is_vegan === true ? 1 : 0;
        if (!is_vegan) {
          if (meal_preference !== 1 && meal_preference !== 2) {
            return res.status(400).json({ error: 'meal_preference must be 1 (veggie) or 2 (meat) for full-day non-vegan guests' });
          }
          dbMeal = meal_preference;
        }
      }
    }

    try {
      db.insertRsvp({
        name: trimmedName,
        email: trimmedEmail,
        attending: attending ? 1 : 0,
        event_type: dbEventType,
        is_vegan: dbIsVegan,
        meal_preference: dbMeal,
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
