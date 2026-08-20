const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// Notifications for a person, sourced from strategy_comments.notify (JSON
// array of team_members names). Filtered in JS rather than SQL LIKE — the
// comment volume in this app is small, and LIKE-matching a JSON-encoded
// array risks substring collisions between names (e.g. "Jaye" matching
// "Jaye Dixon" and "Jaye Smith").
router.get('/', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.json([]);

  const rows = await query(`
    SELECT c.id, c.strategy_id, c.author_name, c.body, c.notify, c.created_at,
           s.title AS strategy_title, s.client_id, cl.name AS client_name
    FROM strategy_comments c
    JOIN strategies s ON s.id = c.strategy_id
    LEFT JOIN clients cl ON cl.id = s.client_id
    WHERE c.notify IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 200
  `);

  const mine = rows.filter(r => {
    try { return JSON.parse(r.notify || '[]').includes(name); } catch { return false; }
  }).slice(0, 50);

  res.json(mine);
});

module.exports = router;
