const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',    icon: '◈',  href: '/' },
  { id: 'campaigns',   label: 'PR Campaigns', icon: '◆',  href: '/campaigns' },
  { id: 'strategies',  label: 'Strategies',  icon: '◐',  href: '/strategies' },
  { id: 'social',      label: 'Social',      icon: '◉',  href: '/social' },
  { id: 'approvals',   label: 'Approvals',   icon: '◇',  href: '/approvals' },
  { id: 'reports',     label: 'Reports',     icon: '▦',  href: '/reports' },
];

// ● green = built  ◑ yellow = partial  ○ grey = not started
const CAMPAIGN_TYPE_STATUS = [
  { label: 'PR',                    status: 'built',    href: '/campaigns' },
  { label: 'PR Light',              status: 'partial',  href: '/campaigns' },
  { label: 'Social',                status: 'built',    href: '/social' },
  { label: 'Events & Partnerships', status: 'none',     href: '#' },
  { label: 'Awards',                status: 'none',     href: '#' },
  { label: 'Paid Media',            status: 'none',     href: '#' },
  { label: 'Design',                status: 'none',     href: '#' },
  { label: 'eDM',                   status: 'none',     href: '#' },
  { label: 'Reporting',             status: 'partial',  href: '/reports' },
];

function renderShell({ pageId, title }) {
  const sidebar = document.getElementById('sidebar');
  const header  = document.getElementById('header');

  const teamCollapsed = localStorage.getItem('sidebar-team-collapsed') === 'true';

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
      ${NAV_ITEMS.map(item => `
        <a class="nav-item ${item.id === pageId ? 'active' : ''}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      `).join('')}

      <div class="nav-section-label nav-section-toggle" id="types-section-label" style="margin-top:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding-right:12px;" onclick="toggleSidebarTypes()">
        Campaign Types
        <span id="types-chevron" style="font-size:9px;color:var(--text-dim);transition:transform 0.2s;">▼</span>
      </div>
      <div id="sidebar-types">
        ${CAMPAIGN_TYPE_STATUS.map(t => {
          const dot = t.status === 'built' ? `<span style="color:var(--success);font-size:9px;">●</span>`
                    : t.status === 'partial' ? `<span style="color:var(--warning);font-size:9px;">●</span>`
                    : `<span style="color:var(--text-dim);font-size:9px;">○</span>`;
          const dim = t.status === 'none' ? 'opacity:.45;pointer-events:none;' : '';
          return `<a class="nav-item" href="${t.href}" style="padding-left:22px;${dim}">
            <span class="nav-icon" style="font-size:11px;">${dot}</span>
            <span class="nav-label" style="font-size:12px;">${t.label}</span>
          </a>`;
        }).join('')}
      </div>

      <div class="nav-section-label nav-section-toggle" id="team-section-label" style="margin-top:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding-right:12px;" onclick="toggleSidebarTeam()">
        Team
        <span id="team-chevron" style="font-size:9px;color:var(--text-dim);transition:transform 0.2s;${teamCollapsed ? 'transform:rotate(-90deg)' : ''}">▼</span>
      </div>
      <div id="sidebar-team" style="${teamCollapsed ? 'display:none' : ''}"></div>
    </nav>
    <div class="sidebar-footer">
      <a class="nav-item ${'clients' === pageId ? 'active' : ''}" href="/clients">
        <span class="nav-icon">◎</span>
        <span class="nav-label">Accounts | Admin</span>
      </a>
      <a class="nav-item ${'team-admin' === pageId ? 'active' : ''}" href="/team-admin">
        <span class="nav-icon">◉</span>
        <span class="nav-label">Team</span>
      </a>
      <a class="nav-item" href="#">
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

  // Campaign Types section collapse toggle
  window.toggleSidebarTypes = function() {
    const el      = document.getElementById('sidebar-types');
    const chevron = document.getElementById('types-chevron');
    const isCollapsed = el.style.display === 'none';
    el.style.display = isCollapsed ? '' : 'none';
    chevron.style.transform = isCollapsed ? '' : 'rotate(-90deg)';
  };

  // Team section collapse toggle
  window.toggleSidebarTeam = function() {
    const teamEl = document.getElementById('sidebar-team');
    const chevron = document.getElementById('team-chevron');
    const isCollapsed = teamEl.style.display === 'none';
    teamEl.style.display = isCollapsed ? '' : 'none';
    chevron.style.transform = isCollapsed ? '' : 'rotate(-90deg)';
    localStorage.setItem('sidebar-team-collapsed', isCollapsed ? 'false' : 'true');
  };

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
      document.getElementById('sidebar-clients').innerHTML = '';
    });

  // Team list — pulled from team_members table
  fetch('/api/team-members/names')
    .then(r => r.json())
    .then(members => {
      const el = document.getElementById('sidebar-team');
      if (!members.length) { el.innerHTML = ''; return; }
      el.innerHTML = members.map(name => {
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const active = pageId === 'team-' + name.toLowerCase();
        return `
          <a class="nav-item nav-item-client ${active ? 'active' : ''}" href="/team/${encodeURIComponent(name)}">
            <span class="nav-icon" style="width:18px;height:18px;border-radius:50%;background:var(--accent);color:#000;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;">${initials}</span>
            <span class="nav-label">${name}</span>
          </a>
        `;
      }).join('');
    })
    .catch(() => { document.getElementById('sidebar-team').innerHTML = ''; });
}
