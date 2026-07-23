const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { runResearch } = require('../db/runResearch');

router.post('/:id/research', async (req, res) => {
  const existing = await query('SELECT id FROM clients WHERE id=?', [req.params.id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Client not found' });
  }

  await runResearch(req.params.id);

  const [row] = await query('SELECT research, industry FROM clients WHERE id=?', [req.params.id]);
  res.json({ research: row?.research || null, industry: row?.industry || null });
});

module.exports = router;
