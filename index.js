// เพิ่มการนำเข้าแพ็คเกจที่จำเป็น
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
require('dotenv').config();
const checkMachineIDRoute = require("./routes/checkMachineID");
const pdpaTextRoute = require("./routes/pdpaText"); // ✅ เพิ่มบรรทัดนี้

// กำหนดค่า Express
const app = express();
app.use(express.json());

// ✅ ผูกเส้นทาง /pdpa-text
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
  console.log(`\n📤 Preparing to send LINE message to ${userId}`);
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.error("❌ LINE_CHANNEL_ACCESS_TOKEN is not set");
    return;
  }

  console.log(`Token exists: ${Boolean(token)}, Length: ${token.length}`);

  // ตรวจสอบเวลาที่ส่งข้อความล่าสุด
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTimestamp;
  
  // หากส่งข้อความเร็วเกินไป ให้หน่วงเวลา
  if (timeSinceLastMessage < MESSAGE_COOLDOWN) {
    const waitTime = MESSAGE_COOLDOWN - timeSinceLastMessage;
    console.log(`⏳ Rate limiting: Waiting ${waitTime}ms before sending next message`);
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

    // อัปเดตเวลาที่ส่งข้อความล่าสุด
    lastMessageTimestamp = Date.now();
    console.log(`✅ LINE message sent successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send LINE message: ${error.message}`);
    if (error.response) {
      console.error(`Error details: ${JSON.stringify(error.response.data)}`);
      
      // ตรวจสอบสถานะ Rate Limiting
      if (error.response.status === 429) {
        console.error("⚠️ Rate limit exceeded. Please try again later.");
      }
    }
    throw error;
  }
}

// อัปเดตสถานะการลงทะเบียนที่หมดอายุ
async function updateExpiredRegistrations() {
  console.log('🕒 Running task: Updating expired registrations');
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_registrations')
      .update({ status: 'BLOCK' })
      .match({ status: 'ACTIVE' })
      .lt('expires_at', now);

    if (error) {
      console.error('❌ Failed to update expired registrations:', error);
      return;
    }

    console.log(`✅ Updated status to BLOCK for ${data?.length || 0} expired registrations`);
  } catch (error) {
    console.error('❌ Error in task:', error);
  }
}

// ... โค้ดเดิมด้านล่างคงไว้ทั้งหมด ...
