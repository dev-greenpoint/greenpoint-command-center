// Deck Creator 2.0 — upload a document (PDF / Word / text, or pasted text) and
// Claude turns it into a deck, stored in `strategies` so the deck list, share
// links and Save & Lock work as usual. Either a layout deck (e.g. the scroll
// presentation — see server/deck-layouts/) or a classic tabbed deck that
// opens in the builder.
const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { query } = require('../db/database');

// Layout decks (e.g. the scroll presentation) — each module supplies its own
// output schema, prompt and content conversion. No `layout` = classic tabs.
const LAYOUTS = { scroll: require('../deck-layouts/scroll') };

// Section ids, labels and hints come from the same browser file the deck
// renderer uses, so the AI can only pick sections the builder understands.
const SECTION_DEFS = (() => {
  const ctx = {};
  const src = fs.readFileSync(path.join(__dirname, '../../client/components/section-defs.js'), 'utf8');
  vm.runInNewContext(`${src}\nthis.SECTION_DEFS = SECTION_DEFS;`, ctx);
  return ctx.SECTION_DEFS;
})();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // on Vercel the ~4.5 MB request limit applies first
});

// Workshop sections belong to the (hidden) workshop deck type, not strategy decks.
const DECK_SECTIONS = SECTION_DEFS.filter(s => s.group !== 'Workshop');
const CARD_ICONS = ['target', 'growth', 'idea', 'audience', 'calendar', 'star', 'success', 'link', 'globe', 'heart',
  'milestone', 'shield', 'clock', 'budget', 'design', 'analytics', 'compass', 'award', 'message', 'layers'];

const blockSchema = {
  anyOf: [
    {
      type: 'object',
      properties: {
        type: { const: 'richtext' },
        markdown: { type: 'string', description: 'Markdown: paragraphs, ### subheadings, bullet lists, **bold**, GFM tables.' },
      },
      required: ['type', 'markdown'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        type: { const: 'card-grid' },
        columns: { type: 'integer', enum: [2, 3, 4] },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string', description: 'Short plain text; **bold** and *italic* allowed. No lists or headings.' },
              icon: { type: 'string', enum: [...CARD_ICONS, 'none'] },
            },
            required: ['title', 'body', 'icon'],
            additionalProperties: false,
          },
        },
      },
      required: ['type', 'columns', 'cards'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        type: { const: 'gantt' },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' },
              notes: { type: 'string' },
            },
            required: ['title', 'start', 'end', 'notes'],
            additionalProperties: false,
          },
        },
      },
      required: ['type', 'phases'],
      additionalProperties: false,
    },
  ],
};

const DECK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section_id: { type: 'string', enum: DECK_SECTIONS.map(s => s.id) },
          label: { type: 'string', description: 'Tab heading shown in the deck.' },
          subtabs: {
            type: 'array',
            description: 'Use when the section has distinct parts; leave empty otherwise.',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, blocks: { type: 'array', items: blockSchema } },
              required: ['label', 'blocks'],
              additionalProperties: false,
            },
          },
          blocks: { type: 'array', items: blockSchema, description: 'Content when there are no subtabs.' },
        },
        required: ['section_id', 'label', 'subtabs', 'blocks'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'sections'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You turn client documents into presentation decks for Greenpoint Media, an Australian PR, social and marketing agency. The deck is shown to the client as a web page with one tab per section.

Available sections (use only those the document gives real material for, in a sensible presentation order):
${DECK_SECTIONS.map(s => `- ${s.id}: ${s.label} — ${s.hint}`).join('\n')}

Give each section a clear label (the tab name); it can differ from the default name above when the document suggests a better one. Split a section into subtabs when it has several distinct parts.

Block types:
- richtext: markdown prose, subheadings, lists and tables
- card-grid: 2-4 columns of short cards, for pillars, audiences, messages, principles or any parallel set of ideas; choose a fitting icon or "none"
- gantt: phases with ISO start/end dates, only when the document gives real dates or durations

Write in Australian English with a confident agency voice. Stay faithful to the document: restructure, tighten and present its content well, but don't invent facts, figures, names or dates it doesn't contain.`;

function slugId() {
  return 'sub-' + Math.random().toString(36).slice(2, 8);
}

// Converts Claude's output into the strategies.sections / active_sections shape.
function toDeckColumns(deck) {
  const sections = { _labels: {} };
  const active = [];
  const cleanBlocks = blocks => (blocks || []).map(b => {
    if (b.type !== 'card-grid') return b;
    return { ...b, cards: b.cards.map(({ icon, ...c }) => (icon && icon !== 'none' ? { ...c, icon } : c)) };
  });

  for (const sec of deck.sections || []) {
    const id = sec.section_id;
    if (active.includes(id)) continue; // schema can't enforce uniqueness; keep the first
    const subtabs = (sec.subtabs || []).filter(st => st.blocks && st.blocks.length);
    sections[id] = subtabs.length
      ? { subtabs: subtabs.map(st => ({ id: slugId(), label: st.label, active: true, blocks: cleanBlocks(st.blocks) })) }
      : { blocks: cleanBlocks(sec.blocks) };
    const def = DECK_SECTIONS.find(s => s.id === id);
    if (sec.label && def && sec.label !== def.label) sections._labels[id] = sec.label;
    active.push(id);
  }
  return { sections, active };
}

async function documentBlockFor(file) {
  const name = file.originalname || 'document';
  const ext = name.toLowerCase().split('.').pop();
  if (file.mimetype === 'application/pdf' || ext === 'pdf') {
    return { type: 'document', title: name, source: { type: 'base64', media_type: 'application/pdf', data: file.buffer.toString('base64') } };
  }
  let text;
  if (ext === 'docx') {
    text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
  } else if (['txt', 'md', 'markdown'].includes(ext) || file.mimetype.startsWith('text/')) {
    text = file.buffer.toString('utf8');
  } else {
    throw Object.assign(new Error('Unsupported file type — upload a PDF, Word (.docx) or text file.'), { userFacing: true });
  }
  if (!text.trim()) throw Object.assign(new Error('That document has no readable text.'), { userFacing: true });
  return { type: 'document', title: name, source: { type: 'text', media_type: 'text/plain', data: text } };
}

async function generateJson(system, schema, messages) {
  const stream = anthropic.beta.messages.stream({
    // Haiku while testing (cheapest). For better decks switch to 'claude-opus-5-5'
    // and add back thinking: { type: 'adaptive' }.
    model: 'claude-haiku-4-5',
    max_tokens: 64000,
    system,
    output_config: { format: { type: 'json_schema', schema } },
    messages,
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw Object.assign(new Error('The AI declined to build a deck from this document.'), { userFacing: true, status: 422 });
  }
  if (message.stop_reason === 'max_tokens') {
    throw Object.assign(new Error('The document is too long to turn into one deck. Try a shorter document.'), { userFacing: true, status: 422 });
  }
  return JSON.parse(message.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}

// Writes an image-generation prompt for one image slot, from the deck text
// around it (see imageContext in client/components/deck-layouts/*.js).
router.post('/image-prompt', express.json(), async (req, res) => {
  const { context, deck_title, client_name, ratio } = req.body || {};
  if (!context || !String(context).replace(/[^a-z]/gi, '').length) {
    return res.status(400).json({ error: 'Add some text to this part of the deck first, then try again.' });
  }
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: `You write prompts for an AI image generator (FLUX) for Greenpoint Media, an Australian PR and marketing agency, to illustrate slides in client presentations. Write one prompt of 2–4 sentences: the subject, setting, composition, lighting and mood, in a polished editorial photography style unless the content clearly calls for something else. Never ask for text, words, logos, brand marks or UI in the image. Where a setting isn't specified and it fits, make it Australian. Reply with the prompt only.`,
      messages: [{
        role: 'user',
        content: [deck_title && `Deck: ${deck_title}`, client_name && `Client: ${client_name}`, ratio && `Aspect ratio: ${ratio}`, '', String(context).slice(0, 6000)].filter(v => v !== undefined && v !== null && v !== false).join('\n'),
      }],
    });
    const prompt = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim().replace(/^["']|["']$/g, '');
    if (!prompt) return res.status(502).json({ error: 'Could not write a prompt — try again.' });
    res.json({ prompt });
  } catch (err) {
    console.error('Image prompt failed:', err.message);
    res.status(500).json({ error: 'Could not write a prompt — try again.' });
  }
});

router.post('/generate', upload.single('file'), async (req, res) => {
  const { client_id, created_by, instructions, text, title } = req.body;
  const layout = req.body.layout && req.body.layout !== 'classic' ? req.body.layout : null;
  if (layout && !LAYOUTS[layout]) return res.status(400).json({ error: 'Unknown layout' });
  if (!req.file && !(text && text.trim())) return res.status(400).json({ error: 'Upload a document or paste some text' });

  let client = null;
  if (client_id) {
    [client] = await query('SELECT id, name, industry FROM clients WHERE id=?', [client_id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
  }

  try {
    const content = [];
    if (req.file) content.push(await documentBlockFor(req.file));
    if (text && text.trim()) {
      content.push({ type: 'document', title: 'Pasted text', source: { type: 'text', media_type: 'text/plain', data: text } });
    }
    content.push({
      type: 'text',
      text: [
        client
          ? `Client: ${client.name}${client.industry ? ` (${client.industry})` : ''}`
          : 'Client: not specified. Work out the brand or company from the document.',
        title && title.trim() ? `Deck title: ${title.trim()}` : 'Suggest a deck title.',
        instructions && instructions.trim() ? `Instructions from the team: ${instructions.trim()}` : '',
      ].filter(Boolean).join('\n'),
    });

    // Each step is one structured-output call in the same conversation; the
    // outputs are merged. Classic decks are a single step.
    const steps = layout ? LAYOUTS[layout].steps : [{ schema: DECK_SCHEMA, prompt: () => 'Build the deck from the document above.' }];
    const messages = [];
    const deck = {};
    for (const [i, step] of steps.entries()) {
      const ask = { type: 'text', text: step.prompt(deck) };
      messages.push({ role: 'user', content: i === 0 ? [...content, ask] : [ask] });
      const out = await generateJson(layout ? LAYOUTS[layout].systemPrompt : SYSTEM_PROMPT, step.schema, messages);
      messages.push({ role: 'assistant', content: JSON.stringify(out) });
      Object.assign(deck, out);
    }
    let sections, active = [];
    if (layout) {
      sections = LAYOUTS[layout].toContent(deck);
    } else {
      ({ sections, active } = toDeckColumns(deck));
      if (!active.length) return res.status(422).json({ error: 'The AI could not find deck content in this document.' });
    }

    const deckTitle = (title && title.trim()) || deck.title || 'Untitled Deck';
    const [{ id }] = await query(
      'INSERT INTO strategies (client_id, title, sections, active_sections, doc_type, created_by, layout) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [client?.id ?? null, deckTitle, JSON.stringify(sections), JSON.stringify(active), 'strategy', created_by || null, layout]
    );
    res.json({ id });
  } catch (err) {
    if (err.userFacing) return res.status(err.status || 400).json({ error: err.message });
    console.error('Deck Creator 2.0 generate failed:', err);
    res.status(500).json({ error: 'Deck generation failed — please try again.' });
  }
});

module.exports = router;
