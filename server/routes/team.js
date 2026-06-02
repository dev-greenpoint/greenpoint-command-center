const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

router.get('/:clientId/team', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM client_team WHERE client_id=? ORDER BY id', [req.params.clientId]);
  res.json(rows(result));
});

router.post('/:clientId/team', async (req, res) => {
  const db = await getDb();
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.run('INSERT INTO client_team (client_id, name, role) VALUES (?, ?, ?)', [req.params.clientId, name, role || null]);
  saveDb();
  const id = rows(db.exec('SELECT last_insert_rowid() as id'))[0].id;
  res.status(201).json({ id });
});

router.delete('/:clientId/team/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM client_team WHERE id=? AND client_id=?', [req.params.id, req.params.clientId]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
