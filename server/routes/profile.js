const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/database');
const { GENERAL_CHECKLIST, SERVICE_CHECKLIST } = require('../db/checklistTemplates');

// Get full client profile (client + checklist + tasks)
router.get('/:id/profile', async (req, res) => {
  const clients = await query('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!clients.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  const client = clients[0];
  const checklist = await query('SELECT * FROM onboarding_checklist WHERE client_id=? ORDER BY id', [req.params.id]);
  const tasks = await query('SELECT * FROM tasks WHERE client_id=? ORDER BY id', [req.params.id]);
  const team = await query('SELECT * FROM client_team WHERE client_id=? ORDER BY id', [req.params.id]);
  const contacts = await query('SELECT * FROM client_contacts WHERE client_id=? ORDER BY id', [req.params.id]);
  res.json({ client, checklist, tasks, team, contacts });
});

// Toggle checklist item
router.patch('/:id/checklist/:itemId', async (req, res) => {
  const { completed } = req.body;
  await query(
    `UPDATE onboarding_checklist SET completed=?, completed_at=? WHERE id=? AND client_id=?`,
    [completed ? 1 : 0, completed ? new Date().toISOString() : null, req.params.itemId, req.params.id]
  );
  res.json({ ok: true });
});

// Regenerate tasks and checklist from current services
router.post('/:id/reset-tasks', async (req, res) => {
  const clients = await query('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!clients.length) return res.status(404).json({ error: 'Not found' });
  const client = clients[0];
  const services = (client.services || '').split(',').map(s => s.trim()).filter(Boolean);

  await transaction(async (q) => {
    await q('DELETE FROM onboarding_checklist WHERE client_id=?', [req.params.id]);

    for (const item of GENERAL_CHECKLIST) {
      await q('INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)', [req.params.id, item, 'general']);
    }
    for (const service of services) {
      for (const item of (SERVICE_CHECKLIST[service] || [])) {
        await q('INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)', [req.params.id, item, service]);
      }
    }
  });

  res.json({ ok: true });
});

// Mark onboarding complete → set status to active
router.post('/:id/complete-onboarding', async (req, res) => {
  await query(`UPDATE clients SET status='active', onboarding_complete=1 WHERE id=?`, [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
