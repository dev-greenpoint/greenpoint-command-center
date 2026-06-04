const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb, saveDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

// Get or create hub for client+year
router.get('/client/:clientId', async (req, res) => {
  const db = await getDb();
  const { clientId } = req.params;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  let hub = rows(db.exec('SELECT * FROM media_hubs WHERE client_id=? AND year=?', [clientId, year]))[0];

  if (!hub) {
    db.run('INSERT INTO media_hubs (client_id, year) VALUES (?, ?)', [clientId, year]);
    const idRes = db.exec('SELECT last_insert_rowid() as id');
    const newId = Number(idRes[0].values[0][0]);
    saveDb();
    hub = rows(db.exec('SELECT * FROM media_hubs WHERE id=?', [newId]))[0];
  }

  // Attach client name and earliest PR campaign start date
  const client = rows(db.exec('SELECT name, code FROM clients WHERE id=?', [clientId]))[0];
  const firstCamp = rows(db.exec(
    `SELECT MIN(start_date) as first_date FROM campaigns WHERE client_id=? AND type IN ('PR','PR Light') AND start_date IS NOT NULL`,
    [clientId]
  ))[0];

  res.json({ ...hub, client_name: client?.name, client_code: client?.code, first_campaign_date: firstCamp?.first_date || null });
});

// Get hub by ID with all data for a month
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { month } = req.query;

  const hub = rows(db.exec('SELECT * FROM media_hubs WHERE id=?', [id]))[0];
  if (!hub) return res.status(404).json({ error: 'Not found' });

  const result = { hub };

  if (month) {
    result.coverage = rows(db.exec('SELECT * FROM media_coverage WHERE hub_id=? AND month=? ORDER BY date ASC, created_at ASC', [id, month]));
    result.top_coverage = rows(db.exec('SELECT * FROM media_top_coverage WHERE hub_id=? AND month=? ORDER BY created_at ASC', [id, month]));
    result.report = rows(db.exec('SELECT * FROM media_reports WHERE hub_id=? AND month=?', [id, month]))[0] || null;
  }

  res.json(result);
});

// Overview totals for a hub
router.get('/:id/overview', async (req, res) => {
  const db = await getDb();
  const { id } = req.params;

  const totals = rows(db.exec(
    `SELECT COUNT(*) as total_hits, COALESCE(SUM(asr),0) as total_asr FROM media_coverage WHERE hub_id=? AND hit=1`,
    [id]
  ))[0];

  const byType = rows(db.exec(
    `SELECT media_type, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY media_type ORDER BY count DESC`,
    [id]
  ));

  const byMonth = rows(db.exec(
    `SELECT month, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY month ORDER BY month ASC`,
    [id]
  ));

  const byCampaign = rows(db.exec(
    `SELECT campaign_name, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 AND campaign_name IS NOT NULL GROUP BY campaign_name ORDER BY count DESC`,
    [id]
  ));

  res.json({ totals, by_type: byType, by_month: byMonth, by_campaign: byCampaign });
});

// Get hub by share token (public)
router.get('/share/:token', async (req, res) => {
  const db = await getDb();
  const hub = rows(db.exec('SELECT mh.*, cl.name as client_name, cl.code as client_code FROM media_hubs mh JOIN clients cl ON mh.client_id = cl.id WHERE mh.share_token=?', [req.params.token]))[0];
  if (!hub) return res.status(404).json({ error: 'Not found' });

  const { month } = req.query;
  const result = { hub };

  if (month) {
    result.coverage = rows(db.exec('SELECT * FROM media_coverage WHERE hub_id=? AND month=? ORDER BY date ASC, created_at ASC', [hub.id, month]));
    result.top_coverage = rows(db.exec('SELECT * FROM media_top_coverage WHERE hub_id=? AND month=? ORDER BY created_at ASC', [hub.id, month]));
    result.report = rows(db.exec('SELECT * FROM media_reports WHERE hub_id=? AND month=?', [hub.id, month]))[0] || null;
  }

  res.json(result);
});

// Overview totals via share token (public — validates token before returning data)
router.get('/share/:token/overview', async (req, res) => {
  const db = await getDb();
  const hub = rows(db.exec('SELECT id FROM media_hubs WHERE share_token=?', [req.params.token]))[0];
  if (!hub) return res.status(404).json({ error: 'Not found' });
  const id = hub.id;

  const totals = rows(db.exec(
    `SELECT COUNT(*) as total_hits, COALESCE(SUM(asr),0) as total_asr FROM media_coverage WHERE hub_id=? AND hit=1`,
    [id]
  ))[0];
  const byType = rows(db.exec(
    `SELECT media_type, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY media_type ORDER BY count DESC`,
    [id]
  ));
  const byMonth = rows(db.exec(
    `SELECT month, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY month ORDER BY month ASC`,
    [id]
  ));
  const byCampaign = rows(db.exec(
    `SELECT campaign_name, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 AND campaign_name IS NOT NULL GROUP BY campaign_name ORDER BY count DESC`,
    [id]
  ));
  res.json({ totals, by_type: byType, by_month: byMonth, by_campaign: byCampaign });
});

// Generate / regenerate share token
router.post('/:id/share', async (req, res) => {
  const db = await getDb();
  const hub = rows(db.exec('SELECT id FROM media_hubs WHERE id=?', [req.params.id]))[0];
  if (!hub) return res.status(404).json({ error: 'Not found' });
  const token = crypto.randomBytes(16).toString('hex');
  db.run('UPDATE media_hubs SET share_token=? WHERE id=?', [token, req.params.id]);
  saveDb();
  res.json({ share_token: token });
});

// Add coverage entry
router.post('/:id/coverage', async (req, res) => {
  const db = await getDb();
  const { month, date, campaign_id, campaign_name, publication, author, headline, page_num, tone, stakeholder_mentions, images_included, ctas, circulation, hit, asr, media_type } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });

  db.run(
    `INSERT INTO media_coverage (hub_id, month, date, campaign_id, campaign_name, publication, author, headline, page_num, tone, stakeholder_mentions, images_included, ctas, circulation, hit, asr, media_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.params.id, month, date||null, campaign_id||null, campaign_name||null, publication||null, author||null, headline||null, page_num||null, tone||'Neutral', stakeholder_mentions?1:0, images_included?1:0, ctas?1:0, circulation||0, hit!==false?1:0, asr||0, media_type||'Online']
  );
  const idRes = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  res.status(201).json({ id: Number(idRes[0].values[0][0]) });
});

// Update coverage entry
router.patch('/:id/coverage/:rowId', async (req, res) => {
  const db = await getDb();
  const fields = ['date','campaign_id','campaign_name','publication','author','headline','page_num','tone','stakeholder_mentions','images_included','ctas','circulation','hit','asr','media_type'];
  const updates = fields.filter(f => f in req.body);
  if (!updates.length) return res.json({ ok: true });

  const vals = updates.map(f => {
    const v = req.body[f];
    if (['stakeholder_mentions','images_included','ctas','hit'].includes(f)) return v ? 1 : 0;
    return v === '' ? null : v;
  });
  db.run(`UPDATE media_coverage SET ${updates.map(f => `${f}=?`).join(',')} WHERE id=? AND hub_id=?`, [...vals, req.params.rowId, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Delete coverage entry
router.delete('/:id/coverage/:rowId', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM media_coverage WHERE id=? AND hub_id=?', [req.params.rowId, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Add top coverage card
router.post('/:id/top-coverage', async (req, res) => {
  const db = await getDb();
  const { month, title, description, publisher, media_type, audience, image_url, article_url } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });

  db.run(
    `INSERT INTO media_top_coverage (hub_id, month, title, description, publisher, media_type, audience, image_url, article_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.params.id, month, title||null, description||null, publisher||null, media_type||null, audience||null, image_url||null, article_url||null]
  );
  const idRes = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  res.status(201).json({ id: Number(idRes[0].values[0][0]) });
});

// Update top coverage card
router.patch('/:id/top-coverage/:cardId', async (req, res) => {
  const db = await getDb();
  const fields = ['title','description','publisher','media_type','audience','image_url','article_url'];
  const updates = fields.filter(f => f in req.body);
  if (!updates.length) return res.json({ ok: true });

  const vals = updates.map(f => req.body[f] === '' ? null : req.body[f]);
  db.run(`UPDATE media_top_coverage SET ${updates.map(f => `${f}=?`).join(',')} WHERE id=? AND hub_id=?`, [...vals, req.params.cardId, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Delete top coverage card
router.delete('/:id/top-coverage/:cardId', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM media_top_coverage WHERE id=? AND hub_id=?', [req.params.cardId, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Upsert monthly report
router.put('/:id/report/:month', async (req, res) => {
  const db = await getDb();
  const { work_completed, insights } = req.body;
  db.run(
    `INSERT INTO media_reports (hub_id, month, work_completed, insights) VALUES (?, ?, ?, ?)
     ON CONFLICT(hub_id, month) DO UPDATE SET work_completed=excluded.work_completed, insights=excluded.insights`,
    [req.params.id, req.params.month, work_completed||null, insights||null]
  );
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
