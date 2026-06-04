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
  const id = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);

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
    `UPDATE campaigns SET client_id=?, name=?, status=?, type=?, start_date=?, end_date=?, budget=?, notes=?, campaign_period=? WHERE id=?`,
    [val('client_id'), val('name'), val('status') || 'draft', val('type'), val('start_date'), val('end_date'), val('budget'), val('notes'), val('campaign_period'), req.params.id]
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
  const id = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);
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
  const v = k => k in b ? (b[k] || null) : cur[k];
  db.run(
    `UPDATE campaign_tasks SET title=?, assignee=?, due_date=?, done=?, progress=?, estimated_time=?, approver=?, task_type=?, priority=?, notes=? WHERE id=?`,
    [
      'title' in b ? b.title : cur.title,
      v('assignee'), v('due_date'),
      'done' in b ? (b.done ? 1 : 0) : cur.done,
      'progress' in b ? (b.progress || 'Not Assigned') : (cur.progress || 'Not Assigned'),
      v('estimated_time'), v('approver'), v('task_type'), v('priority'), v('notes'),
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
  const existing = db.exec('SELECT id FROM campaigns WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
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

// Save social admin data (inputs, blockers, priorities, key dates)
router.patch('/:id/social-admin', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT id FROM campaigns WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  db.run('UPDATE campaigns SET social_admin=? WHERE id=?', [req.body.social_admin ? JSON.stringify(req.body.social_admin) : null, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Update sked/slack links
router.patch('/:id/links', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT id FROM campaigns WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const { sked_link, slack_channel } = req.body;
  db.run('UPDATE campaigns SET sked_link=?, slack_channel=? WHERE id=?', [sked_link||null, slack_channel||null, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// ── Social Posts ───────────────────────────────────────────────────────────────

router.get('/:id/posts', async (req, res) => {
  const db = await getDb();
  const { month } = req.query;
  const result = month
    ? db.exec('SELECT * FROM social_posts WHERE campaign_id=? AND month=? ORDER BY post_date ASC, created_at ASC', [req.params.id, month])
    : db.exec('SELECT * FROM social_posts WHERE campaign_id=? ORDER BY month DESC, post_date ASC', [req.params.id]);
  res.json(rows(result));
});

router.post('/:id/posts', async (req, res) => {
  const db = await getDb();
  const { month, platform, format, caption, title, status, assignee, post_date, content_pillar, sked_link, published_link, notes } = req.body;
  if (!month || !platform) return res.status(400).json({ error: 'month and platform required' });
  db.run(
    'INSERT INTO social_posts (campaign_id, month, platform, format, caption, title, status, assignee, post_date, content_pillar, sked_link, published_link, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.params.id, month, platform, format || 'Post', caption || null, title || null, status || 'draft', assignee || null, post_date || null, content_pillar || null, sked_link || null, published_link || null, notes || null]
  );
  const id = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);
  saveDb();
  res.status(201).json({ id });
});

router.patch('/:id/posts/:postId', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM social_posts WHERE id=? AND campaign_id=?', [req.params.postId, req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = Object.fromEntries(existing[0].columns.map((c, i) => [c, existing[0].values[0][i]]));
  const b = req.body;
  db.run(
    'UPDATE social_posts SET platform=?, format=?, caption=?, title=?, status=?, assignee=?, post_date=?, content_pillar=?, sked_link=?, published_link=?, notes=? WHERE id=?',
    [
      'platform'       in b ? b.platform                   : cur.platform,
      'format'         in b ? b.format                     : cur.format,
      'caption'        in b ? (b.caption        || null)   : cur.caption,
      'title'          in b ? (b.title          || null)   : cur.title,
      'status'         in b ? b.status                     : cur.status,
      'assignee'       in b ? (b.assignee        || null)  : cur.assignee,
      'post_date'      in b ? (b.post_date       || null)  : cur.post_date,
      'content_pillar' in b ? (b.content_pillar  || null)  : cur.content_pillar,
      'sked_link'      in b ? (b.sked_link        || null) : cur.sked_link,
      'published_link' in b ? (b.published_link   || null) : cur.published_link,
      'notes'          in b ? (b.notes            || null) : cur.notes,
      req.params.postId,
    ]
  );
  saveDb();
  res.json({ ok: true });
});

router.delete('/:id/posts/:postId', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM social_posts WHERE id=? AND campaign_id=?', [req.params.postId, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
