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

  // Add columns that may not exist in older DBs
  try { d.run(`ALTER TABLE clients ADD COLUMN platforms TEXT`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE clients ADD COLUMN monthly_hours INTEGER`); db.saveDb(); } catch {}
  try { d.run(`ALTER TABLE campaign_tasks ADD COLUMN due_date TEXT`); db.saveDb(); } catch {}

  db.saveDb();
}

module.exports = { initSchema };
