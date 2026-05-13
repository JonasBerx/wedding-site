require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { initDb } = require('./db');
const { createApp } = require('./app');
const { ensureMediaDirs } = require('./media/storage');

const mediaDir = process.env.MEDIA_DIR || (process.env.NODE_ENV === 'production' ? '/data/guest-photos' : './media');
const dbPath = process.env.DB_PATH || 'rsvps.db';

console.log(`[boot] NODE_ENV=${process.env.NODE_ENV || '(unset)'}`);
console.log(`[boot] DB_PATH=${dbPath}`);
console.log(`[boot] MEDIA_DIR=${mediaDir}`);

ensureMediaDirs(mediaDir);
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const db = initDb(dbPath);
const app = createApp(db, { mediaDir });
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
