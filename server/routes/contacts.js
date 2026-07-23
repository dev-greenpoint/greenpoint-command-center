const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/:clientId/contacts', async (req, res) => {
  res.json(await query('SELECT * FROM client_contacts WHERE client_id=? ORDER BY id', [req.params.clientId]));
});

router.post('/:clientId/contacts', async (req, res) => {
  const { name, role, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const [{ id }] = await query(
    'INSERT INTO client_contacts (client_id, name, role, email, phone) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [req.params.clientId, name, role || null, email || null, phone || null]
  );
  res.status(201).json({ id });
});

router.delete('/:clientId/contacts/:id', async (req, res) => {
  await query('DELETE FROM client_contacts WHERE id=? AND client_id=?', [req.params.id, req.params.clientId]);
  res.json({ ok: true });
});

module.exports = router;
