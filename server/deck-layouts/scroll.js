// "Scroll presentation" layout for Deck Creator 2.0 — a single long page
// (hero → brief → how it works → campaign spine → phases → channel plan →
// close), designed in Claude Design as "Greenpoint Scroll Presentation".
// The browser half (rendering + inline editing) is
// client/components/deck-layouts/scroll.js; both share the content shape the
// schema below describes, stored as JSON in strategies.sections.

const str = (description) => (description ? { type: 'string', description } : { type: 'string' });
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const arr = (items, description) => (description ? { type: 'array', items, description } : { type: 'array', items });
const num = (description) => ({ type: 'number', description });

// Shared guidance for image descriptions (matches the image-prompt writer in
// routes/deck-ai.js); the deck-wide photo style is added when generating.
const IMAGE_GUIDE = 'Describe the subject, setting and composition in 1–2 sentences, not the photo style. Prefer hands, objects, places, and people from behind or at a distance; no close-up faces or identifiable children; no text, signs or logos.';

const SCALE = 'Position on the month scale: 0 = start of the first month, 1 = end of the first month, 2.5 = middle of the third month.';

const MAIN = {
  title: str('Deck title, e.g. "Brand — Campaign Name".'),
  date_range: str('Campaign dates, e.g. "Oct – Dec 2026". Empty if the document gives none.'),
  months: arr(str(), 'Timeline column labels, one per month the campaign spans, e.g. ["Oct","Nov","Dec"]. Use "Mth 1", "Mth 2"… when there are durations but no dates.'),
  hero: obj({
    presenter: str('Small line above the headline, e.g. "Harbourside Coffee presents" or "A plan for Harbourside Coffee".'),
    headline: arr(str(), 'The big uppercase title, 1–3 short lines of 1–2 words each.'),
    objective: str('Two or three sentences: what the campaign has to achieve and how.'),
    stats: arr(obj({ label: str('e.g. "Budget", "Duration", "Target"'), value: str() }), 'Up to 3 headline facts.'),
    image_prompt: str(`Background photo for the hero, for an image generator. ${IMAGE_GUIDE}`),
  }),
  brief: obj({
    show: { type: 'boolean' },
    label: str('Small section label, e.g. "The brief".'),
    aside: str('One short line under the label, e.g. "What we are making, and what it has to do."'),
    statement: str('The single sentence that frames the whole plan.'),
    terms: arr(obj({ term: str('Short label, e.g. "Client", "Scope", "Timing", "The ask"'), detail: str('One short line') }), '3–5 short facts about the job: who the client is, our scope, timing, the ask. Not background, challenges, opportunities, audiences, messages, objectives, risks or budget: those get their own sections in a later step.'),
    list_label: str('Label for the list, e.g. "What success looks like".'),
    list: arr(str(), 'Short one-line items.'),
    open_items: arr(obj({ text: str(), tag: str('e.g. "TBD", "To confirm"') }), 'Things still to be decided, if any.'),
  }),
  mechanic: obj({
    show: { type: 'boolean' },
    label: str('e.g. "How it works"'),
    headline: str('One sentence introducing the steps, e.g. "Three words the whole campaign has to teach."'),
    steps: arr(obj({ word: str('ONE word, shown huge'), line: str('One line explaining it') }), 'Usually exactly 3.'),
  }),
  spine: obj({
    show: { type: 'boolean' },
    label: str('e.g. "The phases"'),
    headline: str('Short uppercase title, e.g. "The campaign spine".'),
    intro: str('One or two sentences on how the phases work together.'),
  }),
  phases: arr(obj({
    title: str('Short phase name'),
    timing: str('e.g. "Oct – mid Nov" or "Weeks 1–6"'),
    start: num(SCALE),
    end: num(SCALE),
    summary: str('One line on what this phase is for (shown in the overview).'),
    role: str('One or two sentences on what this phase has to achieve.'),
    deliverables: arr(obj({
      label: str('Small label, e.g. "Hero content", "Media pitch"'),
      format: str('Short format tag, e.g. "Reel", "EDM", "Event". Empty if none.'),
      headline: str('The title of this piece.'),
      body: str('Two to four lines describing it and why it works.'),
      image_ratio: { type: 'string', enum: ['16:9', '9:16', 'none'], description: '16:9 for wide visuals, 9:16 for vertical social video, none when no visual fits.' },
      image_prompt: str(`The visual for an image generator; empty when image_ratio is none. ${IMAGE_GUIDE}`),
      includes: arr(str(), 'Everything the document says is included, as short items.'),
      end_card: arr(str(), 'Optional 2–3 short punchy lines for a video end card; empty otherwise.'),
    })),
  }), '2–5 phases in order. The last phase is presented as the finale.'),
  closing: obj({
    overline: str('Small line above the closing statement.'),
    lines: arr(str(), '2–3 very short uppercase lines ending with full stops, e.g. ["Brewed.", "Local.", "Loved."]. The last is highlighted.'),
  }),
};

// Final check: anything from the document the deck still leaves out.
// Extra sections the AI adds when the document has content the fixed
// sections don't cover (audiences, key messages, objectives, risks…).
const EXTRA_AFTER = ['brief', 'mechanic', 'phases', 'channels'];
const EXTRAS = {
  extras: arr(obj({
    after: { type: 'string', enum: EXTRA_AFTER, description: 'Where it goes: after the brief, after "How it works", after the phases, or after the channel plan.' },
    style: { type: 'string', enum: ['cards', 'rows', 'list'], description: 'cards: 2–6 items shown as cards with a title and a few lines (audiences, pillars, objectives with targets). rows: label on the left, detail on the right (key messages with proof, budget lines, KPIs, objections and answers). list: short one-line points (risks, next steps, things to avoid).' },
    label: str('Small section label, e.g. "Audience". Also used in the top menu, so 1–2 words.'),
    headline: str('Short uppercase title, e.g. "Who we are talking to".'),
    intro: str('Optional one or two sentences under the title. Empty if not needed.'),
    entries: arr(obj({ title: str('Card title, row label or list point'), detail: str('Card text or row detail. Empty for simple list points.') })),
  }), 'One section per distinct topic the document covers that the deck so far does not have a proper place for, in the order they should appear. Usually 0–6. Empty if everything already fits.'),
};

const GAPS = {
  facts: arr(obj({
    fact: str('One distinct fact from the document, e.g. "Competitor: Sonoma" or "Budget: Paid social boost $3,000"'),
    in_deck: { type: 'boolean', description: 'true only if this exact fact (including its figure or name) already appears in the deck written above' },
    term: str('Short label for The Brief if it is missing, e.g. "Competitors", "Reporting", "Budget"'),
  }), 'Every distinct fact in the document, in document order: each budget line, competitor, report, audience, message, proof point, figure, date, quantity and name separately.'),
};

const CHANNELS = {
  channels: obj({
    show: { type: 'boolean' },
    label: str('e.g. "Channels"'),
    headline: str('Short uppercase title, e.g. "Channel plan".'),
    tabs: arr(obj({
      label: str('Tab name'),
      kind: { type: 'string', enum: ['gantt', 'schedule', 'cards', 'objectives'], description: 'gantt: rows of bars on the month scale. schedule: list of timing + title + phase tag. cards: month/type + headline + description. objectives: month + objective.' },
      rows: arr(obj({ label: str(), start: num(SCALE), end: num(SCALE), tone: { type: 'string', enum: ['sage', 'ink', 'muted'], description: 'sage = phase work, ink = finale, muted = always-on/ongoing' } }), 'For gantt tabs only; empty otherwise.'),
      items: arr(obj({ meta: str('Timing, or "Month · Type", or month'), title: str(), body: str('cards only; empty otherwise'), tag: str('schedule only, e.g. "Phase 01"; empty otherwise') }), 'For schedule/cards/objectives tabs; empty for gantt.'),
    }), '1–4 tabs.'),
  }),
};


const SYSTEM_PROMPT = `You turn client documents into scrolling web presentations for Greenpoint Media, an Australian PR, social and marketing agency. The presentation is one long page read top to bottom:

1. Hero: presenter line, a huge 1–3 line uppercase headline, an objective paragraph and up to 3 key facts.
2. The brief: a short summary of the job, not the whole strategy. One framing statement, 3–5 short facts, a short list (what we are delivering, or what success looks like) and any open items.
3. How it works: a few single words (usually three) that capture the campaign's mechanic, each shown huge with one line of explanation.
4. Campaign spine: the phases on a month-by-month timeline.
5. One section per phase, with its deliverables.
6. Channel plan: 1–4 tabs (gantt timeline, schedule list, cards, or monthly objectives).
7. Closing: a short, punchy uppercase sign-off.

Set a section's "show" to false when the document gives nothing real for it, and leave its fields empty. Use all the information in the document. Every fact, figure, name, date, audience, key message, deliverable, channel, budget line and target should appear somewhere in the deck. Content with no standard section (audiences, key messages, objectives and KPIs, objections, risks, budget, next steps) gets its own extra section in a later step, so keep the brief about the job itself. Keep the wording concise: tighten the words, never drop the substance. Headlines and closing lines are short and punchy. Place phases and gantt rows on the month scale so they line up with "months".

Write in Australian English with a confident agency voice. Stay faithful to the document: restructure and present all of its content well, but don't invent facts, figures, names, prices or dates it doesn't contain.`;

// The whole schema is too large for one strict structured-output grammar, so
// generation runs in steps: the deck, the channel plan (told the months and
// phases step 1 chose, so its timeline lines up), extra sections for topics
// the fixed sections don't cover, then a gap check for anything still missing.
const STEPS = [
  { schema: obj(MAIN), prompt: () => 'Build the presentation from the document above. Leave out the channel plan — it is written separately.' },
  // Channel plan and extra sections only depend on step 1, so they run in parallel.
  [{
    schema: obj(CHANNELS),
    prompt: prev => `Now write only the channel plan section for this presentation.
Timeline months: ${JSON.stringify(prev.months)}
Phases: ${prev.phases.map((p, i) => `${i + 1}. ${p.title} (${p.timing}; ${p.start}–${p.end} on the month scale)`).join('; ')}`,
  },
  {
    schema: obj(EXTRAS),
    prompt: () => 'Now add extra sections for any topics in the document that the deck above has no proper place for, e.g. the situation (background, challenges, opportunities), audiences, key messages and proof points, objectives and KPIs, objections, risks, budget, next steps. Give each its own section with the best style, and put it where it reads best. Carry every item across. Don\'t repeat what is already in the deck.',
  }],
  {
    schema: obj(GAPS),
    prompt: () => 'Finally, go through the document from top to bottom and list every distinct fact in it, one per item. For each, check whether it already appears in the deck you wrote above. Facts that are missing get added to The Brief. Skip document housekeeping: who prepared it, draft status, version, sources and notes to the reader.',
  },
];

// The gap check often marks facts missing that are already in the deck, so
// also skip any fact whose key words (4+ letters, and all numbers) already
// appear in the deck text.
const words = t => (String(t).toLowerCase().match(/[a-z]{4,}|\d[\d,.%$]*/g) || []);
function alreadyInDeck(fact, deckText) {
  const w = [...new Set(words(fact))];
  if (!w.length) return true;
  const nums = w.filter(x => /\d/.test(x));
  if (nums.some(n => !deckText.includes(n))) return false;
  return w.filter(x => deckText.includes(x)).length / w.length >= 0.75;
}

function missingTerms(facts, deckText) {
  const groups = new Map();
  for (const f of facts || []) {
    if (f.in_deck || alreadyInDeck(f.fact.replace(/^[^:]{1,30}:\s*/, ''), deckText)) continue;
    const term = (f.term || 'Also').trim();
    const detail = f.fact.replace(/^[^:]{1,30}:\s*(?=\S)/, '').trim(); // "Competitor: Sonoma" → "Sonoma"
    groups.set(term, [...(groups.get(term) || []), detail]);
  }
  return [...groups].map(([term, details]) => ({ term, detail: details.join('; ') }));
}

// Claude's output → the stored content (adds the fields the AI doesn't fill:
// uploaded image URLs, client logo, nav labels, footer).
function toContent(out) {
  const image = (prompt) => ({ url: '', prompt: prompt || '' });
  const { facts, ...deckOnly } = out;
  const missing = missingTerms(facts, JSON.stringify(deckOnly).toLowerCase());
  return {
    date_range: out.date_range || '',
    months: out.months?.length ? out.months : ['Mth 1', 'Mth 2', 'Mth 3'],
    client_logo: '',
    hero: {
      presenter: out.hero.presenter,
      headline: out.hero.headline,
      objective: out.hero.objective,
      stats: out.hero.stats.slice(0, 3),
      image: image(out.hero.image_prompt),
    },
    brief: { ...out.brief, nav: 'The Brief' },
    mechanic: { ...out.mechanic, nav: 'How It Works' },
    spine: { ...out.spine, nav: 'The Phases' },
    phases: out.phases.map(p => ({
      ...p,
      deliverables: p.deliverables.map(({ image_prompt, ...d }) => ({ ...d, image: image(image_prompt) })),
    })),
    channels: { ...out.channels, nav: 'Channel Plan' },
    // Drop malformed entries (no real words), then sections left with nothing.
    // Facts the gap check found missing get their own closing section (grouped
    // by label) so nothing from the document is lost.
    extras: [
      ...(out.extras || [])
        .map(x => ({ ...x, show: true, entries: x.entries.filter(e => /[a-z0-9]/i.test(e.title) || /[a-z0-9]{3}/i.test(e.detail)) }))
        .filter(x => x.entries.length || /[a-z]/i.test(x.intro)),
      ...(missing.length ? [{ show: true, after: 'channels', style: 'rows', label: 'Also', headline: 'Also worth knowing', intro: '', entries: missing.map(m => ({ title: m.term, detail: m.detail })) }] : []),
    ],
    closing: out.closing,
    footer: { email: 'hello@greenpointmedia.com.au' },
  };
}

// Starting point for a deck built by hand ("Build it yourself"): every slot
// empty, so the editor shows its placeholder text to type over.
function blank() {
  const image = () => ({ url: '', prompt: '' });
  const deliverable = () => ({ label: '', format: '', headline: '', body: '', image_ratio: '16:9', image: image(), includes: [''], end_card: [] });
  return {
    date_range: '',
    months: ['Mth 1', 'Mth 2', 'Mth 3'],
    client_logo: '',
    hero: { presenter: '', headline: ['', ''], objective: '', stats: [{ label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }], image: image() },
    brief: { show: true, nav: 'The Brief', label: 'The brief', aside: '', statement: '', terms: [{ term: '', detail: '' }, { term: '', detail: '' }, { term: '', detail: '' }], list_label: '', list: ['', '', ''], open_items: [] },
    mechanic: { show: true, nav: 'How It Works', label: 'How it works', headline: '', steps: [{ word: '', line: '' }, { word: '', line: '' }, { word: '', line: '' }] },
    spine: { show: true, nav: 'The Phases', label: 'The phases', headline: 'The campaign spine', intro: '' },
    phases: [0, 1, 2].map(i => ({ title: `Phase ${i + 1}`, timing: '', start: i, end: i + 1, summary: '', role: '', deliverables: [deliverable()] })),
    channels: { show: true, nav: 'Channel Plan', label: 'Channels', headline: 'Channel plan', tabs: [{ label: 'Timeline', kind: 'gantt', rows: [{ label: '', start: 0, end: 3, tone: 'sage' }], items: [] }] },
    extras: [],
    closing: { overline: '', lines: ['', ''] },
    footer: { email: 'hello@greenpointmedia.com.au' },
  };
}

// Plain-text backup of a deck (Download → Word doc): every field, section by
// section, in the order the deck reads. Blocks are for server/lib/docx.js.
function toDocument(d, title) {
  const out = [];
  const has = v => v != null && String(v).trim() !== '';
  const push = (type, text) => { if (has(text)) out.push({ type, text: String(text).trim() }); };
  const kv = (label, text) => { if (has(text)) out.push({ type: 'kv', label, text: String(text).trim() }); };
  const list = items => (items || []).filter(has).forEach(t => push('bullet', t));
  const months = d.months && d.months.length ? d.months : [];
  const at = (x, end) => {
    if (!months.length) return '';
    const i = Math.max(0, Math.min(months.length - 1, end ? Math.ceil(Number(x) || 0) - 1 : Math.floor(Number(x) || 0)));
    return months[i];
  };
  const span = (a, b) => (!months.length ? '' : at(a) === at(b, true) ? at(a) : `${at(a)} – ${at(b, true)}`);
  const extras = key => (d.extras || []).filter(x => (x.after || 'channels') === key).forEach(x => {
    push('h1', `${x.label || x.headline || 'Section'}${x.show === false ? ' (hidden in the deck)' : ''}`);
    kv('Header', x.headline);
    push('p', x.intro);
    (x.entries || []).filter(e => has(e.title) || has(e.detail)).forEach(e => (has(e.detail) ? kv(e.title || '•', e.detail) : push('bullet', e.title)));
  });
  const heading = (sec, fallback) => `${(sec && (sec.nav || sec.label)) || fallback}${sec && sec.show === false ? ' (hidden in the deck)' : ''}`;

  push('title', title || 'Untitled deck');
  kv('Dates', d.date_range);

  const h = d.hero || {};
  push('h1', 'Opening screen');
  kv('Presenter line', h.presenter);
  kv('Headline', (h.headline || []).filter(has).join(' / '));
  kv('Objective', h.objective);
  (h.stats || []).forEach(st => kv(st.label || 'Key fact', st.value));
  kv('Background image idea', h.image && h.image.prompt);

  const b = d.brief || {};
  push('h1', heading(b, 'The Brief'));
  kv('Section label', b.label);
  kv('Side note', b.aside);
  kv('Approach statement', b.statement);
  (b.terms || []).forEach(t => kv(t.term || 'Detail', t.detail));
  if ((b.list || []).some(has)) { push('h3', b.list_label || 'List'); list(b.list); }
  if ((b.open_items || []).some(o => has(o.text))) {
    push('h3', 'Still to be confirmed');
    b.open_items.filter(o => has(o.text)).forEach(o => push('bullet', `${o.text}${has(o.tag) ? ` (${o.tag})` : ''}`));
  }

  extras('brief');

  const m = d.mechanic || {};
  push('h1', heading(m, 'How It Works'));
  kv('Section label', m.label);
  kv('Intro', m.headline);
  (m.steps || []).filter(st => has(st.word) || has(st.line)).forEach(st => push('bullet', [st.word, st.line].filter(has).join(': ')));

  extras('mechanic');

  const sp = d.spine || {};
  push('h1', heading(sp, 'The Phases'));
  kv('Section label', sp.label);
  kv('Header', sp.headline);
  kv('Intro', sp.intro);
  kv('Months', months.join(', '));

  (d.phases || []).forEach((p, i) => {
    push('h2', `Phase ${i + 1}: ${p.title || 'Untitled'}`);
    kv('Timing', p.timing);
    kv('On the timeline', span(p.start, p.end));
    kv('Summary', p.summary);
    kv('What it has to achieve', p.role);
    (p.deliverables || []).forEach((dv, j) => {
      push('h3', `Deliverable ${j + 1}${has(dv.label) ? `: ${dv.label}` : ''}`);
      kv('Format', dv.format);
      kv('Headline', dv.headline);
      kv('Description', dv.body);
      const ratio = { '16:9': 'Wide (16:9)', '9:16': 'Vertical (9:16)', none: 'No image' }[dv.image_ratio];
      kv('Image', [ratio, dv.image && dv.image.prompt].filter(has).join(': '));
      if ((dv.includes || []).some(has)) { push('p', 'Includes:'); list(dv.includes); }
      kv('End card', (dv.end_card || []).filter(has).join(' / '));
    });
  });

  extras('phases');

  const c = d.channels || {};
  push('h1', heading(c, 'Channel Plan'));
  kv('Section label', c.label);
  kv('Header', c.headline);
  const KIND = { gantt: 'Timeline', schedule: 'Schedule', cards: 'Cards', objectives: 'Objectives' };
  const TONE = { sage: 'phase', ink: 'finale', muted: 'ongoing' };
  (c.tabs || []).forEach(t => {
    push('h3', `${t.label || 'Tab'} (${KIND[t.kind] || t.kind})`);
    if (t.kind === 'gantt') {
      (t.rows || []).filter(r => has(r.label)).forEach(r => push('bullet', `${r.label}: ${span(r.start, r.end)}${TONE[r.tone] ? ` (${TONE[r.tone]})` : ''}`));
    } else {
      (t.items || []).filter(it => has(it.title) || has(it.meta)).forEach(it => push('bullet', [it.meta, it.title, it.body, it.tag].filter(has).join(' | ')));
    }
  });

  const cl = d.closing || {};
  extras('channels');

  push('h1', 'Closing');
  kv('Small line above', cl.overline);
  kv('Closing lines', (cl.lines || []).filter(has).join(' / '));
  kv('Contact email', d.footer && d.footer.email);
  return out;
}

module.exports = { label: 'Scroll presentation', steps: STEPS, systemPrompt: SYSTEM_PROMPT, toContent, blank, toDocument };
