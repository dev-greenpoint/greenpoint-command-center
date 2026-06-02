const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');
const { TASK_TEMPLATES } = require('../db/taskTemplates');
const { GENERAL_CHECKLIST, SERVICE_CHECKLIST } = require('../db/checklistTemplates');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

// Get full client profile (client + checklist + tasks)
router.get('/:id/profile', async (req, res) => {
  const db = await getDb();
  const clientResult = db.exec('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!clientResult.length || !clientResult[0].values.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  const client = rows(clientResult)[0];
  const checklist = rows(db.exec('SELECT * FROM onboarding_checklist WHERE client_id=? ORDER BY id', [req.params.id]));
  const tasks = rows(db.exec('SELECT * FROM tasks WHERE client_id=? ORDER BY id', [req.params.id]));
  const team = rows(db.exec('SELECT * FROM client_team WHERE client_id=? ORDER BY id', [req.params.id]));
  const contacts = rows(db.exec('SELECT * FROM client_contacts WHERE client_id=? ORDER BY id', [req.params.id]));
  res.json({ client, checklist, tasks, team, contacts });
});

// Toggle checklist item
router.patch('/:id/checklist/:itemId', async (req, res) => {
  const db = await getDb();
  const { completed } = req.body;
  db.run(
    `UPDATE onboarding_checklist SET completed=?, completed_at=? WHERE id=? AND client_id=?`,
    [completed ? 1 : 0, completed ? new Date().toISOString() : null, req.params.itemId, req.params.id]
  );
  saveDb();
  res.json({ ok: true });
});

// Regenerate tasks and checklist from current services
router.post('/:id/reset-tasks', async (req, res) => {
  const db = await getDb();
  const clientResult = db.exec('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!clientResult.length || !clientResult[0].values.length) return res.status(404).json({ error: 'Not found' });
  const client = rows(clientResult)[0];
  const services = (client.services || '').split(',').map(s => s.trim()).filter(Boolean);

  db.run('DELETE FROM tasks WHERE client_id=?', [req.params.id]);
  db.run('DELETE FROM onboarding_checklist WHERE client_id=?', [req.params.id]);

  for (const service of services) {
    for (const title of (TASK_TEMPLATES[service] || [])) {
      db.run('INSERT INTO tasks (client_id, title, service, status) VALUES (?, ?, ?, ?)', [req.params.id, title, service, 'todo']);
    }
  }
  for (const item of GENERAL_CHECKLIST) {
    db.run('INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)', [req.params.id, item, 'general']);
  }
  for (const service of services) {
    for (const item of (SERVICE_CHECKLIST[service] || [])) {
      db.run('INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)', [req.params.id, item, service]);
    }
  }

  saveDb();
  res.json({ ok: true });
});

// Mark onboarding complete → set status to active
router.post('/:id/complete-onboarding', async (req, res) => {
  const db = await getDb();
  db.run(`UPDATE clients SET status='active', onboarding_complete=1 WHERE id=?`, [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
