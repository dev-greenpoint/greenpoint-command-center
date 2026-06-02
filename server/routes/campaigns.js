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

const PR_TASKS = {
  0: [
    { title: 'Confirm campaign objective', role: 'Account Lead' },
    { title: 'Define key message and target audience', role: 'Account Lead' },
    { title: 'Agree timing and desired media outcomes', role: 'Account Lead' },
    { title: 'Identify spokespeople', role: 'Account Lead' },
  ],
  1: [
    { title: 'Research current media trends', role: 'Account Support' },
    { title: 'Identify relevant journalists and beats', role: 'Account Support' },
    { title: 'Assess news hooks and angles', role: 'Account Support' },
    { title: 'Flag any risks', role: 'Account Support' },
  ],
  2: [
    { title: 'Define story angle', role: 'Account Lead' },
    { title: 'Identify media categories (property, business, lifestyle, local, trade)', role: 'Account Lead' },
    { title: 'Confirm proof points', role: 'Account Lead' },
    { title: 'Confirm spokespeople and required assets', role: 'Account Lead' },
  ],
  3: [
    { title: 'Gather facts, quotes and stats from client', role: 'Account Support' },
    { title: 'Collect imagery, renders and boilerplate', role: 'Account Support' },
    { title: 'Write headline and lead paragraph', role: 'Account Support' },
    { title: 'Complete full press release draft', role: 'Account Support' },
  ],
  4: [
    { title: 'Account Support review', role: 'Account Support' },
    { title: 'AM / AD review and sign-off', role: 'Account Lead' },
    { title: 'Account Coach review (if high-stakes)', role: 'Account Coach' },
  ],
  5: [
    { title: 'Send draft to client', role: 'Account Lead' },
    { title: 'Manage client edits', role: 'Account Lead' },
    { title: 'Finalise approved release and angle', role: 'Account Lead' },
  ],
  6: [
    { title: 'Draft targeted media list by angle', role: 'Account Support' },
    { title: 'Segment by priority, publication and journalist', role: 'Account Support' },
    { title: 'AM approval of media list', role: 'Account Lead' },
  ],
  7: [
    { title: 'Write tailored pitch per media category', role: 'Account Support' },
    { title: 'Review and sharpen pitch copy', role: 'Account Support' },
    { title: 'Final pitch approval', role: 'Account Lead' },
  ],
  8: [
    { title: 'Send pitches via Public Address or direct', role: 'Account Lead' },
    { title: 'Prioritise top-tier media', role: 'Account Lead' },
    { title: 'Track outreach and responses', role: 'Account Lead' },
  ],
  9: [
    { title: 'Follow up with key journalists', role: 'Account Lead' },
    { title: 'Share additional assets as needed', role: 'Account Support' },
    { title: 'Pivot angle if not landing', role: 'Account Lead' },
    { title: 'Update client on progress', role: 'Account Lead' },
  ],
  10: [
    { title: 'Log coverage in media log', role: 'Account Support' },
    { title: 'Record publication, date, journalist, link, type', role: 'Account Support' },
    { title: 'Track reach, AVE and sentiment', role: 'Account Support' },
  ],
  11: [
    { title: 'Compile metrics and top coverage', role: 'Account Support' },
    { title: 'Write monthly PR update or quarterly report', role: 'Account Lead' },
    { title: 'Include insights and recommendations', role: 'Account Lead' },
  ],
};

// Create campaign
router.post('/', async (req, res) => {
  const db = await getDb();
  const { client_id, name, status, type, start_date, end_date, budget, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run(
    `INSERT INTO campaigns (client_id, name, status, type, start_date, end_date, budget, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [client_id || null, name, status || 'draft', type || null, start_date || null, end_date || null, budget || null, notes || null]
  );
  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const id = idResult[0].values[0][0];

  if (type === 'PR') {
    const roleMap = {};
    if (client_id) {
      const teamResult = db.exec(`SELECT name, role FROM client_team WHERE client_id=?`, [client_id]);
      rows(teamResult).forEach(m => { if (m.role && !roleMap[m.role]) roleMap[m.role] = m.name; });
    }
    Object.entries(PR_TASKS).forEach(([stageIndex, tasks]) => {
      tasks.forEach(({ title, role }) => {
        db.run(
          `INSERT INTO campaign_tasks (campaign_id, stage_index, title, assignee) VALUES (?, ?, ?, ?)`,
          [id, parseInt(stageIndex), title, roleMap[role] || null]
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
    `UPDATE campaign_tasks SET title=?, assignee=?, due_date=?, done=? WHERE id=?`,
    [
      'title' in b ? b.title : cur.title,
      'assignee' in b ? (b.assignee || null) : cur.assignee,
      'due_date' in b ? (b.due_date || null) : cur.due_date,
      'done' in b ? (b.done ? 1 : 0) : cur.done,
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

// Delete campaign
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM campaigns WHERE id=?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
