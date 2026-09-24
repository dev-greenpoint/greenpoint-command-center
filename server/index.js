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
const notificationsRouter = require('./routes/notifications');
const deckAiRouter = require('./routes/deck-ai');

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

// ── AI image generation (Cloudinary Image Generation add-on) ──────────────────
// Defaults to flux/standard (~1 credit/image) — Cloudinary's own default is a
// premium tier that costs ~9x that for comparable quality, so always pass a
// model explicitly. Returns the same { url } shape as /api/upload so the
// client can treat "uploaded" and "generated" images interchangeably.
// Images are filed as "Command Center/<Client>/<Deck>" with a readable name
// built from the prompt + date.
const cloudinaryFolderPart = (s, fallback) =>
  (s || '').replace(/[\/\\?&#%<>*:|"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || fallback;
const cloudinarySlug = (s) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-') || 'image';

app.post('/api/generate-image', async (req, res) => {
  const { prompt, aspect_ratio, client_name, deck_title } = req.body;
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'prompt required' });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary image generation is not configured' });
  }

  try {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
    const name = `${cloudinarySlug(prompt)}-${date}-${Math.random().toString(36).slice(2, 6)}`;
    const folder = ['Command Center', cloudinaryFolderPart(client_name, 'No Client'), cloudinaryFolderPart(deck_title, 'Untitled Deck')].join('/');

    const body = {
      prompt: prompt.trim(),
      model: { family: 'flux', tier: 'standard' },
      target: { target_type: 'managed_asset', public_id: name },
    };
    if (aspect_ratio) body.image_size = { aspect_ratio };

    const cloudRes = await fetch(`https://api.cloudinary.com/v2/generate/${cloudName}/text_to_image`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await cloudRes.json();
    if (!cloudRes.ok) {
      return res.status(502).json({ error: data?.error?.message || 'Image generation failed' });
    }

    const url = data?.data?.assets?.[0]?.storage?.secure_url;
    if (!url) return res.status(502).json({ error: 'No image returned' });

    // The generate API has no folder option, so file it with a follow-up Admin
    // API update (free). Non-fatal — the image is usable even if this fails.
    const publicId = data?.data?.assets?.[0]?.storage?.public_id || data?.data?.assets?.[0]?.public_id || name;
    try {
      const moveRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_folder: folder, display_name: name, tags: 'command-center,ai-generated' }),
      });
      if (!moveRes.ok) console.error('Cloudinary folder move failed:', await moveRes.text());
    } catch (err) {
      console.error('Cloudinary folder move failed:', err.message);
    }

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
app.use('/api/notifications', notificationsRouter);
app.use('/api/deck-ai', deckAiRouter);

const PAGES = ['clients', 'campaigns', 'social', 'approvals', 'reports', 'team-admin', 'strategies', 'deck-creator', 'deck-creator-2', 'settings', 'timesheets'];
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

// Layout decks (Deck Creator 2.0, strategies.layout set) are edited and viewed
// in deck-layout.html; classic decks use the builder / view pages.
app.get('/strategy/:id', async (req, res) => {
  const [row] = /^\d+$/.test(req.params.id) ? await query('SELECT layout FROM strategies WHERE id=?', [req.params.id]) : [];
  res.sendFile(path.join(__dirname, `../client/pages/${row?.layout ? 'deck-layout' : 'strategy-builder'}.html`));
});

// Locked decks serve the snapshot frozen at lock time (see routes/strategies.js)
app.get('/s/:token', async (req, res) => {
  const [row] = await query('SELECT layout, snapshot_html FROM strategies WHERE share_token=?', [req.params.token]);
  if (row?.snapshot_html) return res.type('html').send(row.snapshot_html);
  res.sendFile(path.join(__dirname, `../client/pages/${row?.layout ? 'deck-layout' : 'strategy-view'}.html`));
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
