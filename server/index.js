require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { query } = require('./db/database');
const overviewRouter = require('./routes/overview');
const clientsRouter = require('./routes/clients');
const researchRouter = require('./routes/research');
const profileRouter = require('./routes/profile');
const tasksRouter = require('./routes/tasks');
const teamRouter = require('./routes/team');
const contactsRouter = require('./routes/contacts');
const campaignsRouter = require('./routes/campaigns');
const teamPlannerRouter = require('./routes/team-planner');
const teamMembersRouter = require('./routes/team-members');
const { router: strategiesRouter } = require('./routes/strategies');
const mediaHubsRouter = require('./routes/media-hubs');
const onboardingRouter = require('./routes/onboarding');
const meetingsRouter = require('./routes/meetings');
const pitchListsRouter = require('./routes/pitch-lists');
const { clientBrainRouter, entryRouter: brainEntryRouter } = require('./routes/brain');

const app = express();
const PORT = process.env.PORT || 3000;

// Route handlers here don't wrap their `await query(...)` calls in try/catch,
// so a transient DB hiccup (e.g. Supabase's pooler dropping a connection
// mid-query) becomes an unhandled rejection — which crashes the whole
// process by default in modern Node. This keeps the server alive; the
// specific request that hit the dropped connection will hang/time out
// client-side rather than crashing every other in-flight request too.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (request likely failed, server staying up):', err);
});

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

// ── File uploads (Supabase Storage — no local disk, works on serverless) ──────
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype));
  },
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('strategy-images')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data } = supabase.storage.from('strategy-images').getPublicUrl(filename);
    res.json({ url: data.publicUrl });
  });
});

app.get('/api/health', async (req, res) => {
  await query('SELECT 1');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/overview', overviewRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/clients', researchRouter);
app.use('/api/clients', profileRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/clients', teamRouter);
app.use('/api/clients', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/team-planner', teamPlannerRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/strategies', strategiesRouter);
app.use('/api/media-hubs', mediaHubsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/clients', meetingsRouter);
app.use('/api/pitch-lists', pitchListsRouter);
app.use('/api/clients/:id/brain', clientBrainRouter);
app.use('/api/brain', brainEntryRouter);

const PAGES = ['clients', 'campaigns', 'social', 'approvals', 'reports', 'team-admin', 'strategies', 'deck-creator', 'settings', 'timesheets'];
PAGES.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `../client/pages/${page}.html`));
  });
});

app.get('/team/:name', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/team-planner.html'));
});

app.get('/social/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/social-board.html'));
});

app.get('/campaigns/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/campaign-board.html'));
});

app.get('/clients/:id/board', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/client-board.html'));
});

app.get('/clients/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/client-profile.html'));
});

app.get('/strategy/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/strategy-builder.html'));
});

app.get('/s/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/strategy-view.html'));
});

app.get('/pitch-list/:campaignId', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/pitch-list.html'));
});

app.get('/media-hub/:clientId', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/media-hub.html'));
});

app.get('/mh/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/media-hub-share.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Greenpoint Command Center running at http://localhost:${PORT}`);
  });
}

module.exports = app;
