const db = require('./database');

async function initSchema() {
  const d = await db.getDb();

  d.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      service TEXT,
      status TEXT DEFAULT 'todo',
      assignee TEXT,
      due_date TEXT,
      notes TEXT,
      needs_approval INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS client_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS client_team (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS onboarding_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      completed INTEGER DEFAULT 0,
      completed_at TEXT
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      type TEXT,
      start_date TEXT,
      end_date TEXT,
      budget REAL,
      notes TEXT,
      current_stage INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS campaign_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      stage_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      assignee TEXT,
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Untitled Strategy',
      sections TEXT DEFAULT '{}',
      active_sections TEXT DEFAULT '["overview","audiences","messages","channels","timeline","measurement"]',
      share_token TEXT UNIQUE,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try { d.run(`ALTER TABLE strategies ADD COLUMN client_id INTEGER`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE strategies DROP COLUMN campaign_id`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE strategies ADD COLUMN submitted_by TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE strategies ADD COLUMN reviewer TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE strategies ADD COLUMN submitted_at TEXT`); db.saveDb(); } catch {}

  d.run(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      platform TEXT NOT NULL,
      format TEXT DEFAULT 'Post',
      caption TEXT,
      status TEXT DEFAULT 'draft',
      assignee TEXT,
      post_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add columns that may not exist in older DBs
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN assignee TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaigns ADD COLUMN scope TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaigns ADD COLUMN setup TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE clients ADD COLUMN platforms TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE clients ADD COLUMN monthly_hours INTEGER`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN due_date TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN progress TEXT DEFAULT 'Not Assigned'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN estimated_time TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN approver TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN task_type TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN priority TEXT DEFAULT 'Medium'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN notes TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaigns ADD COLUMN sked_link TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaigns ADD COLUMN slack_channel TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaigns ADD COLUMN social_admin TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE social_posts ADD COLUMN title TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE social_posts ADD COLUMN content_pillar TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE social_posts ADD COLUMN sked_link TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE social_posts ADD COLUMN published_link TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE social_posts ADD COLUMN notes TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE clients ADD COLUMN code TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE clients ADD COLUMN slack_channel TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE clients ADD COLUMN drive_folder_url TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN stage_index INTEGER`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN stage_name TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN auto_type TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN service_filter TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN parent_id INTEGER`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN estimated_time TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN start_date TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN recurring TEXT DEFAULT 'none'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN approver TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN task_type TEXT DEFAULT 'Onboarding'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN priority TEXT DEFAULT 'Medium'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN progress TEXT DEFAULT 'On track'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN assignee TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE onboarding_checklist ADD COLUMN notes TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN estimated_time TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN start_date TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN recurring TEXT DEFAULT 'none'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN approver TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN task_type TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Medium'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN progress TEXT DEFAULT 'On track'`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE tasks ADD COLUMN parent_id INTEGER`); db.saveDb(); } catch {}

  d.run(`
    CREATE TABLE IF NOT EXISTS media_hubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS media_coverage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS media_top_coverage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hub_id INTEGER REFERENCES media_hubs(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      title TEXT,
      description TEXT,
      publisher TEXT,
      media_type TEXT,
      audience TEXT,
      image_url TEXT,
      article_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS media_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hub_id INTEGER REFERENCES media_hubs(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      work_completed TEXT,
      insights TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(hub_id, month)
    )
  `);

  db.saveDb();

  // Purge orphaned records left by clients deleted before cascade was in place
  d.run(`DELETE FROM campaign_tasks WHERE campaign_id IN (SELECT id FROM campaigns WHERE client_id NOT IN (SELECT id FROM clients))`);
  d.run(`DELETE FROM social_posts   WHERE campaign_id IN (SELECT id FROM campaigns WHERE client_id NOT IN (SELECT id FROM clients))`);
  d.run(`DELETE FROM campaigns         WHERE client_id  NOT IN (SELECT id FROM clients)`);
  d.run(`DELETE FROM tasks             WHERE client_id  NOT IN (SELECT id FROM clients)`);
  d.run(`DELETE FROM onboarding_checklist WHERE client_id NOT IN (SELECT id FROM clients)`);
  d.run(`DELETE FROM strategies        WHERE client_id  NOT IN (SELECT id FROM clients)`);
  d.run(`DELETE FROM client_contacts   WHERE client_id  NOT IN (SELECT id FROM clients)`);
  d.run(`DELETE FROM client_team       WHERE client_id  NOT IN (SELECT id FROM clients)`);

  db.saveDb();
}

module.exports = { initSchema };
