const express = require('express');

function createAdminRouter(_db) {
  const router = express.Router();
  router.get('/', (_req, res) => res.status(501).send('Not implemented'));
  return router;
}

module.exports = createAdminRouter;
