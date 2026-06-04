const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

router.post('/', async (req, res) => {
  const db = await getDb();
  const { client_id, title, service, assignee, due_date, estimated_time, approver, task_type, priority, progress, notes } = req.body;
  if (!client_id || !title) return res.status(400).json({ error: 'client_id and title required' });
  if (due_date && isNaN(Date.parse(due_date))) return res.status(400).json({ error: 'Invalid due_date format' });
  if (estimated_time && isNaN(Number(estimated_time))) return res.status(400).json({ error: 'Invalid estimated_time' });
  db.run(
    `INSERT INTO tasks (client_id, title, service, assignee, due_date, estimated_time, approver, task_type, priority, progress, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [client_id, title, service || null, assignee || null, due_date || null, estimated_time || null, approver || null, task_type || null, priority || 'Medium', progress || 'Not Assigned', notes || null]
  );
  const id = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);
  saveDb();
  res.status(201).json({ id });
});

router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = Object.fromEntries(existing[0].columns.map((c, i) => [c, existing[0].values[0][i]]));
  const b = req.body;
  const v = k => k in b ? (b[k] || null) : cur[k];
  db.run(
    `UPDATE tasks SET title=?, status=?, assignee=?, due_date=?, estimated_time=?, approver=?, task_type=?, priority=?, progress=?, notes=? WHERE id=?`,
    [
      'title' in b ? b.title : cur.title,
      'status' in b ? b.status : cur.status,
      v('assignee'), v('due_date'), v('estimated_time'), v('approver'), v('task_type'), v('priority'), v('progress'), v('notes'),
      req.params.id
    ]
  );
  saveDb();
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM tasks WHERE id=?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
