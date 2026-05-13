require('dotenv').config();
const { initDb } = require('./db');
const { createApp } = require('./app');
const { ensureMediaDirs } = require('./media/storage');

const mediaDir = process.env.MEDIA_DIR || (process.env.NODE_ENV === 'production' ? '/data/guest-photos' : './media');
ensureMediaDirs(mediaDir);

const db = initDb(process.env.DB_PATH || 'rsvps.db');
const app = createApp(db, { mediaDir });
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Media dir: ${mediaDir}`);
});
