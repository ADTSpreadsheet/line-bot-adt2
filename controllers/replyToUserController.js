// controllers/replyToUserController.js
const { supabase } = require('../utils/supabaseClient');
const line = require('@line/bot-sdk');
const logger = require('../utils/logger').createModuleLogger('ReplyToUser');

// ใช้ Token ของ BOT1
const client = new line.Client({
  channelAccessToken: process.env.BOT1_LINE_CHANNEL_ACCESS_TOKEN
});

exports.replyToUser = async (req, res) => {
  const { ref_code, message } = req.body;

  logger.info(`\u{1F4E2} [REPLY] รับคำสั่งตอบกลับ → Ref.Code: ${ref_code}`);

  if (!ref_code || !message) {
    logger.warn(`[REPLY] ข้อมูลไม่ครบ: ${JSON.stringify(req.body)}`);
    return res.status(400).json({ message: 'กรุณาระบุ ref_code และ message' });
  }

  try {
    // ดึง line_user_id จาก Supabase
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('line_user_id')
      .eq('ref_code', ref_code)
      .single();

    if (error || !data) {
      logger.error(`[REPLY] ไม่พบ line_user_id สำหรับ Ref.Code: ${ref_code}`);
      return res.status(404).json({ message: 'ไม่พบผู้ใช้จาก Ref.Code นี้' });
    }

    const lineUserId = data.line_user_id;

    // ส่งข้อความกลับไปหาลูกค้า
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });

    logger.info(`\u{2709}\u{FE0F} ส่งข้อความกลับไปยังผู้ใช้เรียบร้อย → line_user_id: ${lineUserId}`);
    return res.status(200).json({ message: 'ส่งข้อความสำเร็จ' });
  } catch (err) {
    logger.error(`[REPLY] ERROR: ${err.message}`);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
};
