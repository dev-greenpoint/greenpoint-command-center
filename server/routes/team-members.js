const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM team_members ORDER BY name ASC');
  res.json(rows(result));
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, role, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run(
    'INSERT INTO team_members (name, role, email) VALUES (?, ?, ?)',
    [name, role || null, email || null]
  );
  const id = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);
  saveDb();
  res.status(201).json({ id });
});

router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM team_members WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = rows(existing)[0];
  const b = req.body;
  db.run(
    'UPDATE team_members SET name=?, role=?, email=? WHERE id=?',
    [
      'name' in b ? b.name : cur.name,
      'role' in b ? (b.role || null) : cur.role,
      'email' in b ? (b.email || null) : cur.email,
      req.params.id
    ]
  );
  saveDb();
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM team_members WHERE id=?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Names-only list — used by sidebar and assignee selectors
router.get('/names', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT name FROM team_members ORDER BY name ASC');
  const names = result.length ? result[0].values.map(r => r[0]) : [];
  res.json(names);
});

module.exports = router;
