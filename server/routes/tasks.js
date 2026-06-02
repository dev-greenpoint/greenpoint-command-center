const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  db.run('UPDATE tasks SET status=? WHERE id=?', [status, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
