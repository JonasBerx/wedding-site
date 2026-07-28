const express = require('express');

function createSeatingRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    if (!db.isSeatingPublished()) {
      return res.json({ published: false, tables: [] });
    }
    const tables = db.getSeatingTablesWithAssignments().map(t => ({
      table_number: t.table_number,
      name: t.name,
      guests: t.assignments.map(a => a.display_name),
    }));
    res.json({ published: true, tables });
  });

  return router;
}

module.exports = createSeatingRouter;
