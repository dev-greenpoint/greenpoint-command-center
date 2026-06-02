const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

// All unique team members across all clients
router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT DISTINCT name FROM client_team WHERE name IS NOT NULL ORDER BY name ASC
  `);
  const members = result.length ? result[0].values.map(r => r[0]) : [];
  res.json(members);
});

router.get('/:name', async (req, res) => {
  const db = await getDb();
  const name = req.params.name;

  // Clients this person is on
  const clientResult = db.exec(`
    SELECT DISTINCT c.id, c.name, c.status, c.services, ct.role
    FROM clients c
    JOIN client_team ct ON ct.client_id = c.id
    WHERE ct.name = ?
    ORDER BY c.name ASC
  `, [name]);
  const clients = rows(clientResult);

  // Tasks assigned to them
  const taskResult = db.exec(`
    SELECT t.*, c.name as client_name
    FROM tasks t
    JOIN clients c ON c.id = t.client_id
    WHERE t.assignee = ?
    ORDER BY t.status ASC
  `, [name]);
  const tasks = rows(taskResult);

  // Campaigns for their clients
  const clientIds = clients.map(c => c.id);
  let campaigns = [];
  if (clientIds.length) {
    const campResult = db.exec(`
      SELECT camp.*, c.name as client_name
      FROM campaigns camp
      JOIN clients c ON c.id = camp.client_id
      WHERE camp.client_id IN (${clientIds.join(',')})
      ORDER BY camp.status ASC
    `);
    campaigns = rows(campResult);
  }

  res.json({ clients, tasks, campaigns });
});

module.exports = router;
