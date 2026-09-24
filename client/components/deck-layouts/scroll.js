// "Scroll presentation" layout (Deck Creator 2.0) — renders the Claude Design
// "Greenpoint Scroll Presentation" from a deck's content JSON. The content
// shape matches server/deck-layouts/scroll.js. Rendering goes through the
// ctx helpers from deck-layout.html, which add the inline-editing controls
// in edit mode and drop empty fields in view mode.
(function () {
  const ACCENT = '#7E9786';

  const CSS = `
  .sd { background:#fff; color:#1E1D1E; font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
  .sd *, .sd *::before, .sd *::after { box-sizing:border-box; }
  .sd p, .sd h1, .sd h2, .sd h3 { margin:0; }
  .sd a { color:#5E7466; text-decoration:none; }
  .sd ::selection { background:${ACCENT}; color:#fff; }
  .sd section[id], .sd footer[id] { scroll-margin-top:5.5rem; }
  .sd-wrap { max-width:1440px; margin:0 auto; padding-left:clamp(15px,3vw,48px); padding-right:clamp(15px,3vw,48px); }
  .sd-pad { padding-top:clamp(72px,8vw,128px); padding-bottom:clamp(72px,8vw,128px); }
  .sd-kicker { font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#5E7466; }
  .sd-dark .sd-kicker { color:#A8BCAE; }
  .sd-caps { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#9E9E9E; }
  .sd-h2big { margin-top:20px !important; max-width:42rem; font-size:clamp(2rem,4vw,3.25rem); font-weight:700; line-height:1.05; letter-spacing:-0.03em; text-transform:uppercase; }
  .sd-lead { margin-top:20px !important; max-width:36rem; font-size:16px; line-height:1.75; color:#595959; }

  /* Header */
  .sd-nav { position:fixed; left:0; right:0; top:0; z-index:50; transition:background .2s ease-out, border-color .2s ease-out; background:transparent; border-bottom:1px solid transparent; }
  .sd-nav.solid { background:rgba(30,29,30,0.95); border-color:rgba(255,255,255,0.1); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
  .sd-nav-in { max-width:1440px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:24px; padding:16px clamp(15px,3vw,48px); }
  .sd-brand { flex-shrink:0; display:flex; align-items:center; gap:12px; }
  .sd-x { font-size:14px; color:rgba(255,255,255,0.4); }
  .sd-client-logo { height:26px; width:auto; max-width:140px; object-fit:contain; }
  .sd-logo-ph { height:26px; width:104px; border:1px dashed rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:9px; letter-spacing:0.16em; text-transform:uppercase; color:rgba(255,255,255,0.55); }
  .sd-links { display:none; align-items:center; gap:32px; }
  .sd-links a { font-size:11px; letter-spacing:0.18em; text-transform:uppercase; white-space:nowrap; color:rgba(255,255,255,0.6); transition:color .15s ease-out; }
  .sd-links a:hover, .sd-links a.active { color:#A8BCAE; }
  .sd-pill { display:none; flex-shrink:0; white-space:nowrap; border-radius:999px; border:1px solid rgba(255,255,255,0.2); padding:6px 16px; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:rgba(255,255,255,0.7); }
  @media (min-width:768px) { .sd-pill { display:inline-block; } }
  @media (min-width:1024px) { .sd-links { display:flex; } }

  /* Hero */
  .sd-hero { position:relative; min-height:92vh; overflow:hidden; background:#1E1D1E; }
  .sd-hero-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .sd-hero-shade { position:absolute; inset:0; background:rgba(30,29,30,0.7); }
  .sd-ring { position:absolute; border-radius:50%; pointer-events:none; }
  .sd-hero .sd-ring { right:-265px; top:-265px; width:530px; height:530px; border:78px solid rgba(255,255,255,0.12); }
  .sd-hero-in { position:relative; min-height:92vh; display:flex; flex-direction:column; justify-content:flex-end; padding-top:128px; padding-bottom:72px; }
  .sd-eyebrow { font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:#A8BCAE; }
  .sd-presenter { margin-top:32px !important; max-width:36rem; font-size:18px; line-height:1.5; color:rgba(255,255,255,0.7); }
  .sd-hero h1 { margin-top:12px; font-weight:700; text-transform:uppercase; line-height:0.86; letter-spacing:-0.035em; color:#fff; }
  .sd-hero h1 > span { display:block; font-size:clamp(2.6rem,9vw,8.5rem); }
  .sd-hero-foot { margin-top:48px; display:grid; gap:40px; border-top:1px solid rgba(255,255,255,0.15); padding-top:32px; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
  .sd-objective { max-width:32rem; font-size:16px; line-height:1.75; color:rgba(255,255,255,0.75); }
  .sd-stats { display:grid; gap:24px; grid-template-columns:minmax(0,1fr); align-content:start; }
  @media (min-width:640px) { .sd-stats { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  .sd-stat { display:flex; flex-direction:column; }
  .sd-stat-l { font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.45); }
  .sd-stat-v { margin-top:8px; font-size:18px; line-height:1.35; color:#fff; }
  .sd-read { margin-top:48px; width:fit-content; display:inline-flex; align-items:center; gap:8px; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.6) !important; }
  .sd-read:hover { color:#A8BCAE !important; }

  /* Brief */
  .sd-brief { background:#F4F4F4; }
  .sd-brief-shell { display:grid; gap:40px; grid-template-columns:minmax(0,1fr); align-items:start; }
  @media (min-width:1024px) { .sd-brief-shell { grid-template-columns:14rem minmax(0,1fr); gap:80px; } .sd-brief-label { position:sticky; top:112px; } }
  .sd-rule { margin-top:16px; height:1px; width:40px; background:#C9C6C0; }
  .sd-aside { margin-top:16px !important; font-size:14px; line-height:1.6; color:#595959; }
  .sd-statement { max-width:48rem; font-size:clamp(1.75rem,3.4vw,2.85rem); font-weight:400; line-height:1.18; letter-spacing:-0.015em; }
  .sd-terms { margin-top:56px; border-top:1px solid #DCDAD6; }
  .sd-term { display:grid; gap:4px; padding:20px 0; border-bottom:1px solid #DCDAD6; }
  @media (min-width:640px) { .sd-term { grid-template-columns:13rem minmax(0,1fr); gap:24px; align-items:baseline; } }
  .sd-term-k { font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#595959; }
  .sd-term-v { font-size:20px; }
  .sd-listblock { margin-top:56px; }
  .sd-listblock > .sd-caps { color:#595959; letter-spacing:0.22em; }
  .sd-list { margin-top:24px; display:grid; gap:16px 40px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
  .sd-li { display:flex; align-items:baseline; gap:12px; border-top:1px solid #DCDAD6; padding-top:16px; font-size:14px; line-height:1.6; }
  .sd-dot { width:6px; height:6px; flex-shrink:0; border-radius:50%; background:${ACCENT}; }
  .sd-open { margin-top:24px !important; font-size:14px; color:#595959; }
  .sd-tbd { margin-left:6px; background:#EAEFE9; color:#42563F; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; padding:3px 8px; border-radius:3px; }

  /* Mechanic */
  .sd-dark { background:#1E1D1E; color:#fff; }
  .sd-mech-h { margin-top:20px !important; max-width:42rem; font-size:clamp(1.6rem,3vw,2.4rem); font-weight:400; line-height:1.25; color:#fff; }
  .sd-mech { margin-top:64px; display:grid; gap:1px; grid-template-columns:minmax(0,1fr); background:rgba(255,255,255,0.12); border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); }
  .sd-mech > * { padding:40px 32px 40px 0; display:flex; flex-direction:column; height:100%; background:#1E1D1E; }
  @media (min-width:768px) { .sd-mech { grid-template-columns:repeat(var(--n,3),minmax(0,1fr)); } .sd-mech > * { padding-left:32px; } .sd-mech > *:first-child { padding-left:0; } }
  .sd-mech-n { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.4); }
  .sd-mech-w { margin-top:24px; font-size:clamp(2.6rem,6vw,4.5rem); font-weight:700; text-transform:uppercase; line-height:1; letter-spacing:-0.035em; color:#A8BCAE; overflow-wrap:anywhere; }
  .sd-mech-l { margin-top:auto !important; padding-top:32px; font-size:14px; line-height:1.65; color:rgba(255,255,255,0.7); }

  /* Spine */
  .sd-timeline { display:none; margin-top:64px; }
  @media (min-width:768px) { .sd-timeline { display:block; } }
  .sd-months { display:flex; border-bottom:1px solid #DCDAD6; padding-bottom:12px; }
  .sd-months > div { flex:1; font-size:13px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#595959; }
  .sd-grid-lines { position:absolute; inset:0; display:flex; }
  .sd-grid-lines > div { flex:1; }
  .sd-grid-lines > div + div { border-left:1px solid #DCDAD6; }
  .sd-bar-row { position:relative; height:5.5rem; }
  .sd-bar { position:absolute; top:50%; transform:translateY(-50%); min-width:64px; display:flex; align-items:center; gap:16px; border-radius:8px; padding:14px 20px; background:${ACCENT}; color:#1E1D1E !important; transition:background .15s ease-out; }
  .sd-bar:hover { background:#5E7466; color:#fff !important; }
  .sd-bar.ink { background:#1E1D1E; color:#fff !important; }
  .sd-bar.ink:hover { background:#5E7466; }
  .sd-bar-n { font-size:22px; font-weight:700; line-height:1; opacity:0.65; }
  .sd-bar-t { min-width:0; }
  .sd-bar-t > span { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sd-bar-t > span:first-child { font-size:14px; font-weight:600; }
  .sd-bar-t > span:last-child { font-size:12px; opacity:0.8; }
  .sd-roles { margin-top:40px; display:grid; gap:1px; grid-template-columns:minmax(0,1fr); background:#DCDAD6; border-top:1px solid #DCDAD6; }
  .sd-roles > * { padding:24px 24px 24px 0; background:#fff; }
  @media (min-width:768px) { .sd-roles { grid-template-columns:repeat(var(--n,4),minmax(0,1fr)); } .sd-roles > * { padding-left:24px; } .sd-roles > *:first-child { padding-left:0; } }
  .sd-role-top { display:flex; align-items:baseline; gap:12px; }
  .sd-role-n { font-size:20px; font-weight:700; color:#5E7466; }
  .sd-role-t { font-size:18px; color:#1E1D1E !important; text-decoration:underline; text-decoration-color:#DCDAD6; text-decoration-thickness:2px; text-underline-offset:4px; }
  .sd-role-t:hover { text-decoration-color:${ACCENT}; }
  .sd-role-d { margin-top:12px !important; font-size:14px; line-height:1.6; color:#595959; }

  /* Phases */
  .sd-phase { border-top:1px solid #DCDAD6; background:#F4F4F4; }
  .sd-phase.alt { background:#fff; }
  .sd-phase-pad { padding-top:clamp(64px,7vw,112px); padding-bottom:clamp(64px,7vw,112px); }
  .sd-phase-shell { display:grid; gap:24px; grid-template-columns:minmax(0,1fr); }
  @media (min-width:768px) { .sd-phase-shell { grid-template-columns:7.5rem minmax(0,1fr); gap:48px; } }
  .sd-phase-num { font-size:60px; font-weight:700; line-height:1; letter-spacing:-0.03em; color:#D7DEDA; }
  .sd-phase-rule { margin-top:16px; height:1px; width:40px; background:#DCDAD6; }
  .sd-phase-timing { margin-top:16px !important; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#5E7466; }
  .sd-phase h2 { font-size:clamp(1.8rem,3.6vw,2.75rem); font-weight:700; line-height:1.05; letter-spacing:-0.03em; text-transform:uppercase; }
  .sd-phase-role { margin-top:18px !important; max-width:36rem; font-size:18px; line-height:1.7; color:#595959; }
  .sd-dlv { margin-top:56px; border-top:1px solid #DCDAD6; padding-top:28px; }
  .sd-dlv-top { display:flex; align-items:baseline; gap:16px; flex-wrap:wrap; }
  .sd-fmt { background:#EAEFE9; color:#42563F; font-size:10px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; padding:5px 12px; border-radius:999px; }
  .sd-dlv-h { margin-top:14px !important; max-width:46rem; font-size:clamp(1.3rem,2.4vw,1.9rem); font-weight:400; line-height:1.2; letter-spacing:-0.015em; }
  .sd-dlv-side .sd-dlv-h { font-size:24px; line-height:1.25; letter-spacing:0; }
  .sd-img { margin-top:28px; width:100%; background:#E9E8E6; border:1px dashed #C9C6C0; display:flex; align-items:center; justify-content:center; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#595959; overflow:hidden; position:relative; }
  .sd-phase.alt .sd-img { background:#F4F4F4; }
  .sd-img.has { border:none; background:none; }
  .sd-img img { width:100%; height:100%; object-fit:cover; display:block; }
  .sd-img.r169 { aspect-ratio:16/9; }
  .sd-img.r916 { aspect-ratio:9/16; max-width:260px; margin-top:0; }
  .sd-two { margin-top:32px; display:grid; gap:48px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
  .sd-dlv-side { display:grid; gap:48px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
  .sd-body { font-size:16px; line-height:1.85; color:#595959; white-space:pre-line; }
  .sd-dlv-side .sd-body { margin-top:14px !important; max-width:32rem; line-height:1.7; }
  .sd-inc { margin-top:14px; border-top:1px solid #DCDAD6; }
  .sd-inc > div { padding:10px 0; border-bottom:1px solid #DCDAD6; font-size:14px; line-height:1.5; }
  .sd-dlv-side .sd-incs { margin-top:28px; }
  .sd-chips { display:flex; flex-wrap:wrap; gap:8px; align-content:flex-start; }
  .sd-chips > span { border:1px solid rgba(255,255,255,0.2); padding:7px 12px; font-size:12px; color:rgba(255,255,255,0.8); }
  .sd-endcard { margin-top:28px; width:fit-content; max-width:100%; background:#1E1D1E; padding:26px 34px; }
  .sd-endcard-l { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.45); }
  .sd-endcard-t { margin-top:12px; font-size:26px; line-height:1.12; font-weight:700; letter-spacing:-0.01em; text-transform:uppercase; color:#fff; }
  .sd-endcard-t > span { display:block; }
  .sd-endcard-t > span:last-child { color:#A8BCAE; }
  /* finale phase (dark) */
  .sd-phase.ink { background:#1E1D1E; color:#fff; }
  .sd-phase.ink .sd-phase-num { color:rgba(255,255,255,0.2); }
  .sd-phase.ink .sd-phase-rule { background:rgba(255,255,255,0.2); }
  .sd-phase.ink .sd-phase-timing { color:#A8BCAE; }
  .sd-phase.ink .sd-phase-role { color:rgba(255,255,255,0.7); }
  .sd-phase.ink .sd-dlv { border-color:rgba(255,255,255,0.14); }
  .sd-phase.ink .sd-caps { color:rgba(255,255,255,0.45); }
  .sd-phase.ink .sd-body { color:rgba(255,255,255,0.65); }
  .sd-phase.ink .sd-img { background:#252425; border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.5); }
  .sd-phase.ink .sd-endcard { background:#2B2A2B; }

  /* Channels */
  .sd-tabs { margin-top:44px; display:flex; gap:8px; overflow-x:auto; border-bottom:1px solid #DCDAD6; scrollbar-width:none; }
  .sd-tab { flex-shrink:0; border:none; border-radius:8px 8px 0 0; padding:10px 18px; font-family:inherit; font-size:13px; font-weight:400; color:#595959; background:transparent; cursor:pointer; white-space:nowrap; margin-bottom:-1px; position:relative; }
  .sd-tab.active { background:${ACCENT}; color:#fff; font-weight:600; }
  .sd-panel { display:none; margin-top:40px; }
  .sd-panel.active { display:block; }
  .sd-gantt-head { display:flex; border-bottom:1px solid #DCDAD6; padding-bottom:12px; }
  .sd-gantt-lab { width:38%; flex-shrink:0; padding-right:16px; }
  .sd-gantt-head .sd-gantt-lab { font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#9E9E9E; }
  .sd-gantt-head .sd-months { flex:1; border:none; padding:0; }
  .sd-grow { display:flex; align-items:center; padding:12px 0; border-bottom:1px solid #E4E2DE; }
  .sd-grow .sd-gantt-lab { font-size:14px; }
  .sd-gtrack { position:relative; height:22px; flex:1; }
  .sd-gtrack .sd-grid-lines > div + div { border-color:#E4E2DE; }
  .sd-gbar { position:absolute; top:50%; transform:translateY(-50%); height:10px; border-radius:2px; background:${ACCENT}; }
  .sd-gbar.ink { background:#1E1D1E; }
  .sd-gbar.muted { background:#D7D5D1; }
  .sd-sched { border-top:1px solid #DCDAD6; }
  .sd-sched > div { display:grid; grid-template-columns:130px minmax(0,1fr) 90px; gap:24px; align-items:baseline; padding:16px 0; border-bottom:1px solid #DCDAD6; }
  .sd-sched-m { font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:#5E7466; }
  .sd-sched-t { font-size:18px; }
  .sd-sched-g { text-align:right; font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:#9E9E9E; }
  @media (max-width:640px) { .sd-sched > div { grid-template-columns:1fr; gap:6px; } .sd-sched-g { text-align:left; } }
  .sd-cols { display:grid; gap:1px; grid-template-columns:minmax(0,1fr); background:#DCDAD6; border-top:1px solid #DCDAD6; }
  .sd-cols > * { padding:28px 28px 28px 0; background:#fff; }
  @media (min-width:768px) { .sd-cols { grid-template-columns:repeat(3,minmax(0,1fr)); } .sd-cols > * { padding-left:28px; } .sd-cols > *:nth-child(3n+1) { padding-left:0; } }
  .sd-col-m { font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:#9E9E9E; }
  .sd-col-t { margin-top:14px !important; font-size:21px; line-height:1.3; }
  .sd-col-b { margin-top:16px !important; font-size:14px; line-height:1.6; color:#595959; }

  /* Close */
  .sd-close { position:relative; background:#1E1D1E; overflow:hidden; color:#fff; }
  .sd-close .sd-ring { right:-260px; top:-260px; width:760px; height:760px; border:175px solid rgba(255,255,255,0.08); }
  .sd-close-in { position:relative; }
  .sd-close-big { margin-top:32px; font-weight:700; text-transform:uppercase; line-height:0.9; letter-spacing:-0.04em; color:#fff; }
  .sd-close-big > span { display:block; font-size:clamp(2.6rem,10vw,8rem); }
  .sd-close-big > span:last-child { color:#A8BCAE; }
  .sd-foot { margin-top:64px; display:flex; align-items:flex-end; justify-content:space-between; gap:32px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,0.12); padding-top:32px; }
  .sd-foot .sd-brand { gap:16px; }
  .sd-foot .sd-client-logo { height:40px; max-width:180px; }
  .sd-foot .sd-logo-ph { height:40px; width:150px; font-size:10px; }
  .sd-foot-r { font-size:14px; color:rgba(255,255,255,0.5); text-align:right; }
  .sd-foot-r > p + p { margin-top:4px; }
  .sd-foot-r .sd-kicker { margin-top:8px; font-size:11px; letter-spacing:0.2em; color:#A8BCAE; }
  `;

  const LOGO = 'https://res.cloudinary.com/dfers76ex/image/upload/v1778739088/Greenpoint-Logo-White_gz5g4m.svg';
  const pad2 = n => String(n).padStart(2, '0');
  const has = v => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());

  // Blank items for "+ Add" buttons, keyed by the list's last path segment.
  const BLANKS = {
    headline: () => '',
    stats: () => ({ label: '', value: '' }),
    terms: () => ({ term: '', detail: '' }),
    list: () => '',
    open_items: () => ({ text: '', tag: 'TBD' }),
    steps: () => ({ word: '', line: '' }),
    phases: () => ({ title: '', timing: '', start: 0, end: 1, summary: '', role: '', deliverables: [] }),
    deliverables: () => ({ label: '', format: '', headline: '', body: '', image_ratio: '16:9', image: { url: '', prompt: '' }, includes: [], end_card: [] }),
    includes: () => '',
    end_card: () => '',
    tabs: () => ({ label: 'New tab', kind: 'schedule', rows: [], items: [] }),
    rows: () => ({ label: '', start: 0, end: 1, tone: 'sage' }),
    items: () => ({ meta: '', title: '', body: '', tag: '' }),
    lines: () => '',
    months: () => '',
  };

  let activeTab = 0;

  function bar(start, end, n) {
    const s = Math.max(0, Math.min(n, Number(start) || 0));
    const e = Math.max(s, Math.min(n, Number(end) || 0));
    return { left: (s / n) * 100, width: ((e - s) / n) * 100 };
  }

  function render(d, ctx) {
    const { T, add, del, img, num, select, toggle, logo, edit } = ctx;
    const months = d.months && d.months.length ? d.months : ['Mth 1'];
    const n = months.length;
    const phases = d.phases || [];
    const monthCells = months.map(m => `<div>${ctx.esc(m)}</div>`).join('');
    const gridLines = `<div class="sd-grid-lines" aria-hidden="true">${months.map(() => '<div></div>').join('')}</div>`;
    const shown = key => d[key] && (d[key].show !== false);
    const navItems = [['brief', 'brief'], ['mechanic', 'mechanic'], ['spine', 'spine'], ['channels', 'channels']]
      .filter(([key]) => shown(key));

    const header = `
    <header class="sd-nav" id="sd-nav">
      <div class="sd-nav-in">
        <a href="#top" class="sd-brand" aria-label="Back to top">
          <img src="${LOGO}" alt="Greenpoint Media" style="height:18px;width:auto">
          ${logo('client_logo', 'sd-x', 'sd-client-logo', 'sd-logo-ph')}
        </a>
        <nav class="sd-links" aria-label="Sections">
          ${navItems.map(([key, id]) => `<a href="#${id}" data-nav="${id}">${ctx.esc(d[key].nav)}</a>`).join('')}
        </nav>
        ${has(d.date_range) || edit ? `<span class="sd-pill">${T('date_range', 'span', '', { ph: 'Month – Month' })}</span>` : ''}
      </div>
    </header>`;

    const hero = `
    <section id="top" class="sd-hero">
      ${d.hero.image && d.hero.image.url ? `<img class="sd-hero-img" src="${ctx.attr(d.hero.image.url)}" alt="">` : ''}
      <div class="sd-hero-shade" aria-hidden="true"><div class="sd-ring"></div></div>
      ${edit ? `<div style="position:absolute;right:16px;bottom:16px;z-index:2">${img('hero.image', '16:9', 'bg')}</div>` : ''}
      <div class="sd-wrap sd-hero-in">
        ${T('date_range', 'p', 'sd-eyebrow', { ph: 'Month – Month', reveal: true })}
        ${T('hero.presenter', 'p', 'sd-presenter', { ph: 'Client Name presents', reveal: true })}
        <h1 data-reveal>${(d.hero.headline || []).map((_, i) => T(`hero.headline.${i}`, 'span', '', { ph: 'Headline', del: `hero.headline.${i}` })).join('')}</h1>
        ${add('hero.headline', 'Headline line', 'dark')}
        ${has(d.hero.objective) || has(d.hero.stats) || edit ? `
        <div class="sd-hero-foot" data-reveal>
          ${T('hero.objective', 'p', 'sd-objective', { ph: 'Objective paragraph', multiline: true })}
          <div class="sd-stats">
            ${(d.hero.stats || []).map((_, i) => `<div class="sd-stat">${del(`hero.stats.${i}`)}${T(`hero.stats.${i}.label`, 'span', 'sd-stat-l', { ph: 'Stat label' })}${T(`hero.stats.${i}.value`, 'span', 'sd-stat-v', { ph: 'Stat value' })}</div>`).join('')}
            ${(d.hero.stats || []).length < 3 ? add('hero.stats', 'Stat', 'dark') : ''}
          </div>
        </div>` : ''}
        ${navItems.length ? `<a href="#${navItems[0][1]}" class="sd-read" data-reveal>Read the plan <span aria-hidden="true">↓</span></a>` : ''}
      </div>
    </section>`;

    const b = d.brief || {};
    const brief = !shown('brief') ? toggle('brief', 'The Brief') : `
    <section id="brief" class="sd-brief">
      ${toggle('brief', 'The Brief')}
      <div class="sd-wrap sd-pad"><div class="sd-brief-shell">
        <div class="sd-brief-label">
          ${T('brief.label', 'p', 'sd-kicker', { ph: 'Section label' })}
          <div class="sd-rule" aria-hidden="true"></div>
          ${T('brief.aside', 'p', 'sd-aside', { ph: 'What we are making, and what it has to do.' })}
        </div>
        <div>
          ${T('brief.statement', 'h2', 'sd-statement', { ph: 'Approach statement — the single sentence that frames the whole plan.', reveal: true, multiline: true })}
          ${has(b.terms) || edit ? `<div class="sd-terms" data-reveal>
            ${(b.terms || []).map((_, i) => `<div class="sd-term">${del(`brief.terms.${i}`)}${T(`brief.terms.${i}.term`, 'span', 'sd-term-k', { ph: 'Term' })}${T(`brief.terms.${i}.detail`, 'span', 'sd-term-v', { ph: 'Detail for this term' })}</div>`).join('')}
            ${add('brief.terms', 'Term')}
          </div>` : ''}
          ${has(b.list) || has(b.open_items) || edit ? `<div class="sd-listblock" data-reveal>
            ${T('brief.list_label', 'p', 'sd-caps', { ph: 'List block label' })}
            <div class="sd-list">
              ${(b.list || []).map((_, i) => `<div class="sd-li">${del(`brief.list.${i}`)}<span class="sd-dot" aria-hidden="true"></span>${T(`brief.list.${i}`, 'span', '', { ph: 'List item — one line of detail' })}</div>`).join('')}
            </div>
            ${add('brief.list', 'List item')}
            ${(b.open_items || []).map((_, i) => `<p class="sd-open">${del(`brief.open_items.${i}`)}${T(`brief.open_items.${i}.text`, 'span', '', { ph: 'Open item' })}${T(`brief.open_items.${i}.tag`, 'span', 'sd-tbd', { ph: 'TBD' })}</p>`).join('')}
            ${add('brief.open_items', 'Open item')}
          </div>` : ''}
        </div>
      </div></div>
    </section>`;

    const m = d.mechanic || {};
    const mechanic = !shown('mechanic') ? toggle('mechanic', 'How It Works') : `
    <section id="mechanic" class="sd-dark">
      ${toggle('mechanic', 'How It Works')}
      <div class="sd-wrap sd-pad">
        <div data-reveal>
          ${T('mechanic.label', 'p', 'sd-kicker', { ph: 'Section label' })}
          ${T('mechanic.headline', 'h2', 'sd-mech-h', { ph: 'Three words the whole campaign has to teach.' })}
        </div>
        <div class="sd-mech" style="--n:${Math.max(1, (m.steps || []).length)}">
          ${(m.steps || []).map((_, i) => `<div data-reveal>${del(`mechanic.steps.${i}`)}
            <span class="sd-mech-n">${pad2(i + 1)}</span>
            ${T(`mechanic.steps.${i}.word`, 'span', 'sd-mech-w', { ph: 'Word' })}
            ${T(`mechanic.steps.${i}.line`, 'p', 'sd-mech-l', { ph: 'One line explaining this step.' })}
          </div>`).join('')}
        </div>
        ${add('mechanic.steps', 'Step', 'dark')}
      </div>
    </section>`;

    const spine = !shown('spine') ? toggle('spine', 'The Phases') : `
    <section id="spine" style="background:#fff">
      ${toggle('spine', 'The Phases')}
      <div class="sd-wrap sd-pad">
        <div data-reveal>
          ${T('spine.label', 'p', 'sd-kicker', { ph: 'Section label' })}
          ${T('spine.headline', 'h2', 'sd-h2big', { ph: 'The campaign spine' })}
          ${T('spine.intro', 'p', 'sd-lead', { ph: 'How the phases work together.', multiline: true })}
        </div>
        ${ctx.monthsEditor()}
        ${phases.length ? `<div class="sd-timeline" data-reveal>
          <div class="sd-months">${monthCells}</div>
          <div style="position:relative">${gridLines}
            <div style="position:relative">
              ${phases.map((p, i) => {
                const { left, width } = bar(p.start, p.end, n);
                const ink = i === phases.length - 1 && phases.length > 1;
                return `<div class="sd-bar-row"><a href="#phase-${pad2(i + 1)}" class="sd-bar${ink ? ' ink' : ''}" style="left:${left}%;width:${width}%">
                  <span class="sd-bar-n">${pad2(i + 1)}</span>
                  <span class="sd-bar-t"><span>${ctx.esc(p.title)}</span><span>${ctx.esc(p.timing)}</span></span>
                </a></div>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="sd-roles" style="--n:${Math.min(4, phases.length)}">
          ${phases.map((p, i) => `<div data-reveal>
            <div class="sd-role-top"><span class="sd-role-n">${pad2(i + 1)}</span><a href="#phase-${pad2(i + 1)}" class="sd-role-t">${ctx.esc(p.title)}</a></div>
            ${T(`phases.${i}.summary`, 'p', 'sd-role-d', { ph: 'One line on what this phase is for.' })}
          </div>`).join('')}
        </div>` : ''}
      </div>
    </section>`;

    const phaseSections = phases.map((p, i) => {
      const ink = i === phases.length - 1 && phases.length > 1;
      const tone = ink ? 'ink' : (i % 2 ? 'alt' : '');
      const P = `phases.${i}`;
      const dlvs = (p.deliverables || []).map((dv, j) => {
        const D = `${P}.deliverables.${j}`;
        const ratio = dv.image_ratio || 'none';
        const top = `<div class="sd-dlv-top">
            ${T(`${D}.label`, 'p', 'sd-caps', { ph: 'Deliverable label' })}
            ${T(`${D}.format`, 'span', 'sd-fmt', { ph: 'Format' })}
            ${select(`${D}.image_ratio`, [['16:9', 'Wide image'], ['9:16', 'Vertical image'], ['none', 'No image']])}
          </div>`;
        const includes = has(dv.includes) || edit ? (ink
          ? `<div class="sd-chips">${(dv.includes || []).map((_, k) => `<span>${del(`${D}.includes.${k}`)}${T(`${D}.includes.${k}`, 'span', '', { ph: 'Inclusion' })}</span>`).join('')}${add(`${D}.includes`, 'Inclusion', 'dark')}</div>`
          : `<div class="sd-incs"><p class="sd-caps">Includes</p><div class="sd-inc">${(dv.includes || []).map((_, k) => `<div>${del(`${D}.includes.${k}`)}${T(`${D}.includes.${k}`, 'span', '', { ph: 'Inclusion item' })}</div>`).join('')}</div>${add(`${D}.includes`, 'Inclusion')}</div>`) : '';
        const endcard = !has(dv.end_card) ? add(`${D}.end_card`, 'End card') : `<div class="sd-endcard">
            <p class="sd-endcard-l">End card</p>
            <p class="sd-endcard-t">${(dv.end_card || []).map((_, k) => T(`${D}.end_card.${k}`, 'span', '', { ph: 'End card line', del: `${D}.end_card.${k}` })).join('')}</p>
            ${add(`${D}.end_card`, 'End card line', 'dark')}
          </div>`;
        if (ratio === '9:16') {
          return `<div class="sd-dlv sd-dlv-side" data-reveal>${del(D, 'Remove deliverable')}
            <div>${top}
              ${T(`${D}.headline`, 'h3', 'sd-dlv-h', { ph: 'Deliverable headline' })}
              ${T(`${D}.body`, 'p', 'sd-body', { ph: 'Body copy — two or three lines on the creative idea.', multiline: true })}
              ${includes}
              ${endcard}
            </div>
            ${img(`${D}.image`, '9:16', 'sd-img r916')}
          </div>`;
        }
        return `<div class="sd-dlv" data-reveal>${del(D, 'Remove deliverable')}
          ${top}
          ${T(`${D}.headline`, 'h3', 'sd-dlv-h', { ph: 'Deliverable headline — the title of this piece' })}
          ${ratio === '16:9' ? img(`${D}.image`, '16:9', 'sd-img r169') : ''}
          <div class="sd-two">
            <div>
              ${T(`${D}.body`, 'p', 'sd-body', { ph: 'Body copy — three or four lines describing the deliverable.', multiline: true })}
              ${endcard}
            </div>
            ${includes}
          </div>
        </div>`;
      }).join('');
      return `
      <section id="phase-${pad2(i + 1)}" class="sd-phase ${tone}">
        <div class="sd-wrap sd-phase-pad"><div class="sd-phase-shell">
          <div data-reveal>${del(P, 'Remove phase')}
            <span class="sd-phase-num">${pad2(i + 1)}</span>
            <div class="sd-phase-rule" aria-hidden="true"></div>
            ${T(`${P}.timing`, 'p', 'sd-phase-timing', { ph: 'Timing' })}
            ${num(`${P}.start`, 'Starts')}${num(`${P}.end`, 'Ends')}
          </div>
          <div>
            ${T(`${P}.title`, 'h2', '', { ph: 'Phase header', reveal: true })}
            ${T(`${P}.role`, 'p', 'sd-phase-role', { ph: 'Phase role — what this phase has to achieve.', reveal: true, multiline: true })}
            ${dlvs}
            ${add(`${P}.deliverables`, 'Deliverable', ink ? 'dark' : '')}
          </div>
        </div></div>
      </section>`;
    }).join('') + (edit ? `<div class="sd-wrap" style="padding-top:16px;padding-bottom:16px">${add('phases', 'Phase')}</div>` : '');

    const c = d.channels || {};
    const tabs = c.tabs || [];
    if (activeTab >= tabs.length) activeTab = 0;
    const channels = !shown('channels') ? toggle('channels', 'Channel Plan') : `
    <section id="channels" style="background:#fff">
      ${toggle('channels', 'Channel Plan')}
      <div class="sd-wrap sd-pad">
        <div data-reveal>
          ${T('channels.label', 'p', 'sd-kicker', { ph: 'Section label' })}
          ${T('channels.headline', 'h2', 'sd-h2big', { ph: 'Channel plan' })}
        </div>
        <div class="sd-tabs" role="tablist">
          ${tabs.map((t, i) => `<${edit ? 'div' : 'button type="button"'} class="sd-tab${i === activeTab ? ' active' : ''}" data-tab="${i}">${T(`channels.tabs.${i}.label`, 'span', '', { ph: 'Tab' })}</${edit ? 'div' : 'button'}>`).join('')}
          ${add('channels.tabs', 'Tab')}
        </div>
        ${tabs.map((t, i) => {
          const TP = `channels.tabs.${i}`;
          const tools = edit ? `<div class="ed-tools">${select(`${TP}.kind`, [['gantt', 'Timeline'], ['schedule', 'Schedule'], ['cards', 'Cards'], ['objectives', 'Objectives']])}${del(TP, 'Remove tab', 'inline')}</div>` : '';
          let body;
          if (t.kind === 'gantt') {
            body = `<div class="sd-gantt-head"><div class="sd-gantt-lab">Deliverable</div><div class="sd-months">${monthCells}</div></div>
              ${(t.rows || []).map((r, k) => {
                const { left, width } = bar(r.start, r.end, n);
                return `<div class="sd-grow">${del(`${TP}.rows.${k}`)}
                  <div class="sd-gantt-lab">${T(`${TP}.rows.${k}.label`, 'span', '', { ph: 'Row label' })}${num(`${TP}.rows.${k}.start`, 'From')}${num(`${TP}.rows.${k}.end`, 'To')}${select(`${TP}.rows.${k}.tone`, [['sage', 'Phase'], ['ink', 'Finale'], ['muted', 'Ongoing']])}</div>
                  <div class="sd-gtrack">${gridLines}<div class="sd-gbar ${ctx.attr(r.tone || 'sage')}" style="left:calc(${left}% + 3px);width:calc(${width}% - 6px)"></div></div>
                </div>`;
              }).join('')}
              ${add(`${TP}.rows`, 'Row')}`;
          } else if (t.kind === 'schedule') {
            body = `<div class="sd-sched">${(t.items || []).map((_, k) => `<div>${del(`${TP}.items.${k}`)}
                ${T(`${TP}.items.${k}.meta`, 'span', 'sd-sched-m', { ph: 'Timing' })}
                ${T(`${TP}.items.${k}.title`, 'span', 'sd-sched-t', { ph: 'Content title' })}
                ${T(`${TP}.items.${k}.tag`, 'span', 'sd-sched-g', { ph: 'Phase 01' })}
              </div>`).join('')}</div>${add(`${TP}.items`, 'Row')}`;
          } else {
            body = `<div class="sd-cols">${(t.items || []).map((_, k) => `<div>${del(`${TP}.items.${k}`)}
                ${T(`${TP}.items.${k}.meta`, 'p', 'sd-col-m', { ph: t.kind === 'cards' ? 'Month · Type' : 'Month' })}
                ${T(`${TP}.items.${k}.title`, 'p', 'sd-col-t', { ph: t.kind === 'cards' ? 'Item headline' : 'Objective' })}
                ${t.kind === 'cards' ? T(`${TP}.items.${k}.body`, 'p', 'sd-col-b', { ph: 'One or two lines describing this item.', multiline: true }) : ''}
              </div>`).join('')}</div>${add(`${TP}.items`, t.kind === 'cards' ? 'Card' : 'Objective')}`;
          }
          return `<div class="sd-panel${i === activeTab ? ' active' : ''}" data-panel="${i}">${tools}${body}</div>`;
        }).join('')}
      </div>
    </section>`;

    const close = `
    <footer id="close" class="sd-close">
      <div class="sd-ring" aria-hidden="true"></div>
      <div class="sd-wrap sd-pad sd-close-in">
        <div data-reveal>
          ${T('closing.overline', 'p', 'sd-kicker', { ph: 'Closing overline' })}
          <p class="sd-close-big">${(d.closing.lines || []).map((_, i) => T(`closing.lines.${i}`, 'span', '', { ph: 'Closing.', del: `closing.lines.${i}` })).join('')}</p>
          ${add('closing.lines', 'Closing line', 'dark')}
        </div>
        <div class="sd-foot">
          <div class="sd-brand">
            <img src="${LOGO}" alt="Greenpoint Media" style="height:26px;width:auto">
            ${logo('client_logo', 'sd-x', 'sd-client-logo', 'sd-logo-ph')}
          </div>
          <div class="sd-foot-r">
            ${T('footer.email', 'p', '', { ph: 'hello@greenpointmedia.com.au' })}
            <p>${ctx.esc(ctx.title)}${has(d.date_range) ? ` · ${ctx.esc(d.date_range)}` : ''}</p>
            <p class="sd-kicker">Prepared by Greenpoint</p>
          </div>
        </div>
      </div>
    </footer>`;

    return `<div class="sd">${header}<main>${hero}${brief}${mechanic}${spine}${phaseSections}${channels}</main>${close}</div>`;
  }

  // Header turns solid on scroll, nav highlights the section in view, channel
  // tabs switch, and (view mode only) content fades in as it scrolls up.
  function afterRender(root, ctx) {
    const nav = root.querySelector('#sd-nav');
    const onScroll = () => nav && nav.classList.toggle('solid', window.scrollY > 120);
    window.removeEventListener('scroll', window.__sdScroll || (() => {}));
    window.__sdScroll = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    root.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', e => {
      if (ctx.edit && e.target.closest('[contenteditable]') && btn.classList.contains('active')) return;
      activeTab = Number(btn.dataset.tab);
      root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
      root.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === btn.dataset.tab));
    }));

    if ('IntersectionObserver' in window) {
      if (window.__sdSections) window.__sdSections.disconnect();
      const links = [...root.querySelectorAll('[data-nav]')];
      window.__sdSections = new IntersectionObserver(entries => {
        const v = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (v) links.forEach(l => l.classList.toggle('active', l.dataset.nav === v.target.id));
      }, { rootMargin: '-40% 0px -50% 0px' });
      links.forEach(l => { const el = root.querySelector('#' + l.dataset.nav); if (el) window.__sdSections.observe(el); });
    }

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ctx.edit || reduced || !('IntersectionObserver' in window)) return;
    const hidden = [];
    root.querySelectorAll('[data-reveal]').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity 0.35s cubic-bezier(0.23,1,0.32,1), transform 0.35s cubic-bezier(0.23,1,0.32,1)';
      hidden.push(el);
    });
    const show = el => { el.style.opacity = '1'; el.style.transform = 'none'; io.unobserve(el); };
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && show(e.target)), { rootMargin: '-60px 0px' });
    hidden.forEach(el => io.observe(el));
    // An observer never fires in a hidden/prerendered tab — never leave content stuck.
    setTimeout(() => hidden.forEach(el => el.getBoundingClientRect().top < window.innerHeight && show(el)), 1200);
  }

  // Plain-text description of what an image slot illustrates, for the
  // image-prompt writer (/api/deck-ai/image-prompt).
  function imageContext(d, path) {
    const lines = imageContextLines(d, path).split('\n').filter(Boolean);
    // Only the starter "Phase N" title filled in counts as nothing written yet ('').
    const written = lines.some(l => /:\s*\S/.test(l) && !/^Phase: Phase \d+$/.test(l));
    return written ? lines.join('\n') : '';
  }
  function imageContextLines(d, path) {
    const line = (label, v) => (has(v) && (!Array.isArray(v) || v.some(has)) ? `${label}: ${Array.isArray(v) ? v.filter(Boolean).join(', ') : v}` : '');
    const overview = [line('Campaign', (d.hero.headline || []).join(' ')), line('Objective', d.hero.objective), line('Framing', d.brief && d.brief.statement)];
    const m = path.match(/^phases\.(\d+)\.deliverables\.(\d+)\./);
    if (m) {
      const p = d.phases[+m[1]] || {};
      const dv = (p.deliverables || [])[+m[2]] || {};
      return ['Image for this deliverable:', line('Deliverable', dv.label), line('Format', dv.format), line('Headline', dv.headline), line('Description', dv.body), line('Includes', dv.includes),
        line('Phase', p.title), line('Phase goal', p.role), '', 'Campaign context:', ...overview].filter(s => s !== null && s !== undefined).join('\n');
    }
    return ['Background image for the opening screen of the presentation:', ...overview, line('Presented by', d.hero.presenter)].join('\n');
  }

  window.DeckLayouts = window.DeckLayouts || {};
  window.DeckLayouts.scroll = { label: 'Scroll presentation', css: CSS, render, afterRender, imageContext, blank: key => (BLANKS[key] || (() => ''))() };
})();
