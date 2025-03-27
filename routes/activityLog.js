// 📦 ไฟล์: routes/activityLog.js
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

// 📌 POST /activity-log
router.post('/', async (req, res) => {
  try {
    const {
      ref_code,
      machine_id,
      line_user_id,
      event_type,
      message,
      timestamp,
      ip_address,
      origin,
      note
    } = req.body;

    // ✅ ตรวจสอบข้อมูลขั้นต่ำ
    if (!ref_code || !event_type || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase.from('activity_logs').insert([
      {
        ref_code,
        machine_id,
        line_user_id,
        event_type,
        message,
        timestamp,
        ip_address,
        origin,
        note
      }
    ]);

    if (error) throw error;

    return res.status(200).json({ status: 'OK', message: 'Activity logged' });
  } catch (err) {
    console.error('Error logging activity:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
