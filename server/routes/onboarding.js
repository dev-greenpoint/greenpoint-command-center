const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// Get all onboarding items for a client (7-stage only)
router.get('/:clientId', async (req, res) => {
  const [items, [client]] = await Promise.all([
    query(
      `SELECT * FROM onboarding_checklist WHERE client_id=? AND category='onboarding' ORDER BY stage_index ASC, COALESCE(parent_id, id) ASC, id ASC`,
      [req.params.clientId]
    ),
    query('SELECT slack_channel, drive_folder_url FROM clients WHERE id=?', [req.params.clientId]),
  ]);
  res.json({ items, slack_channel: client?.slack_channel || null, drive_folder_url: client?.drive_folder_url || null });
});

// Update a task — completion toggle and/or field edits
router.patch('/:clientId/items/:itemId', async (req, res) => {
  const b = req.body;

  if ('completed' in b) {
    await query(
      `UPDATE onboarding_checklist SET completed=?, completed_at=? WHERE id=? AND client_id=?`,
      [b.completed ? 1 : 0, b.completed ? new Date().toISOString() : null, req.params.itemId, req.params.clientId]
    );
  }

  const editable = ['due_date', 'approver', 'assignee', 'priority', 'progress', 'notes', 'estimated_time'];
  for (const field of editable) {
    if (field in b) {
      await query(
        `UPDATE onboarding_checklist SET ${field}=? WHERE id=? AND client_id=?`,
        [b[field] || null, req.params.itemId, req.params.clientId]
      );
    }
  }

  // Setting progress = Complete also marks the task done
  if (b.progress === 'Complete' && !('completed' in b)) {
    await query(
      `UPDATE onboarding_checklist SET completed=1, completed_at=? WHERE id=? AND client_id=?`,
      [new Date().toISOString(), req.params.itemId, req.params.clientId]
    );
  }

  res.json({ ok: true });
});

// Save Slack channel (placeholder — API hookup later)
router.post('/:clientId/slack', async (req, res) => {
  const { slack_channel } = req.body;
  await query('UPDATE clients SET slack_channel=? WHERE id=?', [slack_channel, req.params.clientId]);
  // Mark the slack task done
  await query(
    `UPDATE onboarding_checklist SET completed=1, completed_at=? WHERE client_id=? AND auto_type='slack'`,
    [new Date().toISOString(), req.params.clientId]
  );
  res.json({ ok: true });
});

// Save Drive folder URL (placeholder — API hookup later)
router.post('/:clientId/drive', async (req, res) => {
  const { drive_folder_url } = req.body;
  await query('UPDATE clients SET drive_folder_url=? WHERE id=?', [drive_folder_url, req.params.clientId]);
  await query(
    `UPDATE onboarding_checklist SET completed=1, completed_at=? WHERE client_id=? AND auto_type='drive'`,
    [new Date().toISOString(), req.params.clientId]
  );
  res.json({ ok: true });
});

module.exports = router;
