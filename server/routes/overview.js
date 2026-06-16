const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

router.get('/', async (req, res) => {
  const db = await getDb();

  const clients   = rows(db.exec('SELECT * FROM clients ORDER BY created_at DESC'));
  const campaigns = rows(db.exec('SELECT * FROM campaigns WHERE status != "completed" ORDER BY created_at DESC'));
  const checklist = rows(db.exec('SELECT * FROM onboarding_checklist'));
  const team      = rows(db.exec('SELECT * FROM client_team'));

  const active     = clients.filter(c => c.status === 'active');
  const onboarding = clients.filter(c => c.status === 'onboarding');

  // Onboarding progress per client
  const onboardingProgress = onboarding.map(c => {
    const items = checklist.filter(i => i.client_id === c.id);
    const done  = items.filter(i => i.completed).length;
    return { id: c.id, name: c.name, total: items.length, done };
  });

  // Active clients with campaigns bundled in
  const today = new Date();
  const activeProgress = active.map(c => {
    let pct = null;
    let daysLeft = null;
    if (c.start_date && c.end_date) {
      const start = new Date(c.start_date);
      const end   = new Date(c.end_date);
      pct      = Math.min(100, Math.max(0, Math.round(((today - start) / (end - start)) * 100)));
      daysLeft = Math.max(0, Math.round((end - today) / (1000 * 60 * 60 * 24)));
    }
    const clientCampaigns = campaigns.filter(camp => camp.client_id === c.id).map(camp => ({
      id:           camp.id,
      name:         camp.name,
      type:         camp.type,
      status:       camp.status,
      currentStage: camp.current_stage,
    }));
    return { id: c.id, name: c.name, services: c.services, pct, daysLeft, campaigns: clientCampaigns };
  });

  // Team workload
  const workload = {};
  team.forEach(m => {
    if (!workload[m.name]) workload[m.name] = { name: m.name, clients: [] };
    const client = clients.find(c => c.id === m.client_id);
    if (client) workload[m.name].clients.push({ id: client.id, name: client.name, role: m.role, status: client.status });
  });

  res.json({
    stats: {
      activeClients:     active.length,
      onboardingClients: onboarding.length,
      activeCampaigns:   campaigns.length,
    },
    activeProgress,
  });
});

module.exports = router;
