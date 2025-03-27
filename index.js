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
    console.log("🟢 LINE Webhook Event (test หรือจริง):");
    console.log("📱 LINE USER ID:", events[0].source.userId);
    console.log("🕒 Timestamp:", new Date().toISOString());
  } else {
    console.log("🟡 Received test webhook from LINE Developer. No userId found.");
  }

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

    console.log("🧱 Preparing registrationData...");

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

console.log("📦 Prepared registrationData:", registrationData);

const { data, error } = await supabase.from('user_registrations').insert([registrationData]).select();

console.log("📤 Sending to Supabase...");

if (error) {
  console.error("❌ Supabase insert error:", error);
  return res.status(422).json({ success: false, message: "Unprocessable Entity", error: error.message });
}

console.log("✅ Registration saved in Supabase:", data);
    return res.status(200).json({ 
  success: true, 
  message: "Registration successful", 
  ref_code: ref_code 
});

// ✅ Endpoint สำหรับรับการแจ้งเตือนการเข้า Dashboard
app.post('/webhook2/dashboard-respon', async (req, res) => {
  try {
    console.log("📥 Received dashboard access notification");
    const { ref_code } = req.body;
    
    if (!ref_code) {
      return res.status(400).json({ success: false, message: "Missing ref_code" });
    }
    
    // ตอบกลับ 200 ทันที
    res.status(200).json({ success: true, message: "Dashboard access recorded" });
    
    // ส่งข้อความแจ้งเตือน
    const timestamp = new Date();
    const formattedDate = timestamp.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formattedTime = timestamp.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    
    const notifyMessage = 
  `✅ ผู้ใช้ Ref.Code: ${ref_code}\n` +
  `✅ กำลังใช้งาน Dashboard อยู่\n` +
  `📅 วันที่ ${formattedDate}\n` +
  `🕒 เวลา ${formattedTime}`;

    
    const lineUserIdToNotify = process.env.ADMIN_LINE_USER_ID || 'Ua1cd02be16435b311c4a90cea9bee87e';
    sendMessageToLineBot2(notifyMessage, lineUserIdToNotify)
      .then(() => console.log("✅ LINE notification sent"))
      .catch(err => console.error("❌ LINE notification error:", err.message));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
});
    // ✅ LINE Webhook to capture multiple events
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  console.log("📲 Bot 2 Webhook triggered");
  console.log("Full webhook payload:", JSON.stringify(req.body, null, 2));
  res.status(200).end();

  const events = req.body.events;
  if (!Array.isArray(events)) {
    console.log("❌ No events array found");
    return;
  }

  for (const event of events) {
    switch(event.type) {
      case 'follow':
        const followUserId = event.source.userId;
        
        console.log(🟢 FOLLOW EVENT);
        console.log(=============================================);
        console.log(📱 LINE USER ID: ${followUserId});
        console.log(🕒 Timestamp: ${new Date().toISOString()});
        console.log(=============================================);

        try {
          await lineClient.pushMessage(followUserId, {
            type: 'text',
            text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน! ยินดีต้อนรับสู่ระบบแจ้งเตือนของ ADTSpreadsheet'
          });

          const followRegistrationData = {
            line_user_id: followUserId,
            registered_at: new Date().toISOString(),
            status: 'ACTIVE'
          };

          const { data, error } = await supabase
            .from('line_users')
            .insert([followRegistrationData])
            .select();

          if (error) {
            console.error('❌ Failed to save user to Supabase:', error);
          } else {
            console.log('✅ User saved to Supabase:', data);
          }
        } catch (err) {
          console.error("❌ Failed to process follow event:", {
            userId: followUserId,
            errorMessage: err.message,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'unfollow':
        const unfollowUserId = event.source.userId;
        
        console.log(🔴 UNFOLLOW EVENT);
        console.log(=============================================);
        console.log(📱 LINE USER ID: ${unfollowUserId});
        console.log(🕒 Timestamp: ${new Date().toISOString()});
        console.log(=============================================);

        try {
          const { data, error } = await supabase
            .from('line_users')
            .update({ status: 'INACTIVE' })
            .eq('line_user_id', unfollowUserId);

          if (error) {
            console.error('❌ Failed to update user status:', error);
          } else {
            console.log('✅ User status updated to INACTIVE');
          }
        } catch (err) {
          console.error("❌ Failed to process unfollow event:", {
            userId: unfollowUserId,
            errorMessage: err.message,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'message':
        const messageUserId = event.source.userId;
        
        console.log(💬 MESSAGE EVENT);
        console.log(=============================================);
        console.log(📱 LINE USER ID: ${messageUserId});
        console.log(🕒 Timestamp: ${new Date().toISOString()});
        
        // ตรวจสอบประเภทของข้อความ
        if (event.message.type === 'text') {
          console.log(📝 Message Type: Text);
          console.log(📄 Message Content: ${event.message.text});
        } else if (event.message.type === 'sticker') {
          console.log(🌈 Message Type: Sticker);
          console.log(🆔 Sticker ID: ${event.message.stickerId});
          console.log(📦 Sticker Package ID: ${event.message.packageId});
        } else {
          console.log(📌 Message Type: ${event.message.type});
        }
        
        console.log(=============================================);

        // เพิ่มการบันทึกข้อความลงใน Supabase หากต้องการ
        try {
          const messageData = {
            line_user_id: messageUserId,
            message_type: event.message.type,
            message_content: event.message.type === 'text' ? event.message.text : 
                             event.message.type === 'sticker' ? Sticker: ${event.message.stickerId} : 'Other',
            received_at: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('line_messages')
            .insert([messageData])
            .select();

          if (error) {
            console.error('❌ Failed to save message to Supabase:', error);
          } else {
            console.log('✅ Message saved to Supabase:', data);
          }
        } catch (err) {
          console.error("❌ Failed to process message event:", {
            userId: messageUserId,
            errorMessage: err.message,
            timestamp: new Date().toISOString()
          });
        }
        break;

      default:
        console.log(📌 Other event type: ${event.type});
        console.log(📱 User ID: ${event.source?.userId || 'N/A'});
        console.log(🕒 Timestamp: ${new Date().toISOString()});
        break;
    }
  }
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
        'Authorization': Bearer ${token}
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

// ✅ LINE Webhook to capture "follow" events
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  console.log("📲 Bot 2 Webhook triggered");
  res.status(200).end();

  const events = req.body.events;
  if (!Array.isArray(events)) return;

  for (const event of events) {
    if (event.type === 'follow') {
      const userId = event.source.userId;
      
      // บันทึก LINE User ID ลงใน log
      console.log(🎉 User added Bot2 as a friend. 
      LINE User ID: ${userId}
      Event Timestamp: ${new Date().toISOString()});

      try {
        // ส่งข้อความต้อนรับ
        await lineClient.pushMessage(userId, {
          type: 'text',
          text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน! ยินดีต้อนรับสู่ระบบแจ้งเตือนของ ADTSpreadsheet'
        });

        // เพิ่มการบันทึกข้อมูลผู้ใช้ลงใน Supabase
        const registrationData = {
          line_user_id: userId,
          registered_at: new Date().toISOString(),
          status: 'ACTIVE'
        };

        const { data, error } = await supabase
          .from('line_users')
          .insert([registrationData])
          .select();

        if (error) {
          console.error('❌ Failed to save user to Supabase:', error);
        } else {
          console.log('✅ User saved to Supabase:', data);
        }

      } catch (err) {
        console.error("❌ Failed to process follow event:", {
          userId: userId,
          errorMessage: err.message,
          timestamp: new Date().toISOString()
        });
      }
    }
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
      const profileResponse = await axios.get(https://api.line.me/v2/bot/profile/${userId}, {
        headers: {
          'Authorization': Bearer ${token}
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

app.use("/webhook2", checkMachineIDRoute);

app.get("/webhook2/check-machine-id", async (req, res) => {
  const { machine_id } = req.query;

  console.log("=======================================");
  console.log("📥 [API] CHECK MACHINE ID ถูกเรียกแล้ว");
  console.log("🧾 MACHINE ID ที่ได้รับ:", machine_id);

  if (!machine_id) {
    console.log("❌ ไม่พบ machine_id ที่ส่งมา");
    return res.status(400).json({ error: "Missing machine_id" });
  }

  try {
    const { data, error } = await supabase
      .from("user_registrations")
      .select("status")
      .eq("machine_id", machine_id)
      .single();

    if (error || !data) {
      console.log("⚠️ ไม่พบข้อมูลใน Supabase หรือเกิด error");
      return res.status(200).json({ status: "INACTIVE" });
    }

    console.log("✅ พบข้อมูล Machine ID ใน Supabase");
    console.log("📦 STATUS ที่ได้:", data.status);

    if (data.status === "ACTIVE") {
      console.log("🎯 สถานะ = ACTIVE → ส่งกลับให้ VBA");
      return res.status(200).json({ status: "ACTIVE" });
    } else {
      console.log("🚫 ไม่ใช่ ACTIVE → ส่งกลับ INACTIVE");
      return res.status(200).json({ status: "INACTIVE" });
    }

  } catch (err) {
    console.error("❌ [SERVER ERROR] ตรวจสอบ Machine ID ล้มเหลว:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});


// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(🚀 Server running on port ${PORT});
  updateExpiredRegistrations();
});
