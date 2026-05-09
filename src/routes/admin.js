const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createAdminRouter(_db) {
  const router = express.Router();
  router.get('/', requireAuth, (_req, res) => res.status(200).send('Admin'));
  return router;
}

module.exports = createAdminRouter;
