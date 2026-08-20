-- Greenpoint Command Center v2 — Postgres schema (Supabase)
-- Run once via the Supabase SQL editor. Not executed by the app at runtime
-- (unlike the old sql.js schema.js, which re-asserted this on every boot) —
-- this file is a human-readable record of what was applied.
--
-- Converted from server/db/schema.js's final column set (i.e. base CREATE
-- TABLE + every historical ALTER TABLE folded in) — this is a fresh schema,
-- no data migration from the old sql.js file.

CREATE TABLE clients (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  status TEXT DEFAULT 'onboarding',
  account_lead TEXT,
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  services TEXT,
  platforms TEXT,
  start_date TEXT,
  campaign_length INTEGER,
  end_date TEXT,
  notes TEXT,
  research TEXT,
  onboarding_complete INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW(),
  monthly_hours INTEGER,
  code TEXT,
  slack_channel TEXT,
  drive_folder_url TEXT,
  brain_summary TEXT
);

CREATE TABLE team_members (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE campaigns (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  type TEXT,
  start_date TEXT,
  end_date TEXT,
  budget REAL,
  notes TEXT,
  current_stage INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW(),
  scope TEXT,
  setup TEXT,
  sked_link TEXT,
  slack_channel TEXT,
  campaign_period TEXT,
  social_admin TEXT
);

CREATE TABLE tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  service TEXT,
  status TEXT DEFAULT 'todo',
  assignee TEXT,
  due_date TEXT,
  notes TEXT,
  needs_approval INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW(),
  estimated_time TEXT,
  start_date TEXT,
  recurring TEXT DEFAULT 'none',
  approver TEXT,
  task_type TEXT,
  priority TEXT DEFAULT 'Medium',
  progress TEXT DEFAULT 'On track',
  parent_id INTEGER
);

CREATE TABLE client_contacts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE client_team (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE onboarding_checklist (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  stage_index INTEGER,
  stage_name TEXT,
  auto_type TEXT,
  service_filter TEXT,
  parent_id INTEGER,
  estimated_time TEXT,
  start_date TEXT,
  recurring TEXT DEFAULT 'none',
  approver TEXT,
  task_type TEXT DEFAULT 'Onboarding',
  priority TEXT DEFAULT 'Medium',
  progress TEXT DEFAULT 'On track',
  assignee TEXT,
  notes TEXT
);

CREATE TABLE campaign_tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  stage_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  assignee TEXT,
  done INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW(),
  due_date TEXT,
  progress TEXT DEFAULT 'Not Assigned',
  estimated_time TEXT,
  approver TEXT,
  task_type TEXT,
  priority TEXT DEFAULT 'Medium',
  notes TEXT
);

CREATE TABLE strategies (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Strategy',
  sections TEXT DEFAULT '{}',
  active_sections TEXT DEFAULT '["overview","audiences","messages","channels","timeline","measurement"]',
  share_token TEXT UNIQUE,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT NOW(),
  updated_at TEXT DEFAULT NOW(),
  submitted_by TEXT,
  reviewer TEXT,
  submitted_at TEXT,
  doc_type TEXT DEFAULT 'strategy',
  created_by TEXT
);

-- Deck-level notes/feedback thread (Settings > lighter alternative to
-- per-section comments — see [[deck_comments_2026-08-20]] in memory).
-- section_id is unused for now (always NULL) but kept so this can grow
-- into per-section anchoring later without another migration.
CREATE TABLE strategy_comments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
  section_id TEXT,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE social_posts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  platform TEXT NOT NULL,
  format TEXT DEFAULT 'Post',
  caption TEXT,
  status TEXT DEFAULT 'draft',
  assignee TEXT,
  post_date TEXT,
  created_at TEXT DEFAULT NOW(),
  title TEXT,
  content_pillar TEXT,
  sked_link TEXT,
  published_link TEXT,
  notes TEXT
);

CREATE TABLE media_hubs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  share_token TEXT UNIQUE,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE media_coverage (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hub_id INTEGER REFERENCES media_hubs(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  date TEXT,
  campaign_id INTEGER,
  campaign_name TEXT,
  publication TEXT,
  author TEXT,
  headline TEXT,
  page_num TEXT,
  tone TEXT DEFAULT 'Neutral',
  stakeholder_mentions INTEGER DEFAULT 0,
  images_included INTEGER DEFAULT 0,
  ctas INTEGER DEFAULT 0,
  circulation INTEGER DEFAULT 0,
  hit INTEGER DEFAULT 1,
  asr REAL DEFAULT 0,
  media_type TEXT DEFAULT 'Online',
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE media_top_coverage (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hub_id INTEGER REFERENCES media_hubs(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  title TEXT,
  description TEXT,
  publisher TEXT,
  media_type TEXT,
  audience TEXT,
  image_url TEXT,
  article_url TEXT,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE media_reports (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hub_id INTEGER REFERENCES media_hubs(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  work_completed TEXT,
  insights TEXT,
  created_at TEXT DEFAULT NOW(),
  UNIQUE(hub_id, month)
);

CREATE TABLE client_meetings (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Internal Brief',
  scheduled_date TEXT,
  meeting_type TEXT DEFAULT 'online',
  notes TEXT,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE pitch_lists (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE brain_entries (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT,
  pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW(),
  updated_at TEXT DEFAULT NOW()
);

CREATE TABLE pitch_contacts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  list_id INTEGER REFERENCES pitch_lists(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'General',
  publication TEXT,
  journalist_name TEXT,
  journalist_title TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT '',
  pitched_date TEXT,
  followup_date TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT NOW()
);

-- Storage bucket for Strategy Builder image uploads (public, read-only URLs)
insert into storage.buckets (id, name, public)
values ('strategy-images', 'strategy-images', true)
on conflict (id) do nothing;
