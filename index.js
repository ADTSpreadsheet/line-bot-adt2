// 📁 index.js (API2 ใหม่ล่าสุด)
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
const machineRoutes = require('./routes/machineRoutes');
const checkBlockedMachineRoute = require('./routes/checkBlockedMachineRoute');
const replyToUserRoutes = require('./routes/replyToUserRoutes');
const webhook2Routes = require('./routes/webhook2');
const productRoutes = require('./routes/productRoutes')

const app = express();
app.use(express.json());
app.use('/router', machineRoutes);
app.use('/router', checkBlockedMachineRoute);
app.use(replyToUserRoutes);
app.use('/', webhook2Routes);
app.use('/', productRoutes)

// ✅ กำหนดค่าการเชื่อมต่อ Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ✅ กำหนดค่าคอนฟิก LINE Bot
const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// ✅ ฟังก์ชันอัปเดตสถานะผู้หมดอายุ
async function updateExpiredSessions() {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('auth_sessions')
      .update({ status: 'BLOCK' })
      .match({ status: 'ACTIVE' })
      .lt('expires_at', now);

    if (error) {
      console.error('[❌] Failed to update expired sessions:', error);
    } else {
      console.log(`[✅] Updated ${data?.length || 0} expired sessions to BLOCK.`);
    }
  } catch (err) {
    console.error('[❌] updateExpiredSessions error:', err);
  }
}

// ✅ Webhook จาก LINE (ไว้ debug และรอรับ event อื่น)
app.post('/webhook2', async (req, res) => {
  const body = req.body;

  if (body.destination && Array.isArray(body.events)) {
    const event = body.events[0];
    if (event && event.source?.userId) {
      console.log(`[📥] LINE Event Received at ${new Date().toISOString()}`);
      console.log('LINE USER ID:', event.source.userId);
    }
  }

  return res.status(200).send('OK');
});

// ✅ เริ่มทำงานเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot2 running on port ${PORT}`);
  updateExpiredSessions(); // อัปเดตสถานะเมื่อเปิดเซิร์ฟเวอร์
});
