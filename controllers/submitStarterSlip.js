const line = require('@line/bot-sdk');
const { supabase } = require('../utils/supabaseClient');
require('dotenv').config();

const requiredEnvVars = ['LINE_BOT2_ACCESS_TOKEN', 'ADMIN_USER_ID_BOT2'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ ขาด Environment Variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const validateInput = (req, res, next) => {
  const { ref_code, duration } = req.body;

  if (!ref_code || !duration) {
    return res.status(400).json({ 
      success: false,
      message: 'ต้องมี ref_code และ duration',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }

  if (typeof ref_code !== 'string' || typeof duration !== 'number') {
    return res.status(400).json({ 
      success: false,
      message: 'ref_code ต้องเป็น string และ duration ต้องเป็น number',
      code: 'INVALID_DATA_TYPE'
    });
  }

  if (duration < 1 || duration > 15) {
    return res.status(400).json({ 
      success: false,
      message: 'duration ต้องอยู่ระหว่าง 1-15 วัน',
      code: 'INVALID_DURATION'
    });
  }

  next();
};

const createStarterPlanFlexMessage = (userData, ref_code, duration) => {
  const { first_name, last_name, phone_number, national_id, slip_image_url } = userData;
  const full_name = `${first_name} ${last_name}`;

  return {
    type: "flex",
    altText: `รายการ Starter Plan ของ ${full_name}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🔔 แจ้งเตือนคำสั่งซื้อใหม่",
            size: "lg",
            weight: "bold",
            color: "#007BFF"
          },
          {
            type: "text",
            text: `Starter Plan - ${duration} วัน`,
            size: "sm",
            color: "#666666",
            margin: "xs"
          }
        ],
        backgroundColor: "#F8F9FA",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "📋 ข้อมูลลูกค้า",
                weight: "bold",
                color: "#333333",
                size: "md"
              },
              { type: "text", text: `👤 ชื่อ: ${full_name}`, wrap: true, size: "sm" },
              { type: "text", text: `📱 เบอร์: ${phone_number}`, wrap: true, size: "sm" },
              { type: "text", text: `🆔 เลขบัตร: ${national_id}`, wrap: true, size: "sm" }
            ]
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "📦 รายละเอียดแพ็กเกจ",
                weight: "bold",
                color: "#333333",
                size: "md"
              },
              { type: "text", text: `⏰ ระยะเวลา: ${duration} วัน`, wrap: true, size: "sm" },
              { type: "text", text: `🔢 Ref Code: ${ref_code}`, wrap: true, size: "sm", color: "#007BFF" }
            ]
          }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: slip_image_url
          ? [{
              type: "button",
              action: {
                type: "uri",
                label: "📄 ดูสลิปการโอน",
                uri: slip_image_url
              },
              style: "primary",
              color: "#007BFF"
            }]
          : [],
        paddingAll: "lg"
      }
    }
  };
};

const sendStarterSlipToAdmin = async (req, res) => {
  const startTime = Date.now();

  try {
    const { ref_code, duration } = req.body;

    const { data: userData, error: fetchError } = await supabase
      .from('starter_plan_users')
      .select('first_name, last_name, phone_number, national_id, slip_image_url, submissions_status')
      .eq('ref_code', ref_code)
      .single();

    if (fetchError || !userData) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้หรือ ref_code ไม่ถูกต้อง',
        ref_code
      });
    }

    if (userData.submissions_status === 'notified_admin') {
      return res.status(200).json({
        success: true,
        message: 'แอดมินได้รับการแจ้งเตือนแล้ว',
        ref_code,
        duration
      });
    }

    const flexMessage = createStarterPlanFlexMessage(userData, ref_code, duration);
    const adminId = process.env.ADMIN_USER_ID_BOT2;

    await client.pushMessage(adminId, flexMessage);

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'ส่ง Flex Message ไปยังแอดมินสำเร็จ',
      data: {
        ref_code,
        duration,
        admin_notified: true,
        processing_time_ms: processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง Flex Message',
      error: error.message,
      processing_time_ms: processingTime
    });
  }
};

module.exports = {
  sendStarterSlipToAdmin,
  validateInput
};
