const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { runResearch } = require('../db/runResearch');

router.post('/:id/research', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT id FROM clients WHERE id=?', [req.params.id]);
  if (!result.length || !result[0].values.length) {
    return res.status(404).json({ error: 'Client not found' });
  }

  await runResearch(req.params.id);

  const updated = db.exec('SELECT research, industry FROM clients WHERE id=?', [req.params.id]);
  const row = updated[0]?.values[0];
  const research = row?.[0] || null;
  const industry = row?.[1] || null;

  res.json({ research, industry });
});

module.exports = router;
