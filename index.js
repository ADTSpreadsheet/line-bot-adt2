// index.js
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 10000;

// Line configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(bodyParser.json());

// LINE webhook middleware for signature verification
const lineMiddleware = line.middleware(lineConfig);

// LINE webhook route
app.post('/webhook', lineMiddleware, (req, res) => {
  // ตอบกลับสถานะ 200 ทันที
  console.log("📲 LINE Webhook triggered");
  res.status(200).end();
  
  // ประมวลผลข้อมูลที่ได้รับ (ไม่จำเป็นต้องทำทันที)
  try {
    const events = req.body.events;
    console.log(`📥 Received ${events ? events.length : 0} events from LINE Platform`);
    
    if (events && events.length > 0) {
      // ประมวลผลเหตุการณ์ที่ได้รับ
      events.forEach(async (event) => {
        console.log(`🔍 Processing event type: ${event.type}`);
        
        // ตัวอย่างการจัดการกับข้อความ
        if (event.type === 'message' && event.message.type === 'text') {
          const userId = event.source.userId;
          const text = event.message.text;
          
          console.log(`📝 Received message: "${text}" from user: ${userId}`);
          
          // ตอบกลับข้อความ (ถ้าต้องการ)
          try {
            const client = new line.Client(lineConfig);
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `ได้รับข้อความ: ${text}`
            });
            console.log(`✅ Replied to message from user: ${userId}`);
          } catch (replyError) {
            console.error('❌ Error replying to message:', replyError.message);
          }
        } else if (event.type === 'follow') {
          // จัดการเมื่อมีผู้ใช้เพิ่มบอทเป็นเพื่อน
          const userId = event.source.userId;
          console.log(`🎉 User ${userId} added the bot as a friend`);
          
          try {
            const client = new line.Client(lineConfig);
            await client.pushMessage(userId, {
              type: 'text',
              text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน! ยินดีต้อนรับสู่บริการของเรา'
            });
            console.log(`✅ Sent welcome message to user: ${userId}`);
          } catch (pushError) {
            console.error('❌ Error sending welcome message:', pushError.message);
          }
        } else if (event.type === 'unfollow') {
          // จัดการเมื่อมีผู้ใช้บล็อคบอท
          const userId = event.source.userId;
          console.log(`👋 User ${userId} blocked the bot`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error handling webhook:', error.message);
  }
});

app.post('/webhook2', async (req, res) => {
  // 🛡️ LINE Developer อาจยิง payload test ที่ไม่มี ref_code กับ machine_id
  if (!req.body.ref_code && !req.body.machine_id && req.body.destination && Array.isArray(req.body.events)) {
    console.log("🟡 Received test webhook from LINE Developer. Sending 200 OK.");
    return res.status(200).send("OK");
  }

  try {
    console.log("📥 Received data from Excel VBA:", JSON.stringify(req.body, null, 2));

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

    // 🔐 เงื่อนไขเดิม ใช้กับกรณี Excel VBA เท่านั้น
    if (!ref_code) {
      console.log("❌ Missing required field: ref_code");
      return res.status(400).json({ 
        success: false, 
        message: "Reference Code is required" 
      });
    }

    ...

    
    const now = new Date();
    const expiresDate = new Date(now);
    expiresDate.setDate(now.getDate() + 7);
    console.log(`📅 Setting expiration date to: ${expiresDate.toISOString()}`);
    
    // Prepare registration data
    const registrationData = {
      ref_code,
      // line_user_id ถูกลบออก
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
    
    console.log("📝 Prepared registration data for Supabase insertion");
    
    // Insert registration
    const { data, error } = await supabase
      .from('user_registrations')
      .insert([registrationData])
      .select();
    
    // Handle insertion errors
    if (error) {
      console.error("❌ Supabase insert error:", error);
      
      // Specific error handling
      if (error.code === '23505') {
        return res.status(409).json({ 
          success: false, 
          message: "Registration already exists",
          error: error.message 
        });
      }
      
      if (error.code === '23503') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid reference data",
          error: error.message 
        });
      }
      
      // Generic error
      return res.status(422).json({ 
        success: false, 
        message: "Unprocessable Entity",
        error: error.message 
      });
    }
    
    // ✅ บันทึกสำเร็จใน Supabase
    console.log("✅ Registration saved in Supabase:", data);

    // 📅 ดึงวันเวลาปัจจุบันในรูปแบบไทย
    const dateObj = new Date();
    const formattedDate = dateObj.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const formattedTime = dateObj.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit"
    });

    // ✅ ข้อความแจ้งเตือน LINE (เรียบง่าย ดูดี)
    const message = `✅ ผู้ลงทะเบียนสำเร็จรายใหม่\n` +
                    `Ref. Code: ${ref_code}\n` +
                    `🕒 เวลา: ${formattedDate} ${formattedTime} น.`;

    // Define LINE user ID to notify
    const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    console.log(`📱 Preparing to notify admin (${lineUserIdToNotify})`);

    // Send notification (non-blocking)
    try {
      await sendMessageToLineBot2(message, lineUserIdToNotify);
    } catch (lineError) {
      console.error("⚠️ Could not send LINE notification:", lineError.message);
    }

    // Return success response
    console.log("✅ Returning success response to client");
    res.status(200).json({ 
      success: true, 
      message: "Registration successful",
      expires_at: expiresDate.toISOString()
    });

  } catch (error) {
    console.error("❌ Unexpected error in /webhook2:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// Verify Status Route
app.post('/verify-status', async (req, res) => {
  try {
    console.log("🔍 Verifying registration status:", JSON.stringify(req.body, null, 2));
    
    const { ref_code, machine_id } = req.body;
    
    // ตรวจสอบว่ามีค่าที่จำเป็นหรือไม่
    if (!ref_code || !machine_id) {
      console.log("❌ Missing required fields for verification");
      return res.status(400).json({ 
        success: false, 
        message: "Reference Code and Machine ID are required" 
      });
    }
    
    // ค้นหาข้อมูลการลงทะเบียน
    const { data, error } = await supabase
      .from('user_registrations')
      .select('*')
      .eq('ref_code', ref_code)
      .eq('machine_id', machine_id)
      .single();
    
    if (error) {
      console.error("❌ Supabase query error:", error);
      return res.status(422).json({ 
        success: false, 
        message: "Error verifying registration",
        error: error.message 
      });
    }
    
    // ไม่พบข้อมูลการลงทะเบียน
    if (!data) {
      console.log(`❌ No registration found for ref_code: ${ref_code} and machine_id: ${machine_id}`);
      return res.status(404).json({ 
        success: false, 
        message: "Registration not found" 
      });
    }
    
    console.log(`✅ Found registration: ${JSON.stringify(data)}`);
    
    // ตรวจสอบสถานะปัจจุบัน
    if (data.status === 'BLOCKED') {
      console.log(`🚫 Registration is blocked: ${ref_code}`);
      return res.status(403).json({ 
        success: false, 
        message: "Registration is blocked",
        status: "BLOCKED" 
      });
    }
    
    // ตรวจสอบว่าหมดอายุหรือยัง
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      // หมดอายุแล้ว ปรับสถานะเป็น EXPIRED
      console.log(`⏱️ Registration has expired: ${ref_code}`);
      
      await supabase
        .from('user_registrations')
        .update({ status: 'EXPIRED' })
        .eq('ref_code', ref_code);
      
      return res.status(403).json({ 
        success: false, 
        message: "Registration has expired",
        status: "EXPIRED" 
      });
    }
    
    // ยังไม่หมดอายุและสถานะเป็น ACTIVE
    console.log(`✅ Registration is active: ${ref_code}, expires on: ${expiresAt}`);
    res.status(200).json({ 
      success: true, 
      message: "Registration is active",
      status: "ACTIVE",
      expires_at: data.expires_at
    });
    
  } catch (error) {
    console.error("❌ Unexpected error in /verify-status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// Check Expired Registrations
async function checkExpiredRegistrations() {
  try {
    console.log("🔍 Checking for expired registrations...");
    
    // ค้นหาการลงทะเบียนที่หมดอายุแล้ว
    const { data, error } = await supabase
      .from('user_registrations')
      .update({ status: 'EXPIRED' })
      .eq('status', 'ACTIVE')
      .lt('expires_at', new Date().toISOString())
      .select();
    
    if (error) {
      console.error("❌ Error updating expired registrations:", error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`✅ Marked ${data.length} registrations as expired`);
      
      // ส่งการแจ้งเตือนไปยัง LINE (ถ้าต้องการ)
      const message = `⏱️ มีผู้ใช้งานหมดอายุ ${data.length} รายการ\nได้ทำการเปลี่ยนสถานะเป็น EXPIRED เรียบร้อยแล้ว`;
      const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
      
      try {
        await sendMessageToLineBot2(message, lineUserIdToNotify);
      } catch (lineError) {
        console.error("⚠️ Could not send LINE notification:", lineError.message);
      }
    } else {
      console.log("✅ No expired registrations found");
    }
  } catch (error) {
    console.error("❌ Unexpected error in checkExpiredRegistrations:", error);
  }
}

// เพิ่มฟังก์ชัน sendMessageToLineBot2
async function sendMessageToLineBot2(message, userId) {
  try {
    console.log(`📤 Sending LINE message to ${userId}: ${message}`);
    const client = new line.Client(lineConfig);
    await client.pushMessage(userId, {
      type: 'text',
      text: message
    });
    console.log(`✅ Sent notification to LINE user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send LINE message: ${error.message}`);
    throw error;
  }
}

// Server startup
app.listen(PORT, () => {
  console.log(`✅ LINE Bot 2 is running on port ${PORT}`);
  console.log(`🌐 LINE Webhook: /webhook`);
  console.log(`🌐 Excel VBA Webhook: /webhook2`);
  console.log(`🌐 Verification Status: /verify-status`);
  
  // เริ่มตรวจสอบการหมดอายุทันที
  checkExpiredRegistrations();
  // ตรวจสอบทุก 1 ชั่วโมง
  setInterval(checkExpiredRegistrations, 3600000);
});
