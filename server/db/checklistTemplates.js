const GENERAL_CHECKLIST = [
  'Contract confirmed',
  'Kickoff meeting scheduled',
  'Brand assets received (logos, fonts, colours)',
  'Account lead assigned and introduced to client',
  'Reporting cadence agreed',
  'Slack channel created',
  'Google Drive folder set up',
];

const SERVICE_CHECKLIST = {
  'PR': [
    'Campaign angle and key messages confirmed',
    'Spokespeople confirmed',
    'Media monitoring set up',
    'PR strategy session booked',
  ],
  'PR Light': [
    'Campaign angle and key message confirmed',
    'Media target list agreed',
    'Media monitoring set up',
  ],
  'Social Media': [
    'Social media account access granted',
    'Content pillars and tone of voice confirmed',
    'Content calendar template created',
    'Scheduling tool access set up (Sked)',
  ],
  'Paid Media': [
    'Ad account access set up',
    'Campaign objectives and budget confirmed',
    'Tracking pixels installed',
    'Landing page or lead form confirmed',
  ],
  'Brand Activation - Events & Partnerships': [
    'Event brief received',
    'Key dates confirmed',
    'Budget approved',
    'Venue confirmed',
  ],
  'Awards': [
    'Award opportunities identified',
    'Submission deadlines noted',
    'Entry fee budget confirmed',
  ],
  'Design': [
    'Brand assets received and stored',
    'Design brief confirmed',
    'File format and dimension specs agreed',
  ],
};

const ONBOARDING_STAGES = [
  {
    index: 0,
    name: 'Initial Set Up',
    tasks: [
      { item: 'Create Slack channel', auto_type: 'slack' },
      { item: 'Create Google Drive folder', auto_type: 'drive' },
      { item: 'Pin account info in Slack', auto_type: null },
    ],
  },
  {
    index: 1,
    name: 'Assign Onboarding Tasks',
    tasks: [
      { item: 'Assign onboarding tasks to team', auto_type: null },
    ],
  },
  {
    index: 2,
    name: 'Send Onboarding Email',
    tasks: [
      { item: 'Send onboarding email to client', auto_type: 'email' },
    ],
  },
  {
    index: 3,
    name: 'Kick Off',
    tasks: [
      { item: 'Internal brief', auto_type: null },
      { item: 'Welcome email + book kick off with client', auto_type: null },
      { item: 'Client research', auto_type: 'research' },
      { item: 'Kick off workshop deck', auto_type: null },
      { item: 'Add kick off notes to Slack', auto_type: null },
    ],
  },
  {
    index: 4,
    name: 'Kick On Workshop',
    tasks: [
      { item: 'Internal creative session (Kick On)', auto_type: null },
      { item: 'Attend workshop with client', auto_type: null },
      { item: 'Add workshop notes to Drive', auto_type: null },
    ],
  },
  {
    index: 5,
    name: 'Content Setup',
    service_filter: 'Social Media',
    tasks: [
      { item: 'Collect social login access from client', auto_type: null },
      { item: 'Set up Sked account', auto_type: null },
      { item: 'Add passwords and login info', auto_type: null },
      { item: 'Social media briefing hub — add client and brief', auto_type: null },
    ],
  },
  {
    index: 6,
    name: 'Final Set Up',
    tasks: [
      { item: 'Populate and assign tasks on client board', auto_type: null },
      { item: 'Schedule ongoing monthly WIPs and presentations', auto_type: null },
      { item: 'Finalise Newsroom Tracker and Project Matrix', auto_type: null, service_filter: 'PR' },
      { item: 'Set up iSentia and Talkwalker', auto_type: null, service_filter: 'PR' },
    ],
  },
];

const TASK_TEMPLATES = [
  { section: 'Management & Admin',    title: 'XXX - Newsroom',                                  task_type: 'Newsroom' },
  { section: 'Management & Admin',    title: 'XXX - External WIP',                              task_type: 'Project Management & Admin' },
  { section: 'Management & Admin',    title: 'XXX - Weekly Priorities',                         task_type: 'Project Management & Admin' },
  { section: 'Strategy',              title: 'XXX Strategy | Development',                      task_type: 'Strategy' },
  { section: 'Press Campaigns',       title: 'XXX Press | Campaign Name',                       task_type: 'PR' },
  { section: 'Content',               title: 'XXX - Community Management',                      task_type: 'Social Media' },
  { section: 'Content',               title: 'XXX | Month Content Schedule',                    task_type: 'Social Media' },
  { section: 'Talent & Partnerships', title: 'XXX Talent & Partnerships | Project/Campaign',    task_type: 'Influencer' },
  { section: 'Events',                title: 'XXX | Event Name',                                task_type: 'Brand Activation - Events & Partnerships' },
  { section: 'Copywriting',           title: 'XXX Copywriting | Project Name',                  task_type: 'eDM/Blogs' },
  { section: 'Awards',                title: 'XXX | Award Name',                                task_type: 'Awards' },
  { section: 'Design',                title: 'XXX Design | Project Name',                       task_type: 'Design' },
  { section: 'Reporting',             title: 'XXX | PR Report',                                 task_type: 'Reporting' },
  { section: 'Reporting',             title: 'XXX | Content Report',                            task_type: 'Reporting' },
];

module.exports = { GENERAL_CHECKLIST, SERVICE_CHECKLIST, ONBOARDING_STAGES, TASK_TEMPLATES };
