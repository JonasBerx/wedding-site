const express = require('express');
const cors = require('cors');
const createRsvpRouter = require('./routes/rsvp');
const createAdminRouter = require('./routes/admin');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
  }));
  app.use('/api/rsvp', createRsvpRouter(db));
  app.use('/admin', createAdminRouter(db));
  return app;
}

module.exports = { createApp };
