// Run this ONLY while the server is stopped.
// Usage: node scripts/reset-client-tasks.js <clientId>
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/db/greenpoint.db');
const { TASK_TEMPLATES } = require('../server/db/taskTemplates');
const { GENERAL_CHECKLIST, SERVICE_CHECKLIST } = require('../server/db/checklistTemplates');

const clientId = parseInt(process.argv[2] || '2');

async function run() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  const result = db.exec('SELECT id, name, services FROM clients WHERE id=?', [clientId]);
  if (!result.length) { console.log('Client not found'); process.exit(1); }
  const [id, name, services] = result[0].values[0];
  console.log(`Resetting: ${name} | services: ${services}`);

  db.run('DELETE FROM tasks WHERE client_id=?', [clientId]);
  db.run('DELETE FROM onboarding_checklist WHERE client_id=?', [clientId]);

  const serviceList = (services || '').split(',').map(s => s.trim()).filter(Boolean);

  for (const svc of serviceList) {
    for (const title of (TASK_TEMPLATES[svc] || [])) {
      db.run('INSERT INTO tasks (client_id, title, service, status) VALUES (?, ?, ?, ?)', [clientId, title, svc, 'todo']);
    }
  }
  for (const item of GENERAL_CHECKLIST) {
    db.run('INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)', [clientId, item, 'general']);
  }
  for (const svc of serviceList) {
    for (const item of (SERVICE_CHECKLIST[svc] || [])) {
      db.run('INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)', [clientId, item, svc]);
    }
  }

  const taskCheck = db.exec('SELECT title FROM tasks WHERE client_id=?', [clientId]);
  console.log(`\nTasks inserted (${taskCheck[0]?.values.length || 0}):`);
  (taskCheck[0]?.values || []).forEach(([t]) => console.log(`  - ${t}`));

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('\nSaved. Start the server now.');
}

run().catch(console.error);
