// 📁 index.js (API2 ใหม่ล่าสุด)
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
const machineRoutes = require('./routes/machineRoutes');
const checkBlockedMachineRoute = require('./routes/checkBlockedMachineRoute');
const replyToUserRoutes = require('./routes/replyToUserRoutes');

const productRoutes = require('./routes/productRoutes')
const webhook3Routes = require("./routes/webhook3");
const slipRoutes = require("./routes/slipRoutes");
const adminRoutes = require('./routes/adminRoutes');
const eventLineRoutes = require('./routes/eventLine');






const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/router', machineRoutes);
app.use('/router', checkBlockedMachineRoute);

app.use(replyToUserRoutes);
app.use('/', webhook2Routes);
app.use('/', productRoutes)
app.use("/webhook3", webhook3Routes);
app.use("/slip", slipRoutes);
app.use('/', adminRoutes);




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


// ✅ เริ่มทำงานเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot2 running on port ${PORT}`);
  updateExpiredSessions(); // อัปเดตสถานะเมื่อเปิดเซิร์ฟเวอร์
});
