const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../db/database');

// Get or create hub for client+year
router.get('/client/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  let [hub] = await query('SELECT * FROM media_hubs WHERE client_id=? AND year=?', [clientId, year]);

  if (!hub) {
    const [{ id: newId }] = await query('INSERT INTO media_hubs (client_id, year) VALUES (?, ?) RETURNING id', [clientId, year]);
    [hub] = await query('SELECT * FROM media_hubs WHERE id=?', [newId]);
  }

  // Attach client name and earliest PR campaign start date
  const [client] = await query('SELECT name, code FROM clients WHERE id=?', [clientId]);
  const [firstCamp] = await query(
    `SELECT MIN(start_date) as first_date FROM campaigns WHERE client_id=? AND type IN ('PR','PR Light') AND start_date IS NOT NULL`,
    [clientId]
  );

  res.json({ ...hub, client_name: client?.name, client_code: client?.code, first_campaign_date: firstCamp?.first_date || null });
});

// Get hub by ID with all data for a month
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { month } = req.query;

  const [hub] = await query('SELECT * FROM media_hubs WHERE id=?', [id]);
  if (!hub) return res.status(404).json({ error: 'Not found' });

  const result = { hub };

  if (month) {
    result.coverage = await query('SELECT * FROM media_coverage WHERE hub_id=? AND month=? ORDER BY date ASC, created_at ASC', [id, month]);
    result.top_coverage = await query('SELECT * FROM media_top_coverage WHERE hub_id=? AND month=? ORDER BY created_at ASC', [id, month]);
    result.report = (await query('SELECT * FROM media_reports WHERE hub_id=? AND month=?', [id, month]))[0] || null;
  }

  res.json(result);
});

// Overview totals for a hub
router.get('/:id/overview', async (req, res) => {
  const { id } = req.params;

  const [totals] = await query(
    `SELECT COUNT(*) as total_hits, COALESCE(SUM(asr),0) as total_asr FROM media_coverage WHERE hub_id=? AND hit=1`,
    [id]
  );

  const byType = await query(
    `SELECT media_type, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY media_type ORDER BY count DESC`,
    [id]
  );

  const byMonth = await query(
    `SELECT month, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY month ORDER BY month ASC`,
    [id]
  );

  const byCampaign = await query(
    `SELECT campaign_name, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 AND campaign_name IS NOT NULL GROUP BY campaign_name ORDER BY count DESC`,
    [id]
  );

  res.json({ totals, by_type: byType, by_month: byMonth, by_campaign: byCampaign });
});

// Get hub by share token (public)
router.get('/share/:token', async (req, res) => {
  const [hub] = await query('SELECT mh.*, cl.name as client_name, cl.code as client_code FROM media_hubs mh JOIN clients cl ON mh.client_id = cl.id WHERE mh.share_token=?', [req.params.token]);
  if (!hub) return res.status(404).json({ error: 'Not found' });

  const { month } = req.query;
  const result = { hub };

  if (month) {
    result.coverage = await query('SELECT * FROM media_coverage WHERE hub_id=? AND month=? ORDER BY date ASC, created_at ASC', [hub.id, month]);
    result.top_coverage = await query('SELECT * FROM media_top_coverage WHERE hub_id=? AND month=? ORDER BY created_at ASC', [hub.id, month]);
    result.report = (await query('SELECT * FROM media_reports WHERE hub_id=? AND month=?', [hub.id, month]))[0] || null;
  }

  res.json(result);
});

// Overview totals via share token (public — validates token before returning data)
router.get('/share/:token/overview', async (req, res) => {
  const [hub] = await query('SELECT id FROM media_hubs WHERE share_token=?', [req.params.token]);
  if (!hub) return res.status(404).json({ error: 'Not found' });
  const id = hub.id;

  const [totals] = await query(
    `SELECT COUNT(*) as total_hits, COALESCE(SUM(asr),0) as total_asr FROM media_coverage WHERE hub_id=? AND hit=1`,
    [id]
  );
  const byType = await query(
    `SELECT media_type, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY media_type ORDER BY count DESC`,
    [id]
  );
  const byMonth = await query(
    `SELECT month, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 GROUP BY month ORDER BY month ASC`,
    [id]
  );
  const byCampaign = await query(
    `SELECT campaign_name, COUNT(*) as count, COALESCE(SUM(asr),0) as asr FROM media_coverage WHERE hub_id=? AND hit=1 AND campaign_name IS NOT NULL GROUP BY campaign_name ORDER BY count DESC`,
    [id]
  );
  res.json({ totals, by_type: byType, by_month: byMonth, by_campaign: byCampaign });
});

// Generate / regenerate share token
router.post('/:id/share', async (req, res) => {
  const [hub] = await query('SELECT id FROM media_hubs WHERE id=?', [req.params.id]);
  if (!hub) return res.status(404).json({ error: 'Not found' });
  const token = crypto.randomBytes(16).toString('hex');
  await query('UPDATE media_hubs SET share_token=? WHERE id=?', [token, req.params.id]);
  res.json({ share_token: token });
});

// Add coverage entry
router.post('/:id/coverage', async (req, res) => {
  const { month, date, campaign_id, campaign_name, publication, author, headline, page_num, tone, stakeholder_mentions, images_included, ctas, circulation, hit, asr, media_type } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });

  const [{ id }] = await query(
    `INSERT INTO media_coverage (hub_id, month, date, campaign_id, campaign_name, publication, author, headline, page_num, tone, stakeholder_mentions, images_included, ctas, circulation, hit, asr, media_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [req.params.id, month, date||null, campaign_id||null, campaign_name||null, publication||null, author||null, headline||null, page_num||null, tone||'Neutral', stakeholder_mentions?1:0, images_included?1:0, ctas?1:0, circulation||0, hit!==false?1:0, asr||0, media_type||'Online']
  );
  res.status(201).json({ id });
});

// Update coverage entry
router.patch('/:id/coverage/:rowId', async (req, res) => {
  const fields = ['date','campaign_id','campaign_name','publication','author','headline','page_num','tone','stakeholder_mentions','images_included','ctas','circulation','hit','asr','media_type'];
  const updates = fields.filter(f => f in req.body);
  if (!updates.length) return res.json({ ok: true });

  const vals = updates.map(f => {
    const v = req.body[f];
    if (['stakeholder_mentions','images_included','ctas','hit'].includes(f)) return v ? 1 : 0;
    return v === '' ? null : v;
  });
  await query(`UPDATE media_coverage SET ${updates.map(f => `${f}=?`).join(',')} WHERE id=? AND hub_id=?`, [...vals, req.params.rowId, req.params.id]);
  res.json({ ok: true });
});

// Delete coverage entry
router.delete('/:id/coverage/:rowId', async (req, res) => {
  await query('DELETE FROM media_coverage WHERE id=? AND hub_id=?', [req.params.rowId, req.params.id]);
  res.json({ ok: true });
});

// Add top coverage card
router.post('/:id/top-coverage', async (req, res) => {
  const { month, title, description, publisher, media_type, audience, image_url, article_url } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });

  const [{ id }] = await query(
    `INSERT INTO media_top_coverage (hub_id, month, title, description, publisher, media_type, audience, image_url, article_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [req.params.id, month, title||null, description||null, publisher||null, media_type||null, audience||null, image_url||null, article_url||null]
  );
  res.status(201).json({ id });
});

// Update top coverage card
router.patch('/:id/top-coverage/:cardId', async (req, res) => {
  const fields = ['title','description','publisher','media_type','audience','image_url','article_url'];
  const updates = fields.filter(f => f in req.body);
  if (!updates.length) return res.json({ ok: true });

  const vals = updates.map(f => req.body[f] === '' ? null : req.body[f]);
  await query(`UPDATE media_top_coverage SET ${updates.map(f => `${f}=?`).join(',')} WHERE id=? AND hub_id=?`, [...vals, req.params.cardId, req.params.id]);
  res.json({ ok: true });
});

// Delete top coverage card
router.delete('/:id/top-coverage/:cardId', async (req, res) => {
  await query('DELETE FROM media_top_coverage WHERE id=? AND hub_id=?', [req.params.cardId, req.params.id]);
  res.json({ ok: true });
});

// Upsert monthly report
router.put('/:id/report/:month', async (req, res) => {
  const { work_completed, insights } = req.body;
  await query(
    `INSERT INTO media_reports (hub_id, month, work_completed, insights) VALUES (?, ?, ?, ?)
     ON CONFLICT(hub_id, month) DO UPDATE SET work_completed=excluded.work_completed, insights=excluded.insights`,
    [req.params.id, req.params.month, work_completed||null, insights||null]
  );
  res.json({ ok: true });
});

module.exports = router;
