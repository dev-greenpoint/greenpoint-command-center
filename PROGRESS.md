# Build Progress

## What's built

### Backend
- Node/Express server on port 3000
- sql.js (WASM SQLite) database at `server/db/greenpoint.db`
- `.env` file holds ANTHROPIC_API_KEY

### Database tables
- `clients` — name, industry, status, website, services, platforms, start_date, campaign_length, end_date, notes, research
- `tasks` — per client, per service, with status (todo/in_progress/done)
- `onboarding_checklist` — general + service-specific items per client
- `client_team` — team members with roles
- `client_contacts` — multiple contacts per client

### API routes
- `GET/POST/PUT/DELETE /api/clients`
- `GET /api/clients/:id/profile` — full profile data
- `POST /api/clients/:id/research` — runs Claude Haiku research from website
- `POST /api/clients/:id/complete-onboarding` — marks client active
- `PATCH /api/clients/:id/checklist/:itemId` — toggle checklist item
- `GET/POST/DELETE /api/clients/:id/team`
- `GET/POST/DELETE /api/clients/:id/contacts`
- `PATCH /api/tasks/:id` — update task status
- `GET /api/overview` — dashboard stats

### Pages
- `/` — Overview Dashboard (real data: stats, active clients, onboarding, team workload)
- `/clients` — Accounts list (add/edit drawer with full form)
- `/clients/:id` — Client Profile (onboarding setup, checklist, tasks)
- `/clients/:id/board` — Client Board (working dashboard: campaign timeline, tasks, team, contacts, research)

### Sidebar
- Nav: Overview, Accounts, Campaigns, Social, Approvals, Reports
- Dynamic client list below nav — links to each client's board

### Add Client form (drawer)
- Name, website, campaign start + length
- Client contacts (multiple)
- Services (12 options + Other)
- Content platforms (Facebook, Instagram, LinkedIn, TikTok, YouTube, Other)
- Team with roles (8 members, 6 roles)
- Notes
- Auto-generates tasks + checklist on create
- Auto-runs Claude research in background

### Task + checklist templates
- Updated for all 12 services based on full scope doc
- Reference docs saved: SERVICES.md, CAMPAIGN_WORKFLOW.md, CAMPAIGN_STRUCTURE.md

---

## What's next

### Immediate
- Client board edits (user has a list of fixes to go through)
- Fix team section JS (role dropdowns, getTeam/setTeam)

### Coming up
- Campaign Tracker — campaigns tied to clients, phases, dates, status
- Task Board — all tasks across clients, filter by service/assignee/status
- Approvals Board
- Social Board
- Reports

### Later
- Git + deploy to Railway (backend) + Vercel (frontend)
- Retainer/financials (private, separate section)
- Content platform conditional show (only when Content service selected)
- Design pass

---

## How to run
```
cd "/Users/shoes/Documents/Claude/Projects/Greenpoint Command Center v2"
node server/index.js
```
Then open http://localhost:3000
