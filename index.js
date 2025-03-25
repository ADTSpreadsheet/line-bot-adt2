const axios = require('axios');

// ฟังก์ชันสำหรับส่งข้อความไปยัง LINE
async function sendMessageToLineBot2(message, userId) {
  console.log(`📤 Sending LINE message to ${userId}: ${message}`);
  try {
    const response = await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    console.log(`✅ LINE message sent successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send LINE message: ${error.message}`);
    if (error.response) {
      console.error(`Error details: ${JSON.stringify(error.response.data)}`);
    }
    throw error; // Re-throw to be caught by the caller
  }
}

// Webhook endpoint
app.post('/webhook2', async (req, res) => {
  if (!req.body.ref_code && !req.body.machine_id && req.body.destination && Array.isArray(req.body.events)) {
    console.log("🟡 Received test webhook from LINE Developer. Sending 200 OK.");
    return res.status(200).send("OK");
  }
  try {
    console.log("📥 Received data from Excel VBA:", JSON.stringify(req.body, null, 2));
    const { 
      ref_code, first_name, last_name, house_number, district, province, 
      phone_number, email, national_id, ip_address, machine_id 
    } = req.body;
    if (!ref_code) {
      console.log("❌ Missing required field: ref_code");
      return res.status(400).json({ 
        success: false, 
        message: "Reference Code is required" 
      });
    }
    const now = new Date();
    const expiresDate = new Date(now);
    expiresDate.setDate(now.getDate() + 7);
    console.log(`📅 Setting expiration date to: ${expiresDate.toISOString()}`);
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
    const { data, error } = await supabase
      .from('user_registrations')
      .insert([registrationData])
      .select();
    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(422).json({ 
        success: false, 
        message: "Unprocessable Entity",
        error: error.message 
      });
    }
    console.log("✅ Registration saved in Supabase:", data);
    const formattedDate = now.toLocaleDateString("th-TH", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    const formattedTime = now.toLocaleTimeString("th-TH", {
      hour: "2-digit", minute: "2-digit"
    });
    const message = `✅ ผู้ลงทะเบียนสำเร็จรายใหม่\nRef. Code: ${ref_code}\n🕒 เวลา: ${formattedDate} ${formattedTime} น.`;
    const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ub7406c5f05771fb36c32c1b1397539f6';
    
    try {
      await sendMessageToLineBot2(message, lineUserIdToNotify);
      console.log(`✅ LINE notification sent successfully to ${lineUserIdToNotify}`);
    } catch (lineError) {
      console.error("⚠️ Could not send LINE notification:", lineError.message);
      // เพิ่มการ log รายละเอียดของ error
      if (lineError.response) {
        console.error("Error details:", {
          status: lineError.response.status,
          statusText: lineError.response.statusText,
          data: lineError.response.data
        });
      } else if (lineError.request) {
        console.error("No response received:", lineError.request);
      } else {
        console.error("Error details:", lineError);
      }
      // ไม่ return error response เพื่อให้การลงทะเบียนยังสำเร็จแม้ว่าการส่ง LINE จะล้มเหลว
    }
    
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

// เพิ่ม Cron job เพื่ออัปเดตสถานะการลงทะเบียนที่หมดอายุเป็น 'BLOCK'
// รันทุกวันเวลาเที่ยงคืน
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  console.log('🕒 Running scheduled task: Updating expired registrations');
  try {
    const now = new Date().toISOString();
    
    // อัปเดตสถานะของการลงทะเบียนที่หมดอายุ
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
    console.error('❌ Error in scheduled task:', error);
  }
});
