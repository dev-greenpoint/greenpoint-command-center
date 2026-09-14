// ── Shared contenteditable rich-text editor ──────────────────────────────────
// Hand-rolled Google-Doc-style WYSIWYG editing for Deck Creator content fields
// (richtext blocks, card-grid body, gantt notes, deck-level Notes). No
// third-party editor library — uses document.execCommand, matching this
// codebase's "no framework, no build step" philosophy. Loaded only by
// strategy-builder.html (the only page that ever instantiates an editor;
// client-board.html / strategy-view.html are read-only render consumers).
//
// Usage: initRichEditor(containerEl, { initialHtml, onChange, toolbar })
//   toolbar: 'basic' (Bold/Italic/Underline — gantt notes, deck notes),
//   'card' (+ Font size/Align — card-grid body), or 'full' (+ Heading/Lists —
//   richtext blocks). Headings/lists are richtext-only (don't fit a short
//   card blurb); font size/align are offered on both 'card' and 'full'.
//   onChange(sanitizedHtml) fires on every edit (debounced by the caller via
//   its own scheduleSave(), same as the old textarea oninput handlers).

const RICH_EDITOR_PASTE_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a'];
const RICH_EDITOR_PASTE_ATTR = ['href'];

// Font-size buttons apply a fixed px value to the selection (see
// applyFontSize below); the 'A' label is pre-sized per option as a visual
// size preview, same trick as the B/I/U buttons previewing their own effect.
const RICH_EDITOR_FONT_SIZES = [
  { cmd: 'size11', px: 11, preview: 10, title: 'Small' },
  { cmd: 'size13', px: 13, preview: 12, title: 'Normal' },
  { cmd: 'size16', px: 16, preview: 14, title: 'Large' },
  { cmd: 'size22', px: 22, preview: 17, title: 'Huge' },
];

const RICH_EDITOR_BIU = [
  { cmd: 'bold', label: 'B', style: 'font-weight:700;', title: 'Bold' },
  { cmd: 'italic', label: 'I', style: 'font-style:italic;', title: 'Italic' },
  { cmd: 'underline', label: 'U', style: 'text-decoration:underline;', title: 'Underline' },
];
const RICH_EDITOR_SIZE_BTNS = RICH_EDITOR_FONT_SIZES.map(s => ({ cmd: s.cmd, label: 'A', style: `font-size:${s.preview}px;`, title: s.title }));
const RICH_EDITOR_ALIGN_BTNS = [
  { cmd: 'alignLeft', label: 'L', title: 'Align left' },
  { cmd: 'alignCenter', label: 'C', title: 'Align center' },
  { cmd: 'alignRight', label: 'R', title: 'Align right' },
];

const RICH_EDITOR_TOOLBARS = {
  // Compact fields (gantt notes, deck notes) — inline emphasis only.
  basic: [...RICH_EDITOR_BIU],
  // Card-grid body — adds size/align, but no headings/lists (doesn't fit a
  // short card blurb the way it fits a full richtext block).
  card: [...RICH_EDITOR_BIU, { sep: true }, ...RICH_EDITOR_SIZE_BTNS, { sep: true }, ...RICH_EDITOR_ALIGN_BTNS],
  // Richtext blocks — the full document-style toolbar.
  full: [
    ...RICH_EDITOR_BIU,
    { sep: true },
    ...RICH_EDITOR_SIZE_BTNS,
    { sep: true },
    { cmd: 'h2', label: 'H2', title: 'Heading' },
    { cmd: 'h3', label: 'H3', title: 'Subheading' },
    { cmd: 'ul', label: '☰', title: 'Bullet list' },
    { cmd: 'ol', label: '1.', title: 'Numbered list' },
    { sep: true },
    ...RICH_EDITOR_ALIGN_BTNS,
  ],
};

const RICH_EDITOR_JUSTIFY_CMD = { alignLeft: 'justifyLeft', alignCenter: 'justifyCenter', alignRight: 'justifyRight' };

function initRichEditor(containerEl, opts) {
  opts = opts || {};
  const toolbarKind = RICH_EDITOR_TOOLBARS[opts.toolbar] ? opts.toolbar : 'basic';
  const buttons = RICH_EDITOR_TOOLBARS[toolbarKind];

  function updateToolbarState() {
    toolbar.querySelectorAll('.gpe-btn').forEach(btn => {
      const cmd = btn.dataset.cmd;
      let active = false;
      try {
        if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') active = document.queryCommandState(cmd);
        else if (cmd === 'h2' || cmd === 'h3') active = (document.queryCommandValue('formatBlock') || '').toLowerCase() === cmd;
        else if (cmd === 'ul') active = document.queryCommandState('insertUnorderedList');
        else if (cmd === 'ol') active = document.queryCommandState('insertOrderedList');
        else if (RICH_EDITOR_JUSTIFY_CMD[cmd]) active = document.queryCommandState(RICH_EDITOR_JUSTIFY_CMD[cmd]);
        // Font-size buttons (cmd starts with 'size') have no reliable active
        // state to read back from a plain <span style> — left unhighlighted.
      } catch (e) { /* queryCommandState can throw when the selection is out of scope */ }
      btn.classList.toggle('active', active);
    });
  }

  function applyFontSize(px) {
    // execCommand has no clean way to set an exact pixel font-size, so this
    // uses the standard workaround: mark the selection with the legacy
    // <font size="7"> (the one value HTML doesn't otherwise use), then swap
    // each resulting <font> for a <span style="font-size:...">.
    document.execCommand('fontSize', false, '7');
    containerEl.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = px + 'px';
      while (el.firstChild) span.appendChild(el.firstChild);
      el.parentNode.replaceChild(span, el);
    });
  }

  function runCommand(cmd) {
    containerEl.focus();
    if (cmd === 'h2' || cmd === 'h3') {
      const current = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      document.execCommand('formatBlock', false, current === cmd ? 'p' : cmd);
    } else if (cmd === 'ul') {
      document.execCommand('insertUnorderedList');
    } else if (cmd === 'ol') {
      document.execCommand('insertOrderedList');
    } else if (RICH_EDITOR_JUSTIFY_CMD[cmd]) {
      document.execCommand(RICH_EDITOR_JUSTIFY_CMD[cmd]);
    } else if (cmd.indexOf('size') === 0) {
      const opt = RICH_EDITOR_FONT_SIZES.find(s => s.cmd === cmd);
      if (opt) applyFontSize(opt.px);
    } else {
      document.execCommand(cmd);
    }
    updateToolbarState();
    containerEl.dispatchEvent(new Event('input'));
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'gpe-toolbar';
  buttons.forEach(b => {
    if (b.sep) {
      const sep = document.createElement('span');
      sep.className = 'gpe-sep';
      toolbar.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gpe-btn';
    btn.dataset.cmd = b.cmd;
    if (b.style) btn.setAttribute('style', b.style);
    btn.title = b.title;
    btn.textContent = b.label;
    btn.addEventListener('mousedown', e => e.preventDefault()); // keep selection alive through the click
    btn.addEventListener('click', () => runCommand(b.cmd));
    toolbar.appendChild(btn);
  });
  containerEl.parentNode.insertBefore(toolbar, containerEl);

  containerEl.contentEditable = 'true';
  containerEl.classList.add('gpe-editable');
  containerEl.innerHTML = opts.initialHtml || '';

  if (toolbarKind === 'full') {
    // Enter → new <p>, matches .gpb-richtext p CSS (only meaningful while this
    // element is focused; every other toolbar kind overrides Enter below —
    // 'basic'/'card' fields are short blurbs, not multi-paragraph documents).
    containerEl.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  }

  containerEl.addEventListener('input', () => {
    if (opts.onChange) opts.onChange(DOMPurify.sanitize(containerEl.innerHTML));
  });

  containerEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && toolbarKind !== 'full') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  });

  containerEl.addEventListener('paste', e => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    if (html) {
      document.execCommand('insertHTML', false, DOMPurify.sanitize(html, {
        ALLOWED_TAGS: RICH_EDITOR_PASTE_TAGS,
        ALLOWED_ATTR: RICH_EDITOR_PASTE_ATTR,
      }));
    } else {
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    }
  });

  containerEl.addEventListener('keyup', updateToolbarState);
  containerEl.addEventListener('mouseup', updateToolbarState);
  containerEl.addEventListener('focus', updateToolbarState);
}
