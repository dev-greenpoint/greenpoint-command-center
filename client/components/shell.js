const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',          icon: '◈',  href: '/' },
  { id: 'deck-creator',  label: 'Deck Creator',      icon: '◧',  href: '/deck-creator' },
  { id: 'campaigns',     label: 'Campaign Manager',  icon: '◆',  href: '/campaigns' },
  { id: 'social',        label: 'Social Campaigns',  icon: '◉',  href: '/social' },
  { id: 'approvals',     label: 'Approvals',         icon: '◇',  href: '/approvals' },
  { id: 'reports',       label: 'Reports',           icon: '▦',  href: '/reports' },
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
    <span class="header-meta">${now}</span>
  `;

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
