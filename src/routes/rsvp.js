const express = require('express');

function createRsvpRouter(db) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { name, email, attending, meal_preference, dietary_restrictions } = req.body;

    if (!name || !email || attending === undefined || attending === null) {
      return res.status(400).json({ error: 'name, email, and attending are required' });
    }

    try {
      db.insertRsvp({
        name,
        email,
        attending: attending ? 1 : 0,
        meal_preference: meal_preference || null,
        dietary_restrictions: dietary_restrictions || null,
      });
      res.status(201).json({ message: 'RSVP received' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save RSVP' });
    }
  });

  return router;
}

module.exports = createRsvpRouter;
