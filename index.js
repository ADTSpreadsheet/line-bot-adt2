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

// ✅ LINE Webhook Route (requires signature validation)
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  console.log("📥 LINE Webhook Event:", JSON.stringify(req.body, null, 2));
  if (!req.body.events || req.body.events.length === 0) {
    console.log("❌ No events found in webhook request");
    return res.status(200).json({ message: "No events" });
  }
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log("✅ All events handled successfully");
      res.json(result);
    })
    .catch((err) => {
      console.error("❌ Error handling LINE events:", err);
      res.status(500).json({ error: "LINE event handling failed" });
    });
});

// ✅ Excel VBA Webhook Route (no signature validation)
app.post('/webhook2', async (req, res) => {
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
    
    const now = new Date();
    const expiresDate = new Date(now);
    expiresDate.setDate(now.getDate() + 7); // 7 days from now
    
    const { data, error } = await supabase
      .from('user_registrations')
      .insert([
        {
          ref_code,
          machine_id,
          first_name,
          last_name,
          house_number,
          district,
          province,
          phone_number,
          email,
          national_id,
          ip_address,
          day_created_at: now.toISOString(),
          verify_at: now.toISOString(),
          expires_at: expiresDate.toISOString(),
          status: 'ACTIVE'
        }
      ])
      .select();
    
    if (error) {
      console.error("❌ Supabase insert error:", error);
      throw new Error(`Failed to save registration: ${error.message}`);
    }
    
    console.log("✅ Registration saved in Supabase:", data);
    
    // Prepare the message to be sent to LINE Bot 2
    const message = `🎉 มีผู้ใช้รายใหม่ลงทะเบียนสำเร็จ 🎉\n\n` +
                    `📄 Ref. Code: ${ref_code || 'ไม่ระบุ'}\n` +
                    `👤 ชื่อ: ${first_name || ''} ${last_name || ''}\n` +
                    `🏠 ที่อยู่: ${house_number || ''}, ${district || ''}, ${province || ''}\n` +
                    `📞 เบอร์โทร: ${phone_number || 'ไม่ระบุ'}\n` + 
                    `📧 อีเมล: ${email || 'ไม่ระบุ'}\n` +
                    `💳 หมายเลขบัตรประชาชน: ${national_id || 'ไม่ระบุ'}\n` +
                    `🔑 Machine ID: ${machine_id || 'ไม่ระบุ'}\n`;
    
    // Define the LINE user ID to send to
    const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    
    // Try to send message but don't fail if it doesn't work
    try {
      await sendMessageToLineBot2(message, lineUserIdToNotify);
    } catch (lineError) {
      console.error("⚠️ Could not send LINE notification, but registration was successful:", lineError.message);
    }
    
    // Return success response
    res.status(200).json({ 
      success: true, 
      message: "Registration successful and saved to database",
      expires_at: expiresDate.toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /webhook2:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// [รหัสส่วนที่เหลือยังคงเดิม]
