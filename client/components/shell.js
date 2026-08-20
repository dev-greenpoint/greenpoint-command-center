const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',          icon: '◈',  href: '/' },
  { id: 'deck-creator',  label: 'Deck Creator',      icon: '◧',  href: '/deck-creator' },
  { id: 'campaigns',     label: 'Campaign Manager',  icon: '◆',  href: '/campaigns' },
  { id: 'social',        label: 'Social Campaigns',  icon: '◉',  href: '/social' },
  { id: 'approvals',     label: 'Approvals',         icon: '◇',  href: '/approvals' },
  { id: 'reports',       label: 'Reports',           icon: '▦',  href: '/reports' },
  { id: 'timesheets',    label: 'Timesheets',        icon: '◷',  href: '/timesheets' },
];

const IS_LOCALHOST = ['localhost', '127.0.0.1'].includes(window.location.hostname);

function renderShell({ pageId, title }) {
  const sidebar = document.getElementById('sidebar');
  const header  = document.getElementById('header');

  // Sidebar
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-mark">G</div>
      <span class="logo-text">Command Center</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Clients</div>
      <div id="sidebar-clients"><span style="font-size:11px;color:var(--text-dim);padding:4px 16px;">Loading…</span></div>
      <div class="nav-section-label" style="margin-top:8px;">Workspace</div>
      ${NAV_ITEMS.map(item => {
        const locked = item.localOnly && !IS_LOCALHOST;
        if (locked) {
          return `
            <span class="nav-item nav-item-locked" title="Available on localhost only">
              <span class="nav-icon">${item.icon}</span>
              <span class="nav-label">${item.label}</span>
              <span class="nav-lock">🔒</span>
            </span>
          `;
        }
        return `
          <a class="nav-item ${item.id === pageId ? 'active' : ''}" href="${item.href}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        `;
      }).join('')}

    </nav>
    <div class="sidebar-footer">
      <a class="nav-item ${'clients' === pageId ? 'active' : ''}" href="/clients">
        <span class="nav-icon">◎</span>
        <span class="nav-label">Accounts | Admin</span>
      </a>
      <a class="nav-item ${'settings' === pageId ? 'active' : ''}" href="/settings">
        <span class="nav-icon">⚙</span>
        <span class="nav-label">Settings</span>
      </a>
    </div>
  `;

  // Header
  const now = new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  header.innerHTML = `
    <button class="header-toggle" id="sidebar-toggle" title="Toggle sidebar">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="1.5" rx="1" fill="currentColor"/>
        <rect x="2" y="8.25" width="14" height="1.5" rx="1" fill="currentColor"/>
        <rect x="2" y="12.5" width="14" height="1.5" rx="1" fill="currentColor"/>
      </svg>
    </button>
    <span class="header-title">${title}</span>
    <div class="header-spacer"></div>
    <div class="notif-wrap" id="notif-wrap">
      <button class="notif-bell" id="notif-bell" title="Notifications">
        🔔<span class="notif-badge" id="notif-badge" style="display:none;"></span>
      </button>
      <div class="notif-panel" id="notif-panel"></div>
    </div>
    <span class="header-meta">${now}</span>
  `;

  initNotifications();

  // Toggle logic
  const isMobile = () => window.innerWidth <= 768;

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // Load client list into sidebar
  fetch('/api/clients')
    .then(r => r.json())
    .then(clients => {
      const el = document.getElementById('sidebar-clients');
      if (!clients.length) { el.innerHTML = '<span style="font-size:11px;color:var(--text-dim);padding:4px 16px;">No clients yet</span>'; return; }
      el.innerHTML = clients.map(c => `
        <a class="nav-item nav-item-client ${pageId === 'client-' + c.id ? 'active' : ''}" href="/clients/${c.id}/board">
          <span class="nav-icon" style="font-size:10px;">◦</span>
          <span class="nav-label">${c.name}</span>
        </a>
      `).join('');
    })
    .catch(() => {
      document.getElementById('sidebar-clients').innerHTML = '<span style="font-size:11px;color:var(--text-dim);padding:4px 16px;">Failed to load clients</span>';
    });

}

// ── Notifications ─────────────────────────────────────────────────────────
// "Who am I" is a name picked from the team_members roster, remembered per
// browser (localStorage, same identity key Strategy Builder's Notes modal
// uses) — there's no auth in this app, so this is the closest thing to a
// logged-in user. A note's `notify` list (see strategy_comments.notify)
// surfaces here for whoever's named in it.

const GP_USER_KEY = 'gp-user-name';

function shellEscHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function shellEscAttr(str) {
  return (str == null ? '' : String(str)).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function initNotifications() {
  const bell = document.getElementById('notif-bell');
  const panel = document.getElementById('notif-panel');
  const badge = document.getElementById('notif-badge');
  if (!bell) return;

  const currentUser = () => localStorage.getItem(GP_USER_KEY) || '';
  const seenKey = (name) => `gp-notif-seen-${name}`;

  async function fetchMine(name) {
    if (!name) return [];
    try {
      const res = await fetch(`/api/notifications?name=${encodeURIComponent(name)}`);
      return res.ok ? await res.json() : [];
    } catch { return []; }
  }

  function unreadCount(name, items) {
    // Postgres returns created_at as "YYYY-MM-DD HH:MM:SS.ffffff+00" (space
    // separator) while lastSeen is a JS toISOString() ("...T...Z") — string
    // comparison breaks same-day (the space sorts before "T" regardless of
    // actual time), so both need parsing to real timestamps first.
    const lastSeenRaw = localStorage.getItem(seenKey(name));
    const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
    return items.filter(i => new Date(i.created_at).getTime() > lastSeen).length;
  }

  function setBadge(n) {
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.style.display = n ? 'flex' : 'none';
  }

  async function refreshBadge() {
    const me = currentUser();
    if (!me) { setBadge(0); return; }
    setBadge(unreadCount(me, await fetchMine(me)));
  }

  function renderIdentityPicker(names) {
    panel.innerHTML = `
      <div class="notif-panel-title">Who are you?</div>
      <div class="notif-panel-desc">Pick your name to see notes addressed to you.</div>
      <select class="notif-identity-select" id="notif-identity-select">
        <option value="">— Select —</option>
        ${names.map(n => `<option value="${shellEscAttr(n)}">${shellEscHtml(n)}</option>`).join('')}
      </select>
    `;
    const sel = document.getElementById('notif-identity-select');
    if (sel) sel.addEventListener('change', function () {
      if (!this.value) return;
      localStorage.setItem(GP_USER_KEY, this.value);
      openPanel();
    });
  }

  function renderList(me, items) {
    if (!items.length) {
      panel.innerHTML = `
        <div class="notif-panel-title">Notifications</div>
        <div class="notif-empty">Nothing here yet.</div>
        <div class="notif-panel-footer"><a href="#" id="notif-switch">Not ${shellEscHtml(me)}?</a></div>
      `;
    } else {
      panel.innerHTML = `
        <div class="notif-panel-title">Notifications</div>
        <div class="notif-list">
          ${items.map(i => `
            <a class="notif-item" href="/strategy/${i.strategy_id}">
              <div class="notif-item-top"><strong>${shellEscHtml(i.author_name)}</strong> mentioned you</div>
              <div class="notif-item-deck">${shellEscHtml(i.strategy_title)}${i.client_name ? ' · ' + shellEscHtml(i.client_name) : ''}</div>
              <div class="notif-item-body">${shellEscHtml(i.body)}</div>
            </a>`).join('')}
        </div>
        <div class="notif-panel-footer"><a href="#" id="notif-switch">Not ${shellEscHtml(me)}?</a></div>
      `;
    }
    const switchLink = document.getElementById('notif-switch');
    if (switchLink) switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem(GP_USER_KEY);
      openPanel();
    });
  }

  async function openPanel() {
    const me = currentUser();
    if (!me) {
      let names = [];
      try {
        const res = await fetch('/api/team-members/names');
        names = res.ok ? await res.json() : [];
      } catch {}
      renderIdentityPicker(names);
      setBadge(0);
      return;
    }
    const items = await fetchMine(me);
    renderList(me, items);
    localStorage.setItem(seenKey(me), new Date().toISOString());
    setBadge(0);
  }

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open');
    if (opening) openPanel();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notif-wrap')) panel.classList.remove('open');
  });

  refreshBadge();
}
