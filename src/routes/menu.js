const express = require('express');

function publicShape(item) {
  return {
    id: item.id,
    course: item.course,
    name: item.name,
    note: item.note,
    is_vegan: item.is_vegan,
  };
}

function createMenuRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(db.getMenuItems().map(publicShape));
  });

  return router;
}

module.exports = createMenuRouter;
