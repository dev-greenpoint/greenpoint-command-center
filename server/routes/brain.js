const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../db/database');

// ── Client-scoped: GET/POST /api/clients/:id/brain ───────────────────────────
const clientBrainRouter = express.Router({ mergeParams: true });

clientBrainRouter.get('/', async (req, res) => {
  try {
    const { type, campaign_id, q } = req.query;
    let sql = `
      SELECT b.*, c.name AS campaign_name
      FROM brain_entries b
      LEFT JOIN campaigns c ON c.id = b.campaign_id
      WHERE b.client_id = ?`;
    const params = [req.params.id];

    if (type)                     { sql += ` AND b.type = ?`;            params.push(type); }
    if (campaign_id === 'client') { sql += ` AND b.campaign_id IS NULL`; }
    else if (campaign_id)         { sql += ` AND b.campaign_id = ?`;     params.push(campaign_id); }
    if (q)                        { sql += ` AND b.body LIKE ?`;         params.push(`%${q}%`); }

    sql += ` ORDER BY b.pinned DESC, b.created_at DESC`;
    res.json(await query(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

clientBrainRouter.post('/', async (req, res) => {
  try {
    const { type, body, campaign_id } = req.body;
    if (!type || !body?.trim()) return res.status(400).json({ error: 'type and body are required' });
    const now = new Date().toISOString();
    const [{ id }] = await query(
      `INSERT INTO brain_entries (client_id, campaign_id, type, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.params.id, campaign_id || null, type, body.trim(), now, now]
    );
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

clientBrainRouter.get('/summary', async (req, res) => {
  try {
    const [client] = await query(`SELECT name, brain_summary FROM clients WHERE id = ?`, [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    if (client.brain_summary && req.query.regenerate !== 'true') {
      try { return res.json(JSON.parse(client.brain_summary)); } catch {}
    }

    const entries = await query(
      `SELECT type, body, created_at FROM brain_entries WHERE client_id = ? ORDER BY pinned DESC, created_at DESC`,
      [req.params.id]
    );
    if (!entries.length) return res.json({ summary: null, updates: [], action_items: [] });

    const text = entries.map(e => `[${e.type}] ${e.body}`).join('\n');
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a PR agency account manager reviewing intelligence notes for "${client.name}".

Return ONLY valid JSON with exactly these three keys:
{
  "summary": "2-3 sentences on current client status and focus",
  "updates": ["Change description using before → after format where applicable", ...],
  "action_items": [{"who": "person or team", "what": "the task", "where": "outlet/platform/place"}, ...]
}

Extract updates (any changes: strategy angles, contacts, dates, media targets) and action items (who needs to do what and where) from these entries:

${text}`
      }]
    });

    let result;
    try {
      const raw = msg.content[0].text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
      result = JSON.parse(raw);
    } catch { result = { summary: msg.content[0].text, updates: [], action_items: [] }; }

    await query(`UPDATE clients SET brain_summary = ? WHERE id = ?`, [JSON.stringify(result), req.params.id]);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Entry-level: PATCH/DELETE /api/brain/:entryId ───────────────────────────
const entryRouter = express.Router();

entryRouter.patch('/:entryId', async (req, res) => {
  try {
    const existing = await query('SELECT id FROM brain_entries WHERE id=?', [req.params.entryId]);
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    const { body, type, pinned } = req.body;
    const sets = []; const params = [];
    if (body   !== undefined) { sets.push('body=?');   params.push(body.trim()); }
    if (type   !== undefined) { sets.push('type=?');   params.push(type); }
    if (pinned !== undefined) { sets.push('pinned=?'); params.push(pinned ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    sets.push('updated_at=?'); params.push(new Date().toISOString());
    params.push(req.params.entryId);
    await query(`UPDATE brain_entries SET ${sets.join(',')} WHERE id=?`, params);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

entryRouter.delete('/:entryId', async (req, res) => {
  try {
    const existing = await query('SELECT id FROM brain_entries WHERE id=?', [req.params.entryId]);
    if (!existing.length) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM brain_entries WHERE id=?', [req.params.entryId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = { clientBrainRouter, entryRouter };
