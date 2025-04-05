const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

router.post('/check-machine-status', async (req, res) => {
  try {
    const { machine_id } = req.body;

    if (!machine_id) {
      return res.status(400).send('Missing machine_id');
    }

    const { data, error } = await supabase
      .from('registered_machines')
      .select('status')
      .eq('machine_id', machine_id)
      .maybeSingle();

    if (error) {
      logger.error(`❌ Supabase error: ${error.message}`);
      return res.status(500).send('Database error');
    }

    if (data && data.status === 'BLOCKED') {
      logger.warn(`🛑 BLOCKED machine: ${machine_id}`);
      return res.status(200).send('BLOCKED');
    }

    // ถ้าไม่ BLOCKED หรือไม่พบข้อมูลเลย → ให้ตอบกลับด้วย status 403
    logger.info(`🔓 Machine "${machine_id}" is not blocked or not found`);
    return res.status(403).send('Not blocked or not found');

  } catch (err) {
    logger.error(`🔥 API Crash: ${err.message}`);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
