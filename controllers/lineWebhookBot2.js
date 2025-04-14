// controllers/lineWebhookBot2.js
const axios = require('axios');
const handleBot2Event = async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const msg = event.message.text;

      // ✅ แยก Ref.Code จากข้อความ เช่น "@ML76 ขอบคุณครับ"
      const refCodeMatch = msg.match(/^@(\w+)/);
      if (!refCodeMatch) continue;

      const ref_code = refCodeMatch[1];
      const message = msg.replace(refCodeMatch[0], '').trim();

      // ✅ ยิง POST ไป API1 ที่ /reply-from-admin
      await axios.post('https://line-bot-adt.onrender.com/reply-from-admin', {
        ref_code,
        message
      });
    }
  }

  res.status(200).send('OK');
};

module.exports = { handleBot2Event };
