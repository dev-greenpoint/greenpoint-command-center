const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.post('/', async (req, res) => {
  const { client_id, title, service, assignee, due_date, estimated_time, approver, task_type, priority, progress, notes } = req.body;
  if (!client_id || !title) return res.status(400).json({ error: 'client_id and title required' });
  if (due_date && isNaN(Date.parse(due_date))) return res.status(400).json({ error: 'Invalid due_date format' });
  if (estimated_time && isNaN(Number(estimated_time))) return res.status(400).json({ error: 'Invalid estimated_time' });
  const [{ id }] = await query(
    `INSERT INTO tasks (client_id, title, service, assignee, due_date, estimated_time, approver, task_type, priority, progress, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [client_id, title, service || null, assignee || null, due_date || null, estimated_time || null, approver || null, task_type || null, priority || 'Medium', progress || 'Not Assigned', notes || null]
  );
  res.status(201).json({ id });
});

router.patch('/:id', async (req, res) => {
  const existing = await query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const cur = existing[0];
  const b = req.body;
  const v = k => k in b ? (b[k] || null) : cur[k];
  await query(
    `UPDATE tasks SET title=?, status=?, assignee=?, due_date=?, estimated_time=?, approver=?, task_type=?, priority=?, progress=?, notes=? WHERE id=?`,
    [
      'title' in b ? b.title : cur.title,
      'status' in b ? b.status : cur.status,
      v('assignee'), v('due_date'), v('estimated_time'), v('approver'), v('task_type'), v('priority'), v('progress'), v('notes'),
      req.params.id
    ]
  );
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM tasks WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
