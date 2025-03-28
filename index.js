// เพิ่มการนำเข้าแพ็คเกจที่จำเป็น
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
require('dotenv').config();
const checkMachineIDRoute = require("./routes/checkMachineID");
const pdpaTextRoute = require("./routes/pdpaText");

// กำหนดค่า Express
const app = express();
app.use(express.json());

// ผูกเส้นทาง /pdpa-text
app.use('/pdpa-text', pdpaTextRoute);

// กำหนดค่า Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// กำหนดค่าคอนฟิก LINE Bot
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// สร้าง LINE client
const lineClient = new line.Client(lineConfig);

// เพิ่มฟังก์ชันสำหรับหน่วงเวลา
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ตรวจสอบว่ามีการส่งข้อความไปแล้วในช่วงเวลาที่กำหนดหรือไม่
let lastMessageTimestamp = 0;
const MESSAGE_COOLDOWN = 1000; // 1 วินาที

// ฟังก์ชันสำหรับส่งข้อความไปยัง LINE
async function sendMessageToLineBot2(message, userId) {
  console.log(`Preparing to send LINE message to ${userId}`);
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return;
  }

  console.log(`Token exists: ${Boolean(token)}, Length: ${token.length}`);

  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTimestamp;
  if (timeSinceLastMessage < MESSAGE_COOLDOWN) {
    const waitTime = MESSAGE_COOLDOWN - timeSinceLastMessage;
    console.log(`Rate limiting: Waiting ${waitTime}ms before sending next message`);
    await delay(waitTime);
  }

  try {
    const cleanMessage = message.toString().trim();
    console.log(`Sending cleaned message: ${cleanMessage}`);

    const response = await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages: [
        {
          type: 'text',
          text: cleanMessage
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    lastMessageTimestamp = Date.now();
    console.log(`LINE message sent successfully`);
    return response.data;
  } catch (error) {
    console.error(`Failed to send LINE message: ${error.message}`);
    if (error.response) {
      console.error(`Error details: ${JSON.stringify(error.response.data)}`);
      if (error.response.status === 429) {
        console.error("Rate limit exceeded. Please try again later.");
      }
    }
    throw error;
  }
}

// อัปเดตสถานะการลงทะเบียนที่หมดอายุ
async function updateExpiredRegistrations() {
  console.log('Running task: Updating expired registrations');
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_registrations')
      .update({ status: 'BLOCK' })
      .match({ status: 'ACTIVE' })
      .lt('expires_at', now);

    if (error) {
      console.error('Failed to update expired registrations:', error);
      return;
    }

    console.log(`Updated status to BLOCK for ${data?.length || 0} expired registrations`);
  } catch (error) {
    console.error('Error in task:', error);
  }
}

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  updateExpiredRegistrations();
});



// ... โค้ดเดิมด้านล่างคงไว้ทั้งหมด ...


// Webhook รับจาก Excel VBA
app.post('/webhook2', async (req, res) => {
  if (!req.body.ref_code && !req.body.machine_id && req.body.destination && Array.isArray(req.body.events)) {
    const events = req.body.events;

    if (events.length > 0 && events[0].source?.userId) {
      console.log("LINE Webhook Event (test หรือจริง):");
      console.log("LINE USER ID:", events[0].source.userId);
      console.log("Timestamp:", new Date().toISOString());
    } else {
      console.log("Received test webhook from LINE Developer. No userId found.");
    }

    return res.status(200).send("OK");
  }

  try {
    console.log("Received data from Excel VBA:", JSON.stringify(req.body, null, 2));
    const {
      ref_code,
      first_name,
      last_name,
      house_number,
      district,
      province,
      phone_number,
      email,
      national_id,
      ip_address,
      machine_id
    } = req.body;

    if (!ref_code) {
      console.log("Missing required field: ref_code");
      return res.status(400).json({ success: false, message: "Reference Code is required" });
    }

    const now = new Date();
    const expiresDate = new Date(now);
    expiresDate.setDate(now.getDate() + 7);

    console.log("Preparing registrationData...");

    console.log("Skipping insert to Supabase (now handled by API1)");
  return res.status(200).json({
    success: true,
    message: "Received and skipped insert (API2 no longer inserts)",
    ref_code: ref_code
  });
});
  
