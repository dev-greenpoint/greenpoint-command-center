// ── Normalization ────────────────────────────────────────────────────────────
// Converts a strategies.sections[id] value (legacy plain string, or the new
// { blocks:[...] } / { subtabs:[...] } shape) into a canonical normalized form.
// Legacy plain-string content is wrapped as a single richtext block so every
// consumer (builder + both render surfaces) treats content identically.

function normalizeSection(raw) {
  if (raw == null) return { blocks: [] };
  if (typeof raw === 'string') {
    return raw.trim() ? { blocks: [{ type: 'richtext', markdown: raw }] } : { blocks: [] };
  }
  if (Array.isArray(raw.subtabs) && raw.subtabs.length) {
    return { subtabs: raw.subtabs.map(normalizeSubtab) };
  }
  if (Array.isArray(raw.blocks)) return { blocks: raw.blocks };
  return { blocks: [] };
}

function normalizeSubtab(st) {
  st = st || {};
  return {
    id: st.id || ('sub-' + Math.random().toString(36).slice(2, 8)),
    label: st.label || 'Untitled',
    active: st.active !== false,
    blocks: Array.isArray(st.blocks) ? st.blocks : [],
  };
}

function blocksHaveContent(blocks) {
  if (!Array.isArray(blocks)) return false;
  return blocks.some(b => {
    if (!b || b.draftIdea) return false;
    if (b.type === 'richtext') return !!(b.markdown && b.markdown.trim());
    if (b.type === 'image') return Array.isArray(b.images) && b.images.length > 0;
    if (b.type === 'card-grid') return Array.isArray(b.cards) && b.cards.some(c => (c.title && c.title.trim()) || (c.body && c.body.trim()));
    if (b.type === 'gantt') return Array.isArray(b.phases) && b.phases.some(p => p && p.start && p.end);
    return false;
  });
}

function sectionHasContent(normalized) {
  if (!normalized) return false;
  if (Array.isArray(normalized.subtabs)) return normalized.subtabs.some(st => blocksHaveContent(st.blocks));
  return blocksHaveContent(normalized.blocks);
}

// ── Escaping helpers (prefixed to avoid clashing with each host page's own) ──

function gpbEsc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function gpbEscAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Block renderers ──────────────────────────────────────────────────────────

function renderRichtextBlock(block) {
  const md = block.markdown || '';
  if (!md.trim()) return '';
  return `<div class="gpb-richtext">${DOMPurify.sanitize(marked.parse(md))}</div>`;
}

const IMAGE_RATIO_CSS = {
  square:   'aspect-ratio:1/1;object-fit:cover;',
  wide:     'aspect-ratio:16/9;object-fit:cover;',
  tall:     'aspect-ratio:3/4;object-fit:cover;',
  original: 'aspect-ratio:auto;object-fit:contain;height:auto;',
};

function renderImageBlock(block) {
  const images = Array.isArray(block.images) ? block.images : [];
  if (!images.length) return '';
  const layout = block.layout || 'inline';
  const imgTag = img => {
    let style = IMAGE_RATIO_CSS[img.ratio] || '';
    const sizePct = img.size ? Number(img.size) : 100;
    if (sizePct && sizePct !== 100) style += `max-width:${sizePct}%;margin-left:auto;margin-right:auto;`;
    const styleAttr = style ? ` style="${style}"` : '';
    return `<img src="${gpbEscAttr(img.src)}" alt="${gpbEscAttr(img.alt || '')}"${styleAttr}>`;
  };
  if (layout === 'hero') {
    return `<div class="gpb-image-hero">${images.map(imgTag).join('')}</div>`;
  }
  if (layout === 'grid') {
    const cols = block.columns && block.columns !== 'auto' ? Number(block.columns) : null;
    const styleAttr = cols ? ` style="--gpb-cols:repeat(${cols},1fr)"` : '';
    return `<div class="gpb-image-grid"${styleAttr}>${images.map(imgTag).join('')}</div>`;
  }
  return `<div class="gpb-image-inline">${images.map(imgTag).join('')}</div>`;
}

function renderCardGridBlock(block) {
  const cards = (Array.isArray(block.cards) ? block.cards : [])
    .filter(c => (c.title && c.title.trim()) || (c.body && c.body.trim()) || c.icon);
  if (!cards.length) return '';
  const cols = block.columns && block.columns !== 'auto' ? Number(block.columns) : null;
  const styleAttr = cols ? ` style="--gpb-cols:repeat(${cols},1fr)"` : '';
  return `<div class="gpb-card-grid"${styleAttr}>${cards.map(c => `
    <div class="gpb-card">
      ${c.icon ? `<div class="gpb-card-icon">${renderCardIcon(c.icon, 32)}</div>` : ''}
      ${c.title ? `<div class="gpb-card-title">${gpbEsc(c.title)}</div>` : ''}
      ${c.body ? `<div class="gpb-card-body">${gpbEsc(c.body)}</div>` : ''}
    </div>`).join('')}</div>`;
}

function gpbFormatDate(d) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderGanttBlock(block) {
  const phases = (Array.isArray(block.phases) ? block.phases : []).filter(p => p && p.start && p.end);
  if (!phases.length) return '<p class="gpb-empty">No phases yet.</p>';

  const toDate = s => new Date(s + 'T00:00:00');
  const starts = phases.map(p => toDate(p.start));
  const ends = phases.map(p => toDate(p.end));
  let minDate = new Date(Math.min(...starts));
  let maxDate = new Date(Math.max(...ends));
  minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const totalDays = Math.max(1, (maxDate - minDate) / 86400000);
  const pctOf = d => (d - minDate) / 86400000 / totalDays * 100;

  const useMonths = totalDays > 90;
  const gridlines = [];
  if (useMonths) {
    let cur = new Date(minDate);
    while (cur <= maxDate) {
      gridlines.push({ pct: pctOf(cur), label: cur.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }) });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    let cur = new Date(minDate);
    while (cur <= maxDate) {
      gridlines.push({ pct: pctOf(cur), label: cur.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) });
      cur = new Date(cur.getTime() + 7 * 86400000);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showToday = today >= minDate && today <= maxDate;
  const todayPct = showToday ? pctOf(today) : null;

  const rows = phases.map(p => {
    const s = toDate(p.start), e = toDate(p.end);
    const leftPct = pctOf(s);
    const widthPct = Math.max(pctOf(e) - leftPct, 1.5);
    return `
      <div class="gpb-gantt-row">
        <div class="gpb-gantt-row-label">
          <div class="gpb-gantt-row-title">${gpbEsc(p.title || 'Untitled phase')}</div>
          <div class="gpb-gantt-row-dates">${gpbFormatDate(s)} – ${gpbFormatDate(e)}</div>
        </div>
        <div class="gpb-gantt-row-track">
          <div class="gpb-gantt-bar" style="left:${leftPct}%;width:${widthPct}%" title="${gpbEscAttr(p.title || '')}"></div>
        </div>
        ${p.notes ? `<div class="gpb-gantt-row-notes">${gpbEsc(p.notes)}</div>` : ''}
      </div>`;
  }).join('');

  const axisHtml = `<div class="gpb-gantt-axis">
    ${gridlines.map(g => `<div class="gpb-gantt-gridline" style="left:${g.pct}%"><span>${gpbEsc(g.label)}</span></div>`).join('')}
    ${todayPct != null ? `<div class="gpb-gantt-today" style="left:${todayPct}%" title="Today"></div>` : ''}
  </div>`;

  return `<div class="gpb-gantt">${axisHtml}<div class="gpb-gantt-rows">${rows}</div></div>`;
}

// ── Top-level dispatch ───────────────────────────────────────────────────────

function renderBlocks(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return '<p class="gpb-empty">No content yet.</p>';
  }
  const html = blocks.map(block => {
    if (!block || block.draftIdea) return '';
    switch (block.type) {
      case 'richtext':  return renderRichtextBlock(block);
      case 'image':     return renderImageBlock(block);
      case 'card-grid': return renderCardGridBlock(block);
      case 'gantt':     return renderGanttBlock(block);
      default:          return '';
    }
  }).join('');
  return html.trim() ? html : '<p class="gpb-empty">No content yet.</p>';
}

// Renders a normalized section value. opts:
//   activeSubtabId  - which sub-tab is currently selected (parent sections only)
//   topId           - the parent section's id, passed back into onSubtabClick
//   onSubtabClick   - name of a page-local function(topId, subtabId) to call on tab click
function renderSection(sectionValue, opts) {
  opts = opts || {};
  if (sectionValue && Array.isArray(sectionValue.subtabs) && sectionValue.subtabs.length) {
    const subtabs = sectionValue.subtabs.filter(st => st.active !== false);
    if (!subtabs.length) return '<p class="gpb-empty">No content yet.</p>';
    let activeId = opts.activeSubtabId;
    if (!activeId || !subtabs.some(st => st.id === activeId)) activeId = subtabs[0].id;
    const activeSt = subtabs.find(st => st.id === activeId) || subtabs[0];
    const tabsHtml = `<div class="gpb-subtab-bar">${subtabs.map(st => `
      <button class="gpb-subtab-btn ${st.id === activeId ? 'active' : ''}"
        onclick="${opts.onSubtabClick ? `${opts.onSubtabClick}('${opts.topId || ''}','${st.id}')` : ''}">${gpbEsc(st.label)}</button>
    `).join('')}</div>`;
    return `${tabsHtml}<div class="gpb-subtab-content">${renderBlocks(activeSt.blocks)}</div>`;
  }
  return renderBlocks((sectionValue && sectionValue.blocks) || []);
}
