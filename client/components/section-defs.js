const SECTION_DEFS = [
  // Foundation
  { id: 'overview',      label: 'Overview & Situation',  group: 'Foundation', hint: 'Situation analysis, background context, and campaign objectives' },
  { id: 'strategy',      label: 'Strategic Approach',    group: 'Foundation', hint: 'The overarching strategy — pillars, positioning, and rationale' },
  { id: 'audiences',     label: 'Target Audiences',      group: 'Foundation', hint: 'Who we are reaching — demographics, psychographics, and priorities' },
  { id: 'messages',      label: 'Key Messages',          group: 'Foundation', hint: 'Core messages each audience should understand, feel, or act on' },
  // Channels
  { id: 'tactical_plan', label: 'Tactical Plan',         group: 'Channels',   hint: 'Channel mix and tactical overview — how we bring the strategy to life' },
  { id: 'pr',            label: 'PR Campaigns',          group: 'Channels',   hint: 'Press angles, story hooks, target media, journalists, and pitch timing' },
  { id: 'social',        label: 'Social Media',          group: 'Channels',   hint: 'Organic social strategy — platforms, content approach, posting cadence' },
  { id: 'content',       label: 'Content Pillars',       group: 'Channels',   hint: 'Content categories, themes, shoot plan, and brand voice guidelines' },
  { id: 'events',        label: 'Events & Activations',  group: 'Channels',   hint: 'Event concepts, launch moments, display suite, public activations' },
  { id: 'partnerships',  label: 'Partnerships',          group: 'Channels',   hint: 'Brand partners, influencers, collaborations, and co-marketing targets' },
  { id: 'paid',          label: 'Paid Media',            group: 'Channels',   hint: 'Paid channel plan — platforms, budget approach, ad formats, targeting' },
  { id: 'design',        label: 'Design',                group: 'Channels',   hint: 'Design direction, brand assets, visual identity, and creative deliverables' },
  { id: 'email',         label: 'Email & CRM',           group: 'Channels',   hint: 'Database segmentation, campaign sequences, nurture logic, and send cadence' },
  { id: 'moodboard',     label: 'Moodboard',             group: 'Channels',   hint: 'Visual direction — mood, colour palette, typography, and references' },
  // Execution
  { id: 'timeline',      label: 'Timeline & Phasing',    group: 'Execution',  hint: 'Campaign phases, key milestones, and delivery schedule' },
  { id: 'measurement',   label: 'Measurement & KPIs',    group: 'Execution',  hint: 'Success metrics, targets, benchmarks, and reporting cadence' },
  { id: 'budget',        label: 'Budget',                group: 'Execution',  hint: 'Budget breakdown by line item, with totals and assumptions' },
  // Workshop (deck-specific)
  { id: 'agenda',        label: 'Agenda',                 group: 'Workshop',  hint: 'Running order for the workshop session' },
  { id: 'discovery',     label: 'Discovery',               group: 'Workshop', hint: 'Brand discovery questions, grouped by theme' },
  { id: 'immersion',     label: 'Immersion',              group: 'Workshop',  hint: 'Immersion framework — stages and what each uncovers' },
  { id: 'next_steps',    label: 'Next Steps',             group: 'Workshop',  hint: 'Agreed next steps, owners, and due dates' },
];

const DEFAULT_ACTIVE = ['overview', 'strategy', 'audiences', 'messages', 'timeline'];

const GROUP_ORDER = ['Foundation', 'Channels', 'Execution', 'Workshop'];

// A "workshop" doc only ever shows the Workshop group (matching
// DECK_TYPE_SECTIONS['kickoff-workshop'] in server/routes/strategies.js);
// a plain "strategy" doc shows everything except Workshop.
function sectionDefsForDocType(docType) {
  return docType === 'workshop'
    ? SECTION_DEFS.filter(d => d.group === 'Workshop')
    : SECTION_DEFS.filter(d => d.group !== 'Workshop');
}

// Returns SECTION_DEFS filtered to activeSectionIds, ordered by GROUP_ORDER,
// and within each group ordered by position in activeSectionIds (so drag-reorder
// within a group is reflected), falling back to SECTION_DEFS order for ids that
// haven't been repositioned.
function orderSectionsForDisplay(activeSectionIds) {
  const active = activeSectionIds || [];
  const byGroup = {};
  for (const def of SECTION_DEFS) {
    if (!active.includes(def.id)) continue;
    if (!byGroup[def.group]) byGroup[def.group] = [];
    byGroup[def.group].push(def);
  }
  const result = [];
  for (const group of GROUP_ORDER) {
    const defs = byGroup[group];
    if (!defs || !defs.length) continue;
    const ordered = [...defs].sort((a, b) => {
      const ai = active.indexOf(a.id);
      const bi = active.indexOf(b.id);
      return ai - bi;
    });
    result.push(...ordered);
  }
  return result;
}
