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
  const {
    first_name,
    last_name,
    phone_number,
    national_id,
    slip_image_url,
    order_number,
    price_thb
  } = userData;

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
            text: `Starter Plan no. ${order_number || 'N/A'}`,
            size: "md",
            weight: "bold",
            color: "#007bff"
          }
        ],
        backgroundColor: "#f8f9fa",
        paddingAll: "sm"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          { type: "text", text: `Ref.Code: ${ref_code}`, size: "sm", weight: "bold", color: "#007bff" },
          { type: "text", text: `ชื่อ: ${full_name}`, size: "sm" },
          { type: "text", text: `เบอร์: ${phone_number}`, size: "sm" },
          { type: "text", text: `เลขบัตร: ${national_id}`, size: "sm" },
          { type: "text", text: `ระยะเวลา: ${duration} วัน`, size: "sm" },
          { type: "text", text: `ราคาแพคเกจ: ${price_thb || 'N/A'} บาท`, size: "sm" }
        ],
        paddingAll: "sm"
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          ...(slip_image_url
            ? [{
                type: 'button',
                style: 'link',
                action: {
                  type: 'uri',
                  label: 'ดูสลิป',
                  uri: slip_image_url
                },
                height: "sm"
              }]
            : []),
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#28a745',
                action: {
                  type: 'postback',
                  label: 'อนุมัติ',
                  data: `action=approve&ref_code=${ref_code}&plan_type=starter`
                },
                height: "sm"
              },
              {
                type: 'button',
                style: 'secondary',
                color: '#dc3545',
                action: {
                  type: 'postback',
                  label: 'ปฏิเสธ',
                  data: `action=reject&ref_code=${ref_code}&plan_type=starter`
                },
                height: "sm"
              }
            ]
          }
        ],
        paddingAll: "sm"
      }
    }
  };
};

const sendStarterSlipToAdmin = async (req, res) => {
  const startTime = Date.now();

  try {
    const { ref_code, duration } = req.body;

    console.log('🔍 กำลังค้นหาข้อมูลใน starter_plan_users:', { ref_code, duration });

    const { data: userData, error: fetchError } = await supabase
      .from('starter_plan_users')
      .select('first_name, last_name, phone_number, national_id, slip_image_url, submissions_status, order_number, price_thb')
      .eq('ref_code', ref_code)
      .single();

    if (fetchError || !userData) {
      console.error('❌ ไม่พบข้อมูลใน starter_plan_users:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้หรือ ref_code ไม่ถูกต้อง',
        ref_code
      });
    }

    console.log('✅ พบข้อมูลผู้ใช้:', userData);

    if (userData.submissions_status === 'notified_admin') {
      console.log('⚠️ แอดมินได้รับการแจ้งเตือนแล้ว');
      return res.status(200).json({
        success: true,
        message: 'แอดมินได้รับการแจ้งเตือนแล้ว',
        ref_code,
        duration
      });
    }

    const flexMessage = createStarterPlanFlexMessage(userData, ref_code, duration);
    const adminId = process.env.ADMIN_USER_ID_BOT2;

    console.log('📤 กำลังส่ง Flex Message ไปยัง Admin:', adminId);

    // ✅ แก้ไขการเรียกใช้ pushMessage ให้ถูกต้อง
    await client.pushMessage(adminId, flexMessage);

    console.log('✅ ส่ง Flex Message สำเร็จ');

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
    console.error('❌ เกิดข้อผิดพลาดในการส่ง Flex Message:', error);
    const processingTime = Date.now() - startTime;

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง Flex Message',
      error: error.message,
      processing_time_ms: processingTime
    });
  }
};

module.exports = sendStarterSlipToAdmin;
