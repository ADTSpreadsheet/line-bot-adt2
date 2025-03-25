// เพิ่มการนำเข้าแพ็คเกจที่จำเป็น
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// กำหนดค่า Express
const app = express();
app.use(express.json());

// กำหนดค่า Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Webhook รับจาก Excel VBA
app.post('/webhook2', async (req, res) => {
  if (!req.body.ref_code && !req.body.machine_id && req.body.destination && Array.isArray(req.body.events)) {
    console.log("🟡 Received test webhook from LINE Developer. Sending 200 OK.");
    return res.status(200).send("OK");
  }
  try {
    console.log("📥 Received data from Excel VBA:", JSON.stringify(req.body, null, 2));
    const { ref_code, first_name, last_name, house_number, district, province, phone_number, email, national_id, ip_address, machine_id } = req.body;

    if (!ref_code) {
      console.log("❌ Missing required field: ref_code");
      return res.status(400).json({ success: false, message: "Reference Code is required" });
    }

    const now = new Date();
    const expiresDate = new Date(now);
    expiresDate.setDate(now.getDate() + 7);

    const registrationData = {
      ref_code,
      machine_id: machine_id || null,
      first_name: first_name || null,
      last_name: last_name || null,
      house_number: house_number || null,
      district: district || null,
      province: province || null,
      phone_number: phone_number || null,
      email: email || null,
      national_id: national_id || null,
      ip_address: ip_address || null,
      day_created_at: now.toISOString(),
      verify_at: now.toISOString(),
      expires_at: expiresDate.toISOString(),
      status: 'ACTIVE'
    };

    const { data, error } = await supabase.from('user_registrations').insert([registrationData]).select();
    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(422).json({ success: false, message: "Unprocessable Entity", error: error.message });
    }

    console.log("✅ Registration saved in Supabase:", data);

    const formattedDate = now.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formattedTime = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const message = `ลงทะเบียนสำเร็จ: ${ref_code} (${formattedDate} ${formattedTime})`;
    
    // ดึงค่า LINE User ID จาก Environment หรือใช้ค่า default
    // ตรวจสอบและใช้ตัวแปรที่ถูกกำหนดไว้ในไฟล์ .env ก่อน
    const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';

    try {
      await sendMessageToLineBot2(message, lineUserIdToNotify);
    } catch (lineError) {
      console.error("⚠️ Could not send LINE notification:", lineError.message);
      if (lineError.response) {
        console.error("Error details:", {
          status: lineError.response.status,
          statusText: lineError.response.statusText,
          data: lineError.response.data
        });
      }
    }

    res.status(200).json({ success: true, message: "Registration successful", expires_at: expiresDate.toISOString() });
  } catch (error) {
    console.error("❌ Unexpected error in /webhook2:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// ตรวจสอบ env
app.get('/check-env', (req, res) => {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  res.json({
    lineTokenExists: Boolean(lineToken),
    lineTokenLength: lineToken ? lineToken.length : 0,
    adminLineUserId: process.env.ADMIN_LINE_USER_ID || 'Not set (using default)'
  });
});

// ตรวจสอบโควตาการส่งข้อความ
app.get('/check-quota', async (req, res) => {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ success: false, message: "LINE_CHANNEL_ACCESS_TOKEN is not set" });
    }
    
    const response = await axios.get('https://api.line.me/v2/bot/message/quota', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    res.json({
      success: true,
      quota: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

// ตรวจสอบข้อมูล Channel
app.get('/channel-status', async (req, res) => {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ success: false, message: "LINE_CHANNEL_ACCESS_TOKEN is not set" });
    }
    
    // ตรวจสอบข้อมูล Bot
    const botInfoResponse = await axios.get('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    res.json({
      success: true,
      botInfo: botInfoResponse.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

// ทดสอบส่งข้อความด้วยข้อความสั้นๆ 
app.get('/test-minimal-message', async (req, res) => {
  try {
    const userId = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    await sendMessageToLineBot2("Test", userId);
    res.send("✅ Minimal message sent successfully");
  } catch (error) {
    console.error("❌ Error sending minimal message:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// ทดสอบส่งข้อความผ่านฟังก์ชันหลัก
app.get('/test-line-message', async (req, res) => {
  try {
    const message = 'ทดสอบส่งข้อความ';
    const userId = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    await sendMessageToLineBot2(message, userId);
    res.send("✅ Message sent successfully");
  } catch (error) {
    console.error("❌ Error sending test message:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// ทดสอบส่งแบบไม่ผ่านฟังก์ชันกลาง
app.get('/test-direct-line-message', async (req, res) => {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    const testMessage = 'ทดสอบส่งตรง';

    const result = await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages: [
        { type: 'text', text: testMessage }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({ success: true, result: result.data });
  } catch (error) {
    console.error("❌ Direct send error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

// Endpoint สำหรับตรวจสอบผู้ใช้
app.get('/verify-user/:userId', async (req, res) => {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ success: false, message: "LINE_CHANNEL_ACCESS_TOKEN is not set" });
    }
    
    const userId = req.params.userId;
    
    try {
      // พยายามดึงข้อมูลโปรไฟล์ของผู้ใช้
      const profileResponse = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      res.json({
        success: true,
        valid: true,
        profile: profileResponse.data
      });
    } catch (profileError) {
      // หากไม่สามารถดึงข้อมูลได้ อาจเป็นเพราะผู้ใช้ไม่มีอยู่หรือไม่ได้เพิ่ม bot เป็นเพื่อน
      res.json({
        success: true,
        valid: false,
        message: "User ID is invalid or user has not added the bot as a friend",
        details: profileError.response?.data || null
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  updateExpiredRegistrations();
});
