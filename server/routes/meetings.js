const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/:id/meetings', async (req, res) => {
  res.json(await query('SELECT * FROM client_meetings WHERE client_id = ? ORDER BY id', [Number(req.params.id)]));
});

router.post('/:id/meetings', async (req, res) => {
  const { title = 'Internal Brief', scheduled_date, meeting_type = 'online', notes } = req.body;
  const clientId = Number(req.params.id);
  const [{ id }] = await query(
    `INSERT INTO client_meetings (client_id, title, scheduled_date, meeting_type, notes) VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [clientId, title, scheduled_date || null, meeting_type, notes || null]
  );
  res.json({ id, client_id: clientId, title, scheduled_date, meeting_type, notes });
});

router.patch('/:id/meetings/:meetingId', async (req, res) => {
  const { scheduled_date, meeting_type, notes, title } = req.body;
  const fields = [];
  const vals = [];
  if (title !== undefined)          { fields.push('title = ?');          vals.push(title); }
  if (scheduled_date !== undefined) { fields.push('scheduled_date = ?'); vals.push(scheduled_date || null); }
  if (meeting_type !== undefined)   { fields.push('meeting_type = ?');   vals.push(meeting_type); }
  if (notes !== undefined)          { fields.push('notes = ?');          vals.push(notes || null); }
  if (!fields.length) return res.json({});
  await query(`UPDATE client_meetings SET ${fields.join(', ')} WHERE id = ? AND client_id = ?`, [...vals, Number(req.params.meetingId), Number(req.params.id)]);
  res.json({ ok: true });
});

module.exports = router;
