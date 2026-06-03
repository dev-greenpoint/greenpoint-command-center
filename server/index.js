require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db/database');
const { initSchema } = require('./db/schema');
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

app.get('/api/health', async (req, res) => {
  await getDb();
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

const PAGES = ['clients', 'campaigns', 'social', 'approvals', 'reports', 'team-admin'];
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

initSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Greenpoint Command Center running at http://localhost:${PORT}`);
  });
});
