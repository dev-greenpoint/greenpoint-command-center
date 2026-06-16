const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { getDb, saveDb } = require('../db/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

// Get all pitch lists for a client (summary — for the client board card)
router.get('/client/:clientId', async (req, res) => {
  const db = await getDb();
  const lists = rows(db.exec(
    `SELECT pl.*, c.name as campaign_name, c.type as campaign_type,
            (SELECT COUNT(*) FROM pitch_contacts pc WHERE pc.list_id = pl.id) as contact_count,
            (SELECT COUNT(*) FROM pitch_contacts pc WHERE pc.list_id = pl.id AND pc.status IN ('Pitched','Coverage Received')) as pitched_count
     FROM pitch_lists pl
     LEFT JOIN campaigns c ON pl.campaign_id = c.id
     WHERE pl.client_id = ?
     ORDER BY pl.created_at DESC`,
    [req.params.clientId]
  ));
  res.json(lists);
});

// Get or create pitch list for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  const db = await getDb();
  const { campaignId } = req.params;

  const campaign = rows(db.exec(
    `SELECT c.*, cl.name as client_name, cl.code as client_code, cl.id as client_id
     FROM campaigns c JOIN clients cl ON c.client_id = cl.id WHERE c.id=?`,
    [campaignId]
  ))[0];
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  let list = rows(db.exec('SELECT * FROM pitch_lists WHERE campaign_id=?', [campaignId]))[0];
  if (!list) {
    db.run('INSERT INTO pitch_lists (client_id, campaign_id) VALUES (?, ?)', [campaign.client_id, campaignId]);
    const newId = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);
    saveDb();
    list = rows(db.exec('SELECT * FROM pitch_lists WHERE id=?', [newId]))[0];
  }

  const contacts = rows(db.exec(
    'SELECT * FROM pitch_contacts WHERE list_id=? ORDER BY category ASC, sort_order ASC, id ASC',
    [list.id]
  ));

  res.json({
    list,
    contacts,
    campaign_name: campaign.name,
    campaign_type: campaign.type,
    client_name: campaign.client_name,
    client_code: campaign.client_code,
    client_id: campaign.client_id,
  });
});

// AI research brief for a campaign
router.post('/campaign/:campaignId/research', async (req, res) => {
  const db = await getDb();
  const campaign = rows(db.exec(
    `SELECT c.*, cl.name as client_name, cl.industry, cl.research as client_research
     FROM campaigns c JOIN clients cl ON c.client_id = cl.id WHERE c.id=?`,
    [req.params.campaignId]
  ))[0];
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  let setup = null;
  try { setup = campaign.setup ? JSON.parse(campaign.setup) : null; } catch {}

  const angle = setup?.angle || '';
  const keyMessages = setup?.keyMessages?.join('\n- ') || '';
  const spokespeople = setup?.spokespeople?.join(', ') || '';

  const prompt = `You are a senior PR strategist at an Australian media agency. Based on the campaign details below, suggest a research starting point for pitching Australian media.

Client: ${campaign.client_name}
Industry: ${campaign.industry || 'Unknown'}
Client background: ${campaign.client_research || 'Not available'}
Campaign name: ${campaign.name}
Campaign angle: ${angle || 'Not specified'}
Key messages: ${keyMessages ? '- ' + keyMessages : 'Not specified'}
Spokespeople: ${spokespeople || 'Not specified'}

Write your response in three clearly labelled sections:

**ARTICLES / TOPICS**
List 4-6 recent article topics or story types that have been covered in Australian media that are relevant to this campaign. One line each — describe the topic, not a specific article title.

**PUBLICATIONS**
List 6-10 specific Australian publications (print, online, trade) that would cover this type of story. For each, add the section or beat that applies (e.g. Domain — Property, AFR Weekend — Lifestyle & Design).

**JOURNALISTS**
For each publication above, name 1-2 journalists known to cover this beat in Australia. Include their name, publication, and beat. Use your best knowledge — the team will verify.

Write in plain Australian English. Be specific and practical. No preamble, no sign-off. Just the three sections.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ brief: message.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a contact
router.post('/:listId/contacts', async (req, res) => {
  const db = await getDb();
  const { category, publication, journalist_name, journalist_title, email, phone, status, pitched_date, followup_date, notes } = req.body;
  db.run(
    `INSERT INTO pitch_contacts (list_id, category, publication, journalist_name, journalist_title, email, phone, status, pitched_date, followup_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.params.listId, category || 'General', publication || null, journalist_name || null, journalist_title || null,
     email || null, phone || null, status || '', pitched_date || null, followup_date || null, notes || null]
  );
  const id = Number(rows(db.exec('SELECT last_insert_rowid() as id'))[0].id);
  saveDb();
  res.status(201).json({ id });
});

// Update a contact
router.patch('/:listId/contacts/:contactId', async (req, res) => {
  const db = await getDb();
  const editable = ['category', 'publication', 'journalist_name', 'journalist_title', 'email', 'phone', 'status', 'pitched_date', 'followup_date', 'notes'];
  for (const field of editable) {
    if (field in req.body) {
      db.run(
        `UPDATE pitch_contacts SET ${field}=? WHERE id=? AND list_id=?`,
        [req.body[field] ?? null, req.params.contactId, req.params.listId]
      );
    }
  }
  saveDb();
  res.json({ ok: true });
});

// Delete a contact
router.delete('/:listId/contacts/:contactId', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM pitch_contacts WHERE id=? AND list_id=?', [req.params.contactId, req.params.listId]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
