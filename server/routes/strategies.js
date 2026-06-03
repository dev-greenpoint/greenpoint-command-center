const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { getDb, saveDb } = require('../db/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECTION_DEFS = [
  { id: 'overview',       label: 'Overview & Objectives' },
  { id: 'audiences',      label: 'Target Audiences' },
  { id: 'messages',       label: 'Key Messages' },
  { id: 'channels',       label: 'Channel Approach' },
  { id: 'pr_angles',      label: 'PR Angles & Media Targets' },
  { id: 'social_pillars', label: 'Social Content Pillars' },
  { id: 'paid_plan',      label: 'Paid Media Plan' },
  { id: 'timeline',       label: 'Timeline & Phasing' },
  { id: 'measurement',    label: 'Measurement & KPIs' },
];

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

// List strategies for a client
router.get('/client/:clientId', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM strategies WHERE client_id=? ORDER BY created_at DESC', [req.params.clientId]);
  res.json(rows(result));
});

// Get single strategy with full context
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT s.*, cl.name as client_name, cl.research as client_research, cl.industry as client_industry
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    WHERE s.id = ?`, [req.params.id]);
  const list = rows(result);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  res.json(list[0]);
});

// Get strategy by share token (public — only published)
router.get('/share/:token', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT s.*, cl.name as client_name
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    WHERE s.share_token = ?`, [req.params.token]);
  const list = rows(result);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  if (list[0].status === 'draft') return res.status(403).json({ error: 'Not shared' });
  res.json(list[0]);
});

const SERVICE_SECTION_MAP = {
  'PR':                                       ['pr_angles', 'messages', 'audiences', 'channels', 'measurement'],
  'PR Light':                                 ['pr_angles', 'messages', 'audiences', 'channels'],
  'Content - Social':                         ['social_pillars', 'audiences', 'channels'],
  'Content - eDM':                            ['audiences', 'channels'],
  'Content - Web/Blogs/Other Copy':           ['audiences', 'channels'],
  'Content - Influencer':                     ['social_pillars', 'audiences', 'channels'],
  'Content - Shortform Capture':              ['social_pillars', 'channels'],
  'Content - Video Production':               ['social_pillars', 'channels'],
  'Brand Activation - Events & Partnerships': ['audiences', 'channels'],
  'Awards':                                   ['pr_angles', 'messages'],
  'Paid Media':                               ['paid_plan', 'audiences', 'channels', 'measurement'],
  'Design':                                   [],
};

// Create strategy
router.post('/', async (req, res) => {
  const { client_id, title } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  const db = await getDb();

  // Derive active sections from client services
  const clientRes = db.exec('SELECT services FROM clients WHERE id=?', [client_id]);
  const clientRow = clientRes.length && clientRes[0].values.length ? clientRes[0].values[0][0] : null;
  const services = clientRow ? clientRow.split(',').map(s => s.trim()).filter(Boolean) : [];

  const CORE = ['overview', 'timeline'];
  const sectionSet = new Set(CORE);
  for (const svc of services) {
    for (const sec of (SERVICE_SECTION_MAP[svc] || [])) sectionSet.add(sec);
  }
  // Preserve section order from SECTION_DEFS
  const activeSections = SECTION_DEFS.map(s => s.id).filter(id => sectionSet.has(id));

  db.run(
    'INSERT INTO strategies (client_id, title, active_sections) VALUES (?, ?, ?)',
    [client_id, title || 'Untitled Strategy', JSON.stringify(activeSections)]
  );
  const idRes = db.exec('SELECT last_insert_rowid() as id');
  const id = idRes[0].values[0][0];
  saveDb();
  res.json({ id });
});

// Update strategy
router.put('/:id', async (req, res) => {
  const { title, sections, active_sections, status } = req.body;
  const db = await getDb();
  const parts = [];
  const vals = [];
  if (title !== undefined)           { parts.push('title=?');          vals.push(title); }
  if (sections !== undefined)        { parts.push('sections=?');       vals.push(JSON.stringify(sections)); }
  if (active_sections !== undefined) { parts.push('active_sections=?'); vals.push(JSON.stringify(active_sections)); }
  if (status !== undefined)          { parts.push('status=?');         vals.push(status); }
  parts.push("updated_at=datetime('now')");
  vals.push(req.params.id);
  db.run(`UPDATE strategies SET ${parts.join(',')} WHERE id=?`, vals);
  saveDb();
  res.json({ ok: true });
});

// Submit for approval — generates share token, sets awaiting_approval
router.post('/:id/submit', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT share_token FROM strategies WHERE id=?', [req.params.id]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });
  let token = result[0].values[0][0];
  if (!token) {
    token = crypto.randomBytes(16).toString('hex');
    db.run('UPDATE strategies SET share_token=?, status=? WHERE id=?', [token, 'awaiting_approval', req.params.id]);
  } else {
    db.run("UPDATE strategies SET status='awaiting_approval' WHERE id=?", [req.params.id]);
  }
  saveDb();
  res.json({ token });
});

// Approve
router.post('/:id/approve', async (req, res) => {
  const db = await getDb();
  db.run("UPDATE strategies SET status='approved' WHERE id=?", [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Recall to draft
router.post('/:id/recall', async (req, res) => {
  const db = await getDb();
  db.run("UPDATE strategies SET status='draft' WHERE id=?", [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Delete strategy
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM strategies WHERE id=?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// AI generate section content
router.post('/:id/generate', async (req, res) => {
  const { section_id } = req.body;
  if (!section_id) return res.status(400).json({ error: 'section_id required' });

  const db = await getDb();
  const result = db.exec(`
    SELECT s.*, cl.name as client_name, cl.research as client_research,
           cl.industry as client_industry, cl.website, cl.services
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    WHERE s.id = ?`, [req.params.id]);
  const list = rows(result);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  const row = list[0];

  const sectionDef = SECTION_DEFS.find(s => s.id === section_id);
  if (!sectionDef) return res.status(400).json({ error: 'Unknown section' });

  const sections = row.sections ? JSON.parse(row.sections) : {};
  const otherSections = SECTION_DEFS
    .filter(s => s.id !== section_id && sections[s.id] && sections[s.id].trim())
    .map(s => `### ${s.label}\n${sections[s.id]}`)
    .join('\n\n');

  // Format instructions per section type
  const formatGuide = {
    overview: 'Write 2–3 short paragraphs. Use plain prose.',
    audiences: 'List audience groups as: **Audience Name**: one-sentence description. One per line.',
    messages: 'Write 3–4 key messages as: **Message Title**: Explanation of why this message matters. One per line.',
    channels: 'Write a brief intro paragraph, then list channels as bullet points: - Channel name: how it will be used.',
    pr_angles: 'Structure as 2–3 press angles. For each: ## Angle Title\nTiming note\nDetail paragraph\nKey messages:\n- message 1\n- message 2\nTarget media:\n- outlet 1\n- outlet 2',
    social_pillars: 'Structure as 2–3 content pillars. For each: ## Pillar Name\nSubtitle / theme\nBody description\n- Content idea 1\n- Content idea 2',
    paid_plan: 'Write a brief intro, then list platforms/tactics as: **Platform/Tactic**: budget approach and targeting detail.',
    timeline: 'Structure as numbered phases: 1. Phase Name\n   Description of what happens in this phase\n2. Phase Name\n   Description',
    measurement: 'List KPIs and metrics as bullet points: - Metric name: target or benchmark description.',
  }[section_id] || 'Use clear headings (##) and bullet points (- item) where appropriate.';

  const prompt = `You are a senior strategist at Greenpoint Media, an Australian PR and media agency. Write the "${sectionDef.label}" section for a client strategy document.

Context:
- Client: ${row.client_name || 'Unknown'}${row.client_industry ? ` — ${row.client_industry}` : ''}
${row.client_research ? `- About the client: ${row.client_research}` : ''}
${row.services ? `- Services engaged: ${row.services}` : ''}
- Strategy title: ${row.title}
${otherSections ? `\nAlready drafted sections:\n${otherSections}` : ''}

Format instructions: ${formatGuide}

Write only the content for the "${sectionDef.label}" section. Do not include the section title. Write in Australian English. Be specific, professional, and concise.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ content: message.content[0].text });
  } catch (err) {
    console.error('Strategy AI error:', err.message);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

module.exports = { router, SECTION_DEFS };
