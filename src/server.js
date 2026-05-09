require('dotenv').config();
const { initDb } = require('./db');
const { createApp } = require('./app');

const db = initDb(process.env.DB_PATH || 'rsvps.db');
const app = createApp(db);
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
