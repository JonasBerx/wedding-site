const express = require('express');
const cors = require('cors');
const path = require('path');
const createRsvpRouter = require('./routes/rsvp');
const createAdminRouter = require('./routes/admin');
const createRegistryRouter = require('./routes/registry');
const createMenuRouter = require('./routes/menu');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
  }));
  app.use('/api/rsvp', createRsvpRouter(db));
  app.use('/api/admin', createAdminRouter(db));
  app.use('/api/registry', createRegistryRouter(db));
  app.use('/api/menu', createMenuRouter(db));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const distDir = path.join(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  return app;
}

module.exports = { createApp };
