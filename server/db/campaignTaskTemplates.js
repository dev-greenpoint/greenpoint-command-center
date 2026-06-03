const CAMPAIGN_STAGES = {
  'PR': [
    'Campaign Prep',
    'Campaign Development',
    'Awaiting Approval',
    'Set up Public Address',
    'Pitch!',
    'Campaign Complete',
  ],
  'PR Light': [
    'Campaign Prep',
    'Campaign Development',
    'Awaiting Approval',
    'Set up Public Address',
    'Pitch!',
    'Campaign Complete',
  ],
  'Social Media': [
    'Schedule Prep',
    'Content Creation',
    'Content Scheduling & Boosting',
  ],
  'Content': [
    'Schedule Prep',
    'Content Creation',
    'Content Scheduling & Boosting',
  ],
  'Events & Partnerships': [
    'Event Deck & Budget',
    'Event Planning',
    'Event Day',
  ],
  'Awards': [
    'Submission',
  ],
  'Paid Media': [
    'Planning',
    'In Progress',
    'Review',
    'Wrap-up',
  ],
  'Design': [
    'Briefing',
    'Design',
    'Revisions',
    'Final Delivery',
  ],
  default: [
    'Planning',
    'In Progress',
    'Review',
    'Wrap-up',
  ],
};

const CAMPAIGN_TASK_TEMPLATES = {
  'PR': {
    0: [
      'Conduct Campaign Research',
      'Draft Press Release Questions for Client',
    ],
    1: [
      'Draft & Share Press Release',
      'Pitch Strategy',
      'Develop Pitch List',
    ],
    2: [
      'Client Feedback & Final Approval',
    ],
    3: [
      'Set up campaign in Public Address',
      'Confirm journalist contacts are generated',
      'Check all pitches are addressed correctly',
      'Add personalised pitch copy',
    ],
    4: [
      'Pitch media contacts',
      'Follow up journalists',
    ],
    5: [],
  },
  'PR Light': {
    0: [
      'Conduct Campaign Research',
      'Draft Press Release Questions for Client',
    ],
    1: [
      'Draft & Share Press Release',
      'Pitch Strategy',
      'Develop Pitch List',
    ],
    2: [
      'Client Feedback & Final Approval',
    ],
    3: [
      'Set up campaign in Public Address',
      'Confirm journalist contacts are generated',
      'Add personalised pitch copy',
    ],
    4: [
      'Pitch media contacts',
      'Follow up journalists',
    ],
    5: [],
  },
  'Social Media': {
    0: [
      'Seek client feedback on upcoming milestones and content inputs',
      'Collaborate on content ideas and fill schedule gaps',
      'Create content calendar',
      'Brief designers and copywriters',
    ],
    1: [
      'Create content assets',
      'Draft captions',
      'Internal approval (IA)',
      'Apply edits from IA stage',
      'Share schedule with client for approval',
    ],
    2: [
      'Schedule all approved content',
      'Set up organic boosting (if applicable)',
      'Assign Content Management',
    ],
  },
  'Content': {
    0: [
      'Seek client feedback on upcoming milestones and content inputs',
      'Collaborate on content ideas and fill schedule gaps',
      'Create content calendar',
      'Brief designers and copywriters',
    ],
    1: [
      'Create content assets',
      'Draft captions',
      'Internal approval (IA)',
      'Apply edits from IA stage',
      'Share schedule with client for approval',
    ],
    2: [
      'Schedule all approved content',
      'Set up organic boosting (if applicable)',
      'Assign Content Management',
    ],
  },
  'Events & Partnerships': {
    0: [
      'Build event concept deck',
      'Client Lead review and approval of deck',
      'Share deck with client for approval',
    ],
    1: [
      'Create budget spreadsheet',
      'Reach out to suppliers for quotes',
      'Follow up and negotiate supplier quotes',
      'Send final budget to Ash for handling fee',
      'Confirm quote signed by client',
      'Lock in suppliers',
      'Attend site inspection',
      'Create event run sheet',
      'Client Lead review of run sheet',
      'Share run sheet and supplier briefing with all suppliers',
      'Request invitation list from client',
      'Draft event invite copy',
      'Send invites',
      'Follow up RSVP list',
      'Send event reminder to confirmed guests',
    ],
    2: [
      'Prepare event-day checklist and pack',
      'Arrive on site before client',
      'Introduce team to client stakeholders',
      'Conduct staff briefing',
    ],
  },
  'Awards': {
    0: [
      'Draft blank submission doc in Google Drive',
      'Fill in submission doc',
      'Client Lead IA then send to client for review',
      'Submit award',
    ],
  },
};

module.exports = { CAMPAIGN_STAGES, CAMPAIGN_TASK_TEMPLATES };
