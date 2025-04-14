// controllers/sendToCustomerController.js
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
const logger = require('../utils/logger');

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// LINE Bot1
const client = new line.Client({
  channelAccessToken: process.env.BOT1_LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.BOT1_LINE_CHANNEL_SECRET
});

const sendMessageToCustomer = async (req, res) => {
  const { ref_code, message } = req.body;

  if (!ref_code || !message) {
    logger.warn('Missing ref_code or message in request');
    return res.status(400).json({ error: 'ref_code and message are required' });
  }

  try {
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('line_user_id')
      .eq('ref_code', ref_code)
      .maybeSingle();

    if (error || !data?.line_user_id) {
      logger.error(`ไม่พบ line_user_id จาก ref_code: ${ref_code}`);
      return res.status(404).json({ error: 'ไม่พบ line_user_id สำหรับรหัสนี้' });
    }

    const lineUserId = data.line_user_id;

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });

    logger.info(`📨 ส่งข้อความถึงลูกค้าสำเร็จ Ref: ${ref_code}`);
    res.status(200).json({ success: true });

  } catch (err) {
    logger.error(`❌ sendMessageToCustomer Error: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { sendMessageToCustomer };
