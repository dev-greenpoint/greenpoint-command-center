const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

router.get('/:id/meetings', async (req, res) => {
  const db = await getDb();
  const rows = db.exec(`SELECT * FROM client_meetings WHERE client_id = ? ORDER BY id`, [Number(req.params.id)]);
  res.json(rows[0] ? rows[0].values.map(r => ({
    id: r[0], client_id: r[1], title: r[2], scheduled_date: r[3], meeting_type: r[4], notes: r[5], created_at: r[6]
  })) : []);
});

router.post('/:id/meetings', async (req, res) => {
  const db = await getDb();
  const { title = 'Internal Brief', scheduled_date, meeting_type = 'online', notes } = req.body;
  const clientId = Number(req.params.id);
  db.run(
    `INSERT INTO client_meetings (client_id, title, scheduled_date, meeting_type, notes) VALUES (?, ?, ?, ?, ?)`,
    [clientId, title, scheduled_date || null, meeting_type, notes || null]
  );
  saveDb();
  const rows = db.exec(`SELECT last_insert_rowid() as id`);
  const id = rows[0]?.values[0][0];
  res.json({ id, client_id: clientId, title, scheduled_date, meeting_type, notes });
});

router.patch('/:id/meetings/:meetingId', async (req, res) => {
  const db = await getDb();
  const { scheduled_date, meeting_type, notes, title } = req.body;
  const fields = [];
  const vals = [];
  if (title !== undefined)          { fields.push('title = ?');          vals.push(title); }
  if (scheduled_date !== undefined) { fields.push('scheduled_date = ?'); vals.push(scheduled_date || null); }
  if (meeting_type !== undefined)   { fields.push('meeting_type = ?');   vals.push(meeting_type); }
  if (notes !== undefined)          { fields.push('notes = ?');          vals.push(notes || null); }
  if (!fields.length) return res.json({});
  db.run(`UPDATE client_meetings SET ${fields.join(', ')} WHERE id = ? AND client_id = ?`, [...vals, Number(req.params.meetingId), Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

module.exports = router;
