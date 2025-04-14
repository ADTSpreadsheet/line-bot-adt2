const axios = require('axios');
const logger = require('../utils/logger');

// 🔧 API1 Endpoint สำหรับรับข้อความตอบกลับจาก Admin
const API1_REPLY_ENDPOINT = process.env.API1_REPLY_ENDPOINT || 'https://line-bot-adt.onrender.com/router/reply-from-admin';

exports.replyToUser = async (req, res) => {
  const { ref_code, message } = req.body;

  if (!ref_code || !message) {
    logger.warn('[ADMIN ➜ USER] ❌ Missing ref_code or message');
    return res.status(400).json({ error: 'กรุณาระบุ ref_code และข้อความให้ครบถ้วน' });
  }

  try {
    logger.info(`[ADMIN ➜ USER] 🔁 ส่งข้อความไปยัง API1 → ref_code: ${ref_code}`);

    const response = await axios.post(API1_REPLY_ENDPOINT, {
      ref_code,
      message
    });

    if (response.status === 200) {
      logger.info(`[ADMIN ➜ USER] ✅ ส่งข้อความสำเร็จถึง API1`);
      return res.status(200).json({ success: true, message: 'ส่งข้อความสำเร็จแล้วครับ' });
    } else {
      logger.warn(`[ADMIN ➜ USER] ⚠️ ส่งไม่สำเร็จ → Status: ${response.status}`);
      return res.status(500).json({ error: 'API1 ตอบกลับไม่สำเร็จ' });
    }
  } catch (error) {
    logger.error(`[ADMIN ➜ USER] ❌ ส่งข้อความล้มเหลว: ${error.message}`);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดระหว่างส่งข้อมูล' });
  }
};
