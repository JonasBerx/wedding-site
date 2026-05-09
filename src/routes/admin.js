const express = require('express');
const { requireAuth } = require('../middleware/auth');

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createAdminRouter(db) {
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    const rsvps = db.getAllRsvps();

    const rows = rsvps
      .map(
        (r) => `
        <tr>
          <td>${r.id}</td>
          <td>${escHtml(r.name)}</td>
          <td>${escHtml(r.email)}</td>
          <td>${r.attending ? 'Yes' : 'No'}</td>
          <td>${escHtml(r.meal_preference)}</td>
          <td>${escHtml(r.dietary_restrictions)}</td>
          <td>${escHtml(r.submitted_at)}</td>
        </tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RSVP Admin — Jonas &amp; Dragana</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; color: #333; }
    h1 { margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f5f5f5; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>RSVPs (${rsvps.length})</h1>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Attending</th>
        <th>Meal preference</th>
        <th>Dietary restrictions</th>
        <th>Submitted</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
  });

  return router;
}

module.exports = createAdminRouter;
