const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

// List all campaigns (with client name joined)
router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT c.*, cl.name as client_name
    FROM campaigns c
    LEFT JOIN clients cl ON cl.id = c.client_id
    ORDER BY c.created_at DESC
  `);
  res.json(rows(result));
});

// List campaigns for a specific client
router.get('/client/:clientId', async (req, res) => {
  const db = await getDb();
  const result = db.exec(
    `SELECT * FROM campaigns WHERE client_id=? ORDER BY start_date ASC`,
    [req.params.clientId]
  );
  res.json(rows(result));
});

// Get single campaign (with client name)
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT c.*, cl.name as client_name
    FROM campaigns c
    LEFT JOIN clients cl ON cl.id = c.client_id
    WHERE c.id=?`, [req.params.id]);
  const list = rows(result);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  res.json(list[0]);
});

const { CAMPAIGN_TASK_TEMPLATES } = require('../db/campaignTaskTemplates');

// Create campaign
router.post('/', async (req, res) => {
  const db = await getDb();
  const { client_id, name, status, type, start_date, end_date, budget, notes, scope, setup } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run(
    `INSERT INTO campaigns (client_id, name, status, type, start_date, end_date, budget, notes, scope, setup)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [client_id || null, name, status || 'draft', type || null, start_date || null, end_date || null, budget || null, notes || null, scope ? JSON.stringify(scope) : null, setup ? JSON.stringify(setup) : null]
  );
  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const id = idResult[0].values[0][0];

  const taskTemplate = CAMPAIGN_TASK_TEMPLATES[type] || null;
  if (taskTemplate) {
    Object.entries(taskTemplate).forEach(([stageIndex, tasks]) => {
      tasks.forEach(title => {
        db.run(
          `INSERT INTO campaign_tasks (campaign_id, stage_index, title) VALUES (?, ?, ?)`,
          [id, parseInt(stageIndex), title]
        );
      });
    });
  }

  saveDb();
  res.status(201).json({ id });
});

// Update campaign
router.put('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM campaigns WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = Object.fromEntries(existing[0].columns.map((c, i) => [c, existing[0].values[0][i]]));
  const b = req.body;
  const val = k => (k in b ? (b[k] || null) : cur[k]);
  db.run(
    `UPDATE campaigns SET client_id=?, name=?, status=?, type=?, start_date=?, end_date=?, budget=?, notes=? WHERE id=?`,
    [val('client_id'), val('name'), val('status') || 'draft', val('type'), val('start_date'), val('end_date'), val('budget'), val('notes'), req.params.id]
  );

  saveDb();
  res.json({ ok: true });
});

// Get all tasks for a campaign
router.get('/:id/tasks', async (req, res) => {
  const db = await getDb();
  const result = db.exec(
    `SELECT * FROM campaign_tasks WHERE campaign_id=? ORDER BY stage_index ASC, created_at ASC`,
    [req.params.id]
  );
  res.json(rows(result));
});

// Get tasks for a stage
router.get('/:id/tasks/:stage', async (req, res) => {
  const db = await getDb();
  const result = db.exec(
    `SELECT * FROM campaign_tasks WHERE campaign_id=? AND stage_index=? ORDER BY created_at ASC`,
    [req.params.id, req.params.stage]
  );
  res.json(rows(result));
});

// Add task to a stage
router.post('/:id/tasks', async (req, res) => {
  const db = await getDb();
  const { stage_index, title, assignee, due_date } = req.body;
  db.run(
    `INSERT INTO campaign_tasks (campaign_id, stage_index, title, assignee, due_date) VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, stage_index, title, assignee || null, due_date || null]
  );
  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const id = idResult[0].values[0][0];
  saveDb();
  res.status(201).json({ id });
});

// Update task (done toggle or full edit)
router.patch('/:id/tasks/:taskId', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM campaign_tasks WHERE id=?', [req.params.taskId]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = Object.fromEntries(existing[0].columns.map((c, i) => [c, existing[0].values[0][i]]));
  const b = req.body;
  db.run(
    `UPDATE campaign_tasks SET title=?, assignee=?, due_date=?, done=?, progress=? WHERE id=?`,
    [
      'title' in b ? b.title : cur.title,
      'assignee' in b ? (b.assignee || null) : cur.assignee,
      'due_date' in b ? (b.due_date || null) : cur.due_date,
      'done' in b ? (b.done ? 1 : 0) : cur.done,
      'progress' in b ? (b.progress || 'Not Assigned') : (cur.progress || 'Not Assigned'),
      req.params.taskId
    ]
  );
  saveDb();
  res.json({ ok: true });
});

// Delete task
router.delete('/:id/tasks/:taskId', async (req, res) => {
  const db = await getDb();
  db.run(`DELETE FROM campaign_tasks WHERE id=?`, [req.params.taskId]);
  saveDb();
  res.json({ ok: true });
});

// Update stage
router.patch('/:id/stage', async (req, res) => {
  const db = await getDb();
  const { stage } = req.body;
  db.run('UPDATE campaigns SET current_stage=? WHERE id=?', [stage, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

router.patch('/:id/status', async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  db.run('UPDATE campaigns SET status=? WHERE id=?', [status, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

router.patch('/:id/setup', async (req, res) => {
  const db = await getDb();
  const { setup } = req.body;
  db.run('UPDATE campaigns SET setup=? WHERE id=?', [setup ? JSON.stringify(setup) : null, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM campaigns WHERE id=?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
