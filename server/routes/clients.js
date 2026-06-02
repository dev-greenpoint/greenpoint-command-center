const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');
const { TASK_TEMPLATES } = require('../db/taskTemplates');
const { GENERAL_CHECKLIST, SERVICE_CHECKLIST } = require('../db/checklistTemplates');
const { runResearch } = require('../db/runResearch');

function rowsFromResult(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM clients ORDER BY created_at DESC');
  res.json(rowsFromResult(result));
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM clients WHERE id=?', [req.params.id]);
  const rows = rowsFromResult(result);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { name, industry, status, account_lead, website, contact_name, contact_email, contact_phone, services, platforms, start_date, campaign_length, end_date, monthly_hours, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.run(
    `INSERT INTO clients (name, industry, status, account_lead, website, contact_name, contact_email, contact_phone, services, platforms, start_date, campaign_length, end_date, monthly_hours, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, industry || null, status || 'onboarding', account_lead || null, website || null, contact_name || null, contact_email || null, contact_phone || null, services || null, platforms || null, start_date || null, campaign_length || null, end_date || null, monthly_hours || null, notes || null]
  );

  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const clientId = idResult[0].values[0][0];

  // Auto-generate placeholder tasks from selected services
  if (services) {
    const selectedServices = services.split(',').map(s => s.trim()).filter(Boolean);
    for (const service of selectedServices) {
      const templates = TASK_TEMPLATES[service] || [];
      for (const title of templates) {
        db.run(
          `INSERT INTO tasks (client_id, title, service, status) VALUES (?, ?, ?, 'todo')`,
          [clientId, title, service]
        );
      }
    }
  }

  // Auto-generate onboarding checklist
  for (const item of GENERAL_CHECKLIST) {
    db.run(`INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, 'general')`, [clientId, item]);
  }
  if (services) {
    const selectedServices = services.split(',').map(s => s.trim()).filter(Boolean);
    for (const service of selectedServices) {
      const items = SERVICE_CHECKLIST[service] || [];
      for (const item of items) {
        db.run(`INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)`, [clientId, item, service]);
      }
    }
  }

  saveDb();
  res.status(201).json({ id: clientId });

  // Run research in background — don't await
  runResearch(clientId);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();

  // Fetch existing record so partial updates don't wipe fields
  const existing = db.exec('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!existing.length || !existing[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cur = Object.fromEntries(existing[0].columns.map((c, i) => [c, existing[0].values[0][i]]));

  const b = req.body;
  const val = k => (k in b ? (b[k] || null) : cur[k]);

  db.run(
    `UPDATE clients SET name=?, industry=?, status=?, account_lead=?, website=?, contact_name=?, contact_email=?, contact_phone=?, services=?, platforms=?, start_date=?, campaign_length=?, end_date=?, monthly_hours=?, notes=?, onboarding_complete=?
     WHERE id=?`,
    [val('name'), val('industry'), val('status') || 'onboarding', val('account_lead'), val('website'), val('contact_name'), val('contact_email'), val('contact_phone'), val('services'), val('platforms'), val('start_date'), val('campaign_length'), val('end_date'), val('monthly_hours'), val('notes'), 'onboarding_complete' in b ? (b.onboarding_complete ? 1 : 0) : cur.onboarding_complete, req.params.id]
  );
  saveDb();
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM clients WHERE id=?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
