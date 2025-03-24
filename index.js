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

// Excel VBA Webhook Route
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
    
    // Validate required fields
    if (!ref_code) {
      return res.status(400).json({ 
        success: false, 
        message: "Reference Code is required" 
      });
    }
    
    const now = new Date();
    const expiresDate = new Date(now);
    expiresDate.setDate(now.getDate() + 7);
    
    // Prepare registration data
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
    
    console.log("✅ Registration saved in Supabase:", data);
    
    // Prepare notification message
    const message = `🎉 มีผู้ใช้รายใหม่ลงทะเบียนสำเร็จ 🎉\n\n` +
                    `📄 Ref. Code: ${ref_code || 'ไม่ระบุ'}\n` +
                    `👤 ชื่อ: ${first_name || ''} ${last_name || ''}\n` +
                    `🏠 ที่อยู่: ${house_number || ''}, ${district || ''}, ${province || ''}\n` +
                    `📞 เบอร์โทร: ${phone_number || 'ไม่ระบุ'}\n` + 
                    `📧 อีเมล: ${email || 'ไม่ระบุ'}\n` +
                    `💳 หมายเลขบัตรประชาชน: ${national_id || 'ไม่ระบุ'}\n` +
                    `🔑 Machine ID: ${machine_id || 'ไม่ระบุ'}\n`;
    
    // Define LINE user ID to notify
    const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    
    // Send notification (non-blocking)
    try {
      await sendMessageToLineBot2(message, lineUserIdToNotify);
    } catch (lineError) {
      console.error("⚠️ Could not send LINE notification:", lineError.message);
    }
    
    // Return success response
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

// Existing functions for LINE messaging (sendMessageToLineBot2, etc.) remain the same

// Server startup
app.listen(PORT, () => {
  console.log(`✅ LINE Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Excel VBA Webhook: /webhook2`);
});
