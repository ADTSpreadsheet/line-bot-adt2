// controllers/lineWebhookBot2.js
const axios = require('axios');

// สร้าง logger แบบง่ายใช้งานในไฟล์นี้
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

const handleWebhookFromBot2 = async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const msg = event.message.text;
      const userId = event.source.userId;
      // ✅ แยก Ref.Code จากข้อความ เช่น "@ML76 สวัสดีครับ"
      const refCodeMatch = msg.match(/^@(\w+)/);
      if (!refCodeMatch) {
        logger.warn(`ไม่ได้ใส่ Ref.Code ที่ขึ้นต้นด้วย @ มาในข้อความ: ${msg}`);
        continue;
      }
      const ref_code = refCodeMatch[1];
      const message = msg.replace(refCodeMatch[0], '').trim();
      if (!message) {
        logger.warn(`Ref.Code: ${ref_code} ไม่มีข้อความตอบกลับ`);
        continue;
      }
      try {
        // ✅ ส่งไป API1
        const response = await axios.post('https://line-bot-adt.onrender.com/reply-from-admin', {
          ref_code,
          message
        });
        logger.info(`📤 ส่งข้อความถึง Ref: ${ref_code} เรียบร้อยแล้ว`);
      } catch (err) {
        logger.error(`❌ Error ส่งข้อความไป API1: ${err.message}`);
      }
    }
  }
  res.status(200).send('OK');
};

module.exports = { handleWebhookFromBot2 };
