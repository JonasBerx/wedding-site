const express = require('express');

function deadlinePassed() {
  const v = process.env.RSVP_DEADLINE;
  if (!v) return false;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

function createInviteRouter(db) {
  const router = express.Router();

  router.get('/:token', (req, res) => {
    const inv = db.getInviteByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: 'invite_not_found' });

    let rsvp_email = null;
    if (inv.status === 'consumed' && inv.rsvp_id) {
      rsvp_email = db.getEmailByRsvpId(inv.rsvp_id);
    }

    res.json({
      deadline_passed: deadlinePassed(),
      token: inv.token,
      status: inv.status,
      event_type: inv.event_type,
      max_party_size: inv.max_party_size,
      rsvp_email,
    });
  });

  return router;
}

module.exports = createInviteRouter;
