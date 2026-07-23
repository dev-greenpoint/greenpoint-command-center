const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// All unique team members across all clients
router.get('/', async (req, res) => {
  const rows = await query(`
    SELECT DISTINCT name FROM client_team WHERE name IS NOT NULL ORDER BY name ASC
  `);
  res.json(rows.map(r => r.name));
});

router.get('/:name', async (req, res) => {
  const name = req.params.name;

  // Clients this person is on
  const clients = await query(`
    SELECT DISTINCT c.id, c.name, c.status, c.services, ct.role
    FROM clients c
    JOIN client_team ct ON ct.client_id = c.id
    WHERE ct.name = ?
    ORDER BY c.name ASC
  `, [name]);

  // Tasks assigned to them
  const tasks = await query(`
    SELECT t.*, c.name as client_name
    FROM tasks t
    JOIN clients c ON c.id = t.client_id
    WHERE t.assignee = ?
    ORDER BY t.status ASC
  `, [name]);

  // Campaigns for their clients
  const clientIds = clients.map(c => c.id);
  let campaigns = [];
  if (clientIds.length) {
    campaigns = await query(`
      SELECT camp.*, c.name as client_name
      FROM campaigns camp
      JOIN clients c ON c.id = camp.client_id
      WHERE camp.client_id IN (${clientIds.join(',')})
      ORDER BY camp.status ASC
    `);
  }

  res.json({ clients, tasks, campaigns });
});

module.exports = router;
