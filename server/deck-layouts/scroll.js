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
    image_prompt: str('Description of a background photo for the hero, for an image generator. No text in the image.'),
  }),
  brief: obj({
    show: { type: 'boolean' },
    label: str('Small section label, e.g. "The brief".'),
    aside: str('One short line under the label, e.g. "What we are making, and what it has to do."'),
    statement: str('The single sentence that frames the whole plan.'),
    terms: arr(obj({ term: str('Short label, e.g. "Audience", "Budget", "Deadline"'), detail: str('One line') }), '2–5 key facts.'),
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
      image_prompt: str('Description of the visual for an image generator; empty when image_ratio is none.'),
      includes: arr(str(), 'What is included, 0–6 short items.'),
      end_card: arr(str(), 'Optional 2–3 short punchy lines for a video end card; empty otherwise.'),
    })),
  }), '2–5 phases in order. The last phase is presented as the finale.'),
  closing: obj({
    overline: str('Small line above the closing statement.'),
    lines: arr(str(), '2–3 very short uppercase lines ending with full stops, e.g. ["Brewed.", "Local.", "Loved."]. The last is highlighted.'),
  }),
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
2. The brief: a framing statement, key terms, a short list and any open items.
3. How it works: a few single words (usually three) that capture the campaign's mechanic, each shown huge with one line of explanation.
4. Campaign spine: the phases on a month-by-month timeline.
5. One section per phase, with its deliverables.
6. Channel plan: 1–4 tabs (gantt timeline, schedule list, cards, or monthly objectives).
7. Closing: a short, punchy uppercase sign-off.

Set a section's "show" to false when the document gives nothing real for it, and leave its fields empty. Keep text tight: this is a presentation, not a report. Headlines and closing lines are short and punchy. Place phases and gantt rows on the month scale so they line up with "months".

Write in Australian English with a confident agency voice. Stay faithful to the document: restructure, tighten and present its content well, but don't invent facts, figures, names, prices or dates it doesn't contain.`;

// The whole schema is too large for one strict structured-output grammar, so
// generation runs in two steps: the deck, then the channel plan (which is
// told the months and phases step 1 chose, so its timeline lines up).
const STEPS = [
  { schema: obj(MAIN), prompt: () => 'Build the presentation from the document above. Leave out the channel plan — it is written separately.' },
  {
    schema: obj(CHANNELS),
    prompt: prev => `Now write only the channel plan section for this presentation.
Timeline months: ${JSON.stringify(prev.months)}
Phases: ${prev.phases.map((p, i) => `${i + 1}. ${p.title} (${p.timing}; ${p.start}–${p.end} on the month scale)`).join('; ')}`,
  },
];

// Claude's output → the stored content (adds the fields the AI doesn't fill:
// uploaded image URLs, client logo, nav labels, footer).
function toContent(out) {
  const image = (prompt) => ({ url: '', prompt: prompt || '' });
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
    closing: { overline: '', lines: ['', ''] },
    footer: { email: 'hello@greenpointmedia.com.au' },
  };
}

module.exports = { label: 'Scroll presentation', steps: STEPS, systemPrompt: SYSTEM_PROMPT, toContent, blank };
