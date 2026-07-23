const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../db/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECTION_DEFS = [
  // Foundation
  { id: 'overview',      label: 'Overview & Situation',  group: 'Foundation' },
  { id: 'strategy',      label: 'Strategic Approach',    group: 'Foundation' },
  { id: 'audiences',     label: 'Target Audiences',      group: 'Foundation' },
  { id: 'messages',      label: 'Key Messages',          group: 'Foundation' },
  // Channels
  { id: 'tactical_plan', label: 'Tactical Plan',         group: 'Channels' },
  { id: 'pr',            label: 'PR Campaigns',          group: 'Channels' },
  { id: 'social',        label: 'Social Media',          group: 'Channels' },
  { id: 'content',       label: 'Content Pillars',       group: 'Channels' },
  { id: 'events',        label: 'Events & Activations',  group: 'Channels' },
  { id: 'partnerships',  label: 'Partnerships',          group: 'Channels' },
  { id: 'email',         label: 'Email & CRM',           group: 'Channels' },
  { id: 'paid',          label: 'Paid Media',            group: 'Channels' },
  { id: 'design',        label: 'Design',                group: 'Channels' },
  // Execution
  { id: 'timeline',      label: 'Timeline & Phasing',    group: 'Execution' },
  { id: 'measurement',   label: 'Measurement & KPIs',    group: 'Execution' },
  { id: 'budget',        label: 'Budget',                group: 'Execution' },
  // Channels (deck-specific)
  { id: 'moodboard',     label: 'Moodboard',             group: 'Channels' },
  // Workshop (deck-specific)
  { id: 'agenda',        label: 'Agenda',                 group: 'Workshop' },
  { id: 'discovery',     label: 'Discovery',              group: 'Workshop' },
  { id: 'immersion',     label: 'Immersion',              group: 'Workshop' },
  { id: 'next_steps',    label: 'Next Steps',             group: 'Workshop' },
];

// List all strategies (across all clients)
router.get('/', async (req, res) => {
  res.json(await query(`
    SELECT s.id, s.client_id, s.title, s.status, s.updated_at, s.created_at,
           s.submitted_by, s.reviewer, s.submitted_at,
           cl.name as client_name
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    ORDER BY s.updated_at DESC`));
});

// List strategies for a client
router.get('/client/:clientId', async (req, res) => {
  res.json(await query('SELECT * FROM strategies WHERE client_id=? ORDER BY created_at DESC', [req.params.clientId]));
});

// Get single strategy with full context
router.get('/:id', async (req, res) => {
  const list = await query(`
    SELECT s.*, cl.name as client_name, cl.research as client_research, cl.industry as client_industry
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    WHERE s.id = ?`, [req.params.id]);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  res.json(list[0]);
});

// Get strategy by share token (public — only published)
router.get('/share/:token', async (req, res) => {
  const list = await query(`
    SELECT s.*, cl.name as client_name
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    WHERE s.share_token = ?`, [req.params.token]);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  if (list[0].status === 'draft') return res.status(403).json({ error: 'Not shared' });
  res.json(list[0]);
});

const SERVICE_SECTION_MAP = {
  'PR':                                       ['strategy', 'audiences', 'messages', 'tactical_plan', 'pr', 'measurement'],
  'PR Light':                                 ['strategy', 'audiences', 'messages', 'pr'],
  'Content - Social':                         ['audiences', 'social', 'content'],
  'Content - eDM':                            ['audiences', 'email'],
  'Content - Web/Blogs/Other Copy':           ['audiences', 'messages'],
  'Content - Influencer':                     ['audiences', 'social', 'content', 'partnerships'],
  'Content - Shortform Capture':              ['social', 'content'],
  'Content - Video Production':               ['social', 'content'],
  'Brand Activation - Events & Partnerships': ['audiences', 'events', 'partnerships'],
  'Awards':                                   ['pr', 'messages'],
  'Paid Media':                               ['audiences', 'paid', 'measurement'],
  'Design':                                   [],
};

// Deck Creator: each deck type gets its own default sections + relabeled headings,
// independent of the client-services-derived defaults above.
const DECK_TYPE_SECTIONS = {
  'kickoff-workshop': {
    sections: ['agenda', 'discovery', 'immersion', 'next_steps'],
    labels: {},
  },
};

// Create strategy
router.post('/', async (req, res) => {
  const { client_id, title, deck_type } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });

  const deckDef = deck_type && DECK_TYPE_SECTIONS[deck_type];
  let activeSections, sectionsSeed;

  if (deckDef) {
    activeSections = deckDef.sections;
    sectionsSeed = { _labels: deckDef.labels };
  } else {
    // Derive active sections from client services
    const [clientRow] = await query('SELECT services FROM clients WHERE id=?', [client_id]);
    const services = clientRow?.services ? clientRow.services.split(',').map(s => s.trim()).filter(Boolean) : [];

    const CORE = ['overview', 'strategy', 'audiences', 'messages', 'timeline'];
    const sectionSet = new Set(CORE);
    for (const svc of services) {
      for (const sec of (SERVICE_SECTION_MAP[svc] || [])) sectionSet.add(sec);
    }
    // Preserve section order from SECTION_DEFS
    activeSections = SECTION_DEFS.map(s => s.id).filter(id => sectionSet.has(id));
    sectionsSeed = {};
  }

  const docType = deck_type === 'kickoff-workshop' ? 'workshop' : 'strategy';
  const [{ id }] = await query(
    'INSERT INTO strategies (client_id, title, sections, active_sections, doc_type) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [client_id, title || 'Untitled Strategy', JSON.stringify(sectionsSeed), JSON.stringify(activeSections), docType]
  );
  res.json({ id });
});

// Update strategy
router.put('/:id', async (req, res) => {
  const { title, sections, active_sections, status, submitted_by, reviewer } = req.body;
  const parts = [];
  const vals = [];
  if (title !== undefined)           { parts.push('title=?');          vals.push(title); }
  if (sections !== undefined)        { parts.push('sections=?');       vals.push(JSON.stringify(sections)); }
  if (active_sections !== undefined) { parts.push('active_sections=?'); vals.push(JSON.stringify(active_sections)); }
  if (status !== undefined)          { parts.push('status=?');         vals.push(status); }
  if (submitted_by !== undefined)    { parts.push('submitted_by=?');   vals.push(submitted_by); }
  if (reviewer !== undefined)        { parts.push('reviewer=?');       vals.push(reviewer); }
  parts.push("updated_at=NOW()");
  vals.push(req.params.id);
  await query(`UPDATE strategies SET ${parts.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
});

// Submit for approval — generates share token, sets awaiting_approval
router.post('/:id/submit', async (req, res) => {
  const { submitted_by, reviewer } = req.body;
  const existing = await query('SELECT share_token FROM strategies WHERE id=?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  let token = existing[0].share_token;
  if (!token) {
    token = crypto.randomBytes(16).toString('hex');
    await query(
      `UPDATE strategies SET share_token=?, status='awaiting_approval', submitted_at=NOW(), submitted_by=?, reviewer=? WHERE id=?`,
      [token, submitted_by || null, reviewer || null, req.params.id]
    );
  } else {
    await query(
      `UPDATE strategies SET status='awaiting_approval', submitted_at=NOW(), submitted_by=?, reviewer=? WHERE id=?`,
      [submitted_by || null, reviewer || null, req.params.id]
    );
  }
  res.json({ token });
});

// Approve
router.post('/:id/approve', async (req, res) => {
  await query("UPDATE strategies SET status='approved' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Request updates
router.post('/:id/request-updates', async (req, res) => {
  await query("UPDATE strategies SET status='updates_requested' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Recall to draft
router.post('/:id/recall', async (req, res) => {
  await query("UPDATE strategies SET status='draft' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Delete strategy
router.delete('/:id', async (req, res) => {
  await query('DELETE FROM strategies WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// Flattens a sections[id] value (legacy plain string, or the new
// { blocks:[...] } / { subtabs:[...] } shape) into plain text for use as
// AI-generation context. Image blocks contribute no useful text.
function blocksToPlainText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(b => {
    if (!b) return '';
    if (b.type === 'richtext') return b.markdown || '';
    if (b.type === 'card-grid') return (b.cards || []).map(c => `- ${c.title || ''}: ${c.body || ''}`).join('\n');
    if (b.type === 'gantt') return (b.phases || []).map(p => `Phase: ${p.title || ''} (${p.start || '?'} – ${p.end || '?'})${p.notes ? ': ' + p.notes : ''}`).join('\n');
    return '';
  }).filter(Boolean).join('\n\n');
}
function sectionToPlainText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value.subtabs)) {
    return value.subtabs.map(st => `#### ${st.label}\n${blocksToPlainText(st.blocks)}`).join('\n\n');
  }
  if (Array.isArray(value.blocks)) return blocksToPlainText(value.blocks);
  return '';
}

// AI generate section content
router.post('/:id/generate', async (req, res) => {
  const { section_id, subtab_id } = req.body;
  if (!section_id) return res.status(400).json({ error: 'section_id required' });

  const list = await query(`
    SELECT s.*, cl.name as client_name, cl.research as client_research,
           cl.industry as client_industry, cl.website, cl.services
    FROM strategies s
    JOIN clients cl ON s.client_id = cl.id
    WHERE s.id = ?`, [req.params.id]);
  if (!list.length) return res.status(404).json({ error: 'Not found' });
  const row = list[0];

  const sectionDef = SECTION_DEFS.find(s => s.id === section_id);
  if (!sectionDef) return res.status(400).json({ error: 'Unknown section' });

  const sections = row.sections ? JSON.parse(row.sections) : {};
  const otherSections = SECTION_DEFS
    .filter(s => s.id !== section_id)
    .map(s => { const text = sectionToPlainText(sections[s.id]).trim(); return text ? `### ${s.label}\n${text}` : null; })
    .filter(Boolean)
    .join('\n\n');

  let subtabLabel = null;
  const secVal = sections[section_id];
  if (subtab_id && secVal && Array.isArray(secVal.subtabs)) {
    const st = secVal.subtabs.find(s => s.id === subtab_id);
    if (st) subtabLabel = st.label;
  }
  const targetLabel = subtabLabel ? `${sectionDef.label} — ${subtabLabel}` : sectionDef.label;

  // Format instructions per section type
  const formatGuide = {
    overview:      'Write 2–3 paragraphs covering the situation, context and campaign objectives. Use plain prose.',
    strategy:      'Write 2 paragraphs outlining the strategic approach, then list 3–5 strategic pillars as: **Pillar Name**: explanation.',
    audiences:     'List 3–5 audience segments as: **Audience Name**: demographics, mindset and why they matter.',
    messages:      'Write 4–6 key messages as: **Message**: one sentence on why this message resonates.',
    tactical_plan: 'Write an overview paragraph then list 4–6 tactical focus areas as: **Tactic**: how it supports the strategy.',
    pr:            'List 3–5 press angles. For each: ## Angle Title\nTiming\nDetail paragraph\nTarget media:\n- outlet or vertical\nTarget journalists / contacts:\n- name / outlet',
    social:        'Write a brief strategy overview then cover each active platform as: **Platform**: content approach, posting cadence, key messaging.',
    content:       'List 3–4 content pillars. For each: ## Pillar Name\nTheme description\nContent ideas:\n- idea 1\n- idea 2',
    events:        'Describe 2–4 event or activation concepts. For each: **Event/Activation**: concept, audience, timing and objectives.',
    partnerships:  'List 3–5 partnership targets as: **Partner / Category**: approach, shared audience and benefit to campaign.',
    email:         'Describe the email strategy: database segmentation, key campaign sequences, nurture logic, send cadence and lead-temperature triggers.',
    paid:          'Write a brief paid media overview then cover each platform as: **Platform**: budget approach, ad formats, targeting and KPIs.',
    design:        'Write a short design direction brief (mood, aesthetic, references) then list creative deliverables as: **Deliverable**: format, specs, usage, timeline.',
    timeline:      'Structure as numbered phases: 1. Phase Name\n   Key actions and what happens in this phase.\n2. Phase Name\n   Key actions.',
    measurement:   'Group KPIs by channel. For each: - Metric: target or benchmark. End with a note on reporting cadence.',
    budget:        'Break down the budget by line item as: - Line item: amount and what it covers. End with the total and any assumptions.',
    moodboard:     'Write a short visual direction brief covering mood, colour palette, typography and reference points. Note that images can be added separately using the image button.',
    agenda:        'Structure as a numbered running order: 1. Item (time) — what happens and who leads it.',
    discovery:     'List discovery questions grouped by theme as: ## Theme\n- Question one\n- Question two',
    immersion:     'Describe the immersion framework as 2–4 stages: **Stage Name**: what happens and what it uncovers.',
    next_steps:    'List agreed next steps as: - Action: owner and due date.',
  }[section_id] || 'Use clear headings (##) and bullet points (- item) where appropriate.';

  const prompt = `You are a senior strategist at Greenpoint Media, an Australian PR and media agency. Write the "${targetLabel}" section for a client strategy document.

Context:
- Client: ${row.client_name || 'Unknown'}${row.client_industry ? ` — ${row.client_industry}` : ''}
${row.client_research ? `- About the client: ${row.client_research}` : ''}
${row.services ? `- Services engaged: ${row.services}` : ''}
- Strategy title: ${row.title}
${otherSections ? `\nAlready drafted sections:\n${otherSections}` : ''}

Format instructions: ${formatGuide}

Write only the content for the "${targetLabel}" section. Do not include the section title. Write in Australian English. Be specific, professional, and concise.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
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
