const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/:clientId/team', async (req, res) => {
  res.json(await query('SELECT * FROM client_team WHERE client_id=? ORDER BY id', [req.params.clientId]));
});

router.post('/:clientId/team', async (req, res) => {
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const [{ id }] = await query(
    'INSERT INTO client_team (client_id, name, role) VALUES (?, ?, ?) RETURNING id',
    [req.params.clientId, name, role || null]
  );
  res.status(201).json({ id });
});

router.delete('/:clientId/team/:id', async (req, res) => {
  await query('DELETE FROM client_team WHERE id=? AND client_id=?', [req.params.id, req.params.clientId]);
  res.json({ ok: true });
});

module.exports = router;
