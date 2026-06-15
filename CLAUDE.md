# Greenpoint Command Center v2 — CLAUDE.md

Internal operations dashboard for Greenpoint Media (PR agency). Built with Node.js/Express + sql.js (SQLite) + vanilla JS frontend. No framework, no build step — just files.

## Running locally

```bash
npm run dev       # nodemon, auto-restarts on change
# or
npm start         # plain node, no restart
```

App runs at **http://localhost:3000**. Requires a `.env` file with `ANTHROPIC_API_KEY`.

## Architecture

```
server/
  index.js              # Express entry point, static serving, file upload
  db/
    database.js         # sql.js init — loads greenpoint.db from disk on start
    schema.js           # CREATE TABLE + ALTER TABLE migrations (try/catch pattern)
    campaignTaskTemplates.js  # Stage names and default tasks per campaign type
    checklistTemplates.js     # Onboarding checklist items by service
    runResearch.js      # Claude AI client research (called during onboarding)
    runDrive.js         # Google Drive folder creation (called during onboarding)
  routes/               # One file per resource domain

client/
  index.html            # Overview (home)
  pages/                # One HTML file per page, all self-contained
  components/shell.js   # Shared sidebar + header rendered by every page
  styles/               # CSS (main.css + component styles)
  uploads/              # File uploads stored here (gitignored)
```

**Database**: sql.js loads `server/db/greenpoint.db` into memory on startup and writes it back to disk on every mutation (`saveDb()`). The file is gitignored — on first run a fresh DB is created. Schema migrations use `try { ALTER TABLE ... } catch {}` so they're safe to run repeatedly.

## Key domain concepts

### Clients
- Each client has a `status`: `onboarding` → `active` → `inactive`
- `code` is auto-generated from client name initials (e.g. "Greenpoint Media" → `GM`)
- Client board is created at the end of onboarding (step 6: Generate Client Board), not on client add. The "View Board" button is gated behind `board_ready` flag.
- Onboarding checklist is populated from `checklistTemplates.js` based on which services the client has

### Campaigns
Campaign `type` drives everything — stages, task templates, and which board view is used:

| Type | Stages | Board |
|---|---|---|
| PR / PR Light | Campaign Prep → Development → Client Approval → Set up Public Address → Pitch → Complete | `campaign-board.html` |
| Social Media | Schedule Prep → Content Creation → Scheduling & Boosting | `social-board.html` |
| Events & Partnerships | Event Deck & Budget → Planning → Event Day | campaign-board |
| Paid Media | Planning → In Progress → Review → Wrap-up | campaign-board |
| Design | Briefing → Design → Revisions → Final Delivery | campaign-board |

**Social is a separate workflow** — do not apply PR campaign logic (15-step stages, Complete→Reporting flow) to social campaigns.

PR campaign's 15-step workflow lives in memory (`project_pr_workflow.md`) and is the reference for PR-type campaign stages, task templates, and pipeline view.

### Tasks
- Tasks can belong to a client (via `client_id`) or a campaign (via `campaign_id`)
- `campaign_tasks` table = tasks scoped to a campaign stage
- `tasks` table = general client tasks (used in the client board)
- `onboarding_checklist` table = onboarding steps (separate from both)
- Tasks auto-assign based on team member roles set at onboarding — no manual assignment step

### Strategies
- Belong to a client (`client_id`)
- Sections stored as JSON in `sections` TEXT column
- Can be shared externally via `share_token`
- Status: `draft` → `submitted` → `approved`

### Media Hub
- One hub per client per year
- Coverage entries tracked in `media_coverage`; top coverage in `media_top_coverage`
- Monthly reports in `media_reports`
- Share via `share_token` (external view at `/media-hub-share.html`)

### Pitch Lists
- Linked to both a client and a campaign
- `pitch_contacts` table stores journalist contacts with pitch status tracking

## Navigation (shell.js)

Sidebar has two sections:
- **Clients** — dynamically loaded list
- **Workspace** — Overview, Deck Creator, Campaign Manager, Social Campaigns, Approvals, Reports

Campaign Types section shows build status (● built / ● partial / ○ not started):
- PR: built, Social: built, Reporting: partial, others: not started

## UI conventions

- **Tabs**: always use campaign-board style — filled accent colour when active, `border-radius: 8px 8px 0 0`, `border-bottom` wrapper. No underline tabs, no pill tabs.
- **CSS variables**: `--accent`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--text-dim`, `--warning`, `--success`, `--radius`
- **XSS safety**: use `escAttr()` / `escHtml()` helpers when interpolating user data into HTML strings
- **No framework**: all pages are plain HTML files that fetch `/api/...` endpoints and render via template literals

## API routes

| Mount | File | Purpose |
|---|---|---|
| `/api/clients` | routes/clients.js | CRUD + onboarding trigger |
| `/api/campaigns` | routes/campaigns.js | CRUD + stage management |
| `/api/tasks` | routes/tasks.js | Client tasks |
| `/api/strategies` | routes/strategies.js | Strategy builder |
| `/api/media-hubs` | routes/media-hubs.js | Coverage tracking |
| `/api/team` | routes/team.js | Team members |
| `/api/team-members` | routes/team-members.js | Team admin |
| `/api/team-planner` | routes/team-planner.js | Capacity planner |
| `/api/contacts` | routes/contacts.js | Client contacts |
| `/api/onboarding` | routes/onboarding.js | Onboarding checklist |
| `/api/overview` | routes/overview.js | Dashboard stats |
| `/api/meetings` | routes/meetings.js | Client meetings |
| `/api/pitch-lists` | routes/pitch-lists.js | Pitch list + contacts |
| `/api/profile` | routes/profile.js | Client profile |
| `/api/research` | routes/research.js | AI research runner |
| `/api/upload` | server/index.js | Image upload |

## Environment variables

```
ANTHROPIC_API_KEY=   # Required for AI features (research, report summaries)
PORT=3000            # Optional, defaults to 3000
```

Google Drive integration (`runDrive.js`) uses `googleapis` — OAuth credentials are handled separately and not yet wired to env vars in production.

## What's built vs in progress

| Feature | Status |
|---|---|
| Client management + onboarding | Built |
| PR campaign board | Built |
| Social campaign board | Built |
| Strategies (builder + share) | Built |
| Media Hub (coverage + share) | Built |
| Team planner | Built |
| Approvals | Built |
| Deck Creator | Page exists, routing needs wiring |
| Reports | Page exists, partial |
| Google Drive auto-create | Partial (runDrive.js exists) |
| Slack auto-create | Deferred |
| Auth / login | Not started |

## What NOT to do

- Don't apply PR campaign stage logic to Social campaigns — social is its own separate board
- Don't use underline or pill-style tabs anywhere in the UI
- Don't add features beyond what's asked — the codebase is intentionally lean
- Don't mock the DB in any test context — sql.js loads from a real file
