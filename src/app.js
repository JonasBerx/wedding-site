const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');
const createRsvpRouter = require('./routes/rsvp');
const createInviteRouter = require('./routes/invite');
const createAdminRouter = require('./routes/admin');
const createRegistryRouter = require('./routes/registry');
const createMenuRouter = require('./routes/menu');
const createPhotosRouter = require('./routes/photos');
const createAdminPhotosRouter = require('./routes/adminPhotos');
const { createAdminMenuRouter } = createMenuRouter;
const { errorHandler } = require('./middleware/errorHandler');

function createApp(db, opts = {}) {
  const mediaDir = opts.mediaDir || './media';
  const cookieSecret = process.env.COOKIE_SECRET || 'dev-cookie-secret';

  const app = express();
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  }));
  app.use(express.json());
  app.use(cookieParser(cookieSecret));
  if (process.env.FRONTEND_URL) {
    app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  }

  app.use('/api/rsvp', createRsvpRouter(db));
  app.use('/api/invite', createInviteRouter(db));
  app.use('/api/admin', createAdminRouter(db));
  app.use('/api/registry', createRegistryRouter(db));
  app.use('/api/menu', createMenuRouter(db));
  app.use('/api/admin/menu', createAdminMenuRouter(db));
  app.use('/api/photos', createPhotosRouter(db, { mediaDir }));
  app.use('/api/admin/photos', createAdminPhotosRouter(db, { mediaDir }));
  app.use('/media', createPhotosRouter.mediaRouter(db, { mediaDir }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  const distDir = path.join(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
