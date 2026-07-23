const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/', async (req, res) => {
  const clients   = await query('SELECT * FROM clients ORDER BY created_at DESC');
  const campaigns = await query("SELECT * FROM campaigns WHERE status != 'completed' ORDER BY created_at DESC");

  const active     = clients.filter(c => c.status === 'active');
  const onboarding = clients.filter(c => c.status === 'onboarding');

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
