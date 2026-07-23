const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/database');
const { GENERAL_CHECKLIST, SERVICE_CHECKLIST, ONBOARDING_STAGES, TASK_TEMPLATES } = require('../db/checklistTemplates');
const { runResearch } = require('../db/runResearch');
const { runDrive } = require('../db/runDrive');

async function generateClientCode(name, q) {
  const SKIP = new Set(['the','a','an','and','of','or','&','at','for','in','by']);
  const words = name.trim().split(/\s+/).filter(w => !SKIP.has(w.toLowerCase()) && w.length > 0);
  let base;
  if (words.length === 1) {
    base = words[0].replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  } else {
    base = words.map(w => w.replace(/[^a-zA-Z]/g, '')[0] || '').join('').toUpperCase().slice(0, 4);
  }
  if (!base) base = name.slice(0, 3).toUpperCase();

  const existing = (await q('SELECT code FROM clients WHERE code IS NOT NULL')).map(r => r.code);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(base + i)) i++;
  return base + i;
}

router.get('/', async (req, res) => {
  res.json(await query('SELECT * FROM clients ORDER BY created_at DESC'));
});

router.get('/:id', async (req, res) => {
  const rows = await query('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const { name, industry, status, account_lead, website, contact_name, contact_email, contact_phone, services, platforms, start_date, campaign_length, end_date, monthly_hours, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const clientId = await transaction(async (q) => {
    const code = await generateClientCode(name, q);

    const [{ id: clientId }] = await q(
      `INSERT INTO clients (name, industry, status, account_lead, website, contact_name, contact_email, contact_phone, services, platforms, start_date, campaign_length, end_date, monthly_hours, notes, code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, industry || null, status || 'onboarding', account_lead || null, website || null, contact_name || null, contact_email || null, contact_phone || null, services || null, platforms || null, start_date || null, campaign_length || null, end_date || null, monthly_hours || null, notes || null, code]
    );

    // Seed 7-stage onboarding tasks (parent row per stage + subtasks)
    const selectedServices = services ? services.split(',').map(s => s.trim()).filter(Boolean) : [];
    for (const stage of ONBOARDING_STAGES) {
      const stageFilter = stage.service_filter || null;
      if (stageFilter && !selectedServices.includes(stageFilter)) continue;

      // Parent task row for this stage
      const parentName = `${code} — Onboarding — ${stage.name}`;
      const [{ id: parentId }] = await q(
        `INSERT INTO onboarding_checklist (client_id, item, category, stage_index, stage_name, task_type, priority, progress, parent_id)
         VALUES (?, ?, 'onboarding', ?, ?, 'Onboarding', 'Medium', 'Not Assigned', NULL) RETURNING id`,
        [clientId, parentName, stage.index, stage.name]
      );

      // Subtasks
      for (const task of stage.tasks) {
        const taskFilter = task.service_filter || null;
        if (taskFilter && !selectedServices.includes(taskFilter)) continue;
        await q(
          `INSERT INTO onboarding_checklist (client_id, item, category, stage_index, stage_name, auto_type, service_filter, task_type, priority, progress, parent_id)
           VALUES (?, ?, 'onboarding', ?, ?, ?, ?, 'Onboarding', 'Medium', 'Not Assigned', ?)`,
          [clientId, task.item, stage.index, stage.name, task.auto_type || null, taskFilter || null, parentId]
        );
      }
    }

    // Seed service-specific setup checklist items (shown on service sections)
    for (const item of GENERAL_CHECKLIST) {
      await q(`INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, 'general')`, [clientId, item]);
    }
    for (const service of selectedServices) {
      const items = SERVICE_CHECKLIST[service] || [];
      for (const item of items) {
        await q(`INSERT INTO onboarding_checklist (client_id, item, category) VALUES (?, ?, ?)`, [clientId, item, service]);
      }
    }

    // Seed task templates (XXX → client code)
    for (const tmpl of TASK_TEMPLATES) {
      const title = tmpl.title.replace(/XXX/g, code);
      await q(
        `INSERT INTO tasks (client_id, title, service, task_type, priority, progress)
         VALUES (?, ?, ?, ?, 'Medium', 'Not Assigned')`,
        [clientId, title, tmpl.section, tmpl.task_type || null]
      );
    }

    return clientId;
  });

  res.status(201).json({ id: clientId });

  // Run background tasks — don't await
  runResearch(clientId);
  runDrive(clientId);
});

router.put('/:id', async (req, res) => {
  // Fetch existing record so partial updates don't wipe fields
  const existing = await query('SELECT * FROM clients WHERE id=?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const cur = existing[0];

  const b = req.body;
  const val = k => (k in b ? (b[k] || null) : cur[k]);

  await query(
    `UPDATE clients SET name=?, industry=?, status=?, account_lead=?, website=?, contact_name=?, contact_email=?, contact_phone=?, services=?, platforms=?, start_date=?, campaign_length=?, end_date=?, monthly_hours=?, notes=?, onboarding_complete=?
     WHERE id=?`,
    [val('name'), val('industry'), val('status') || 'onboarding', val('account_lead'), val('website'), val('contact_name'), val('contact_email'), val('contact_phone'), val('services'), val('platforms'), val('start_date'), val('campaign_length'), val('end_date'), val('monthly_hours'), val('notes'), 'onboarding_complete' in b ? (b.onboarding_complete ? 1 : 0) : cur.onboarding_complete, req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  // All child tables have ON DELETE CASCADE (enforced reliably by Postgres),
  // so deleting the client alone cascades through campaigns/tasks/strategies/
  // media hubs/contacts/team, transitively through their own children too.
  await query('DELETE FROM clients WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
