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
  const { client_id, title, service, assignee, due_date } = req.body;
  if (!client_id || !title) return res.status(400).json({ error: 'client_id and title required' });
  db.run(
    'INSERT INTO tasks (client_id, title, service, assignee, due_date) VALUES (?, ?, ?, ?, ?)',
    [client_id, title, service || null, assignee || null, due_date || null]
  );
  const id = rows(db.exec('SELECT last_insert_rowid() as id'))[0].id;
  saveDb();
  res.status(201).json({ id });
});

router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = Object.fromEntries(existing[0].columns.map((c, i) => [c, existing[0].values[0][i]]));
  const b = req.body;
  db.run(
    `UPDATE tasks SET title=?, status=?, assignee=?, due_date=? WHERE id=?`,
    [
      'title' in b ? b.title : cur.title,
      'status' in b ? b.status : cur.status,
      'assignee' in b ? (b.assignee || null) : cur.assignee,
      'due_date' in b ? (b.due_date || null) : cur.due_date,
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
