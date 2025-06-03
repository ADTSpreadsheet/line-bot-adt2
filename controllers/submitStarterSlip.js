const line = require('@line/bot-sdk');
const { supabase } = require('../utils/supabaseClient');
require('dotenv').config();

// ตรวจสอบ Environment Variables ที่จำเป็น
const requiredEnvVars = ['LINE_BOT2_ACCESS_TOKEN', 'ADMIN_LINE_BOT2_USER_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ ขาด Environment Variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// LINE Bot 2 Client
const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

// Input validation schema
const validateInput = (req, res, next) => {
  const { ref_code, duration } = req.body;
  
  // ตรวจสอบความครบถ้วนของข้อมูล
  if (!ref_code || !duration) {
    return res.status(400).json({ 
      success: false,
      message: 'ต้องมี ref_code และ duration',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }

  // ตรวจสอบประเภทข้อมูล
  if (typeof ref_code !== 'string' || typeof duration !== 'number') {
    return res.status(400).json({ 
      success: false,
      message: 'ref_code ต้องเป็น string และ duration ต้องเป็น number',
      code: 'INVALID_DATA_TYPE'
    });
  }

  // ตรวจสอบช่วงค่า duration
  if (duration < 1 || duration > 15) {
    return res.status(400).json({ 
      success: false,
      message: 'duration ต้องอยู่ระหว่าง 1-15 วัน',
      code: 'INVALID_DURATION'
    });
  }

  next();
};

// ฟังก์ชันสำหรับสร้าง Flex Message
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
          // ข้อมูลลูกค้า
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
              { 
                type: "text", 
                text: `👤 ชื่อ: ${full_name}`, 
                wrap: true,
                size: "sm"
              },
              { 
                type: "text", 
                text: `📱 เบอร์: ${phone_number}`, 
                wrap: true,
                size: "sm"
              },
              { 
                type: "text", 
                text: `🆔 เลขบัตร: ${national_id}`, 
                wrap: true,
                size: "sm"
              }
            ]
          },
          // เส้นแบ่ง
          {
            type: "separator",
            margin: "md"
          },
          // ข้อมูลแพ็กเกจ
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
              { 
                type: "text", 
                text: `⏰ ระยะเวลา: ${duration} วัน`, 
                wrap: true,
                size: "sm"
              },
              { 
                type: "text", 
                text: `🔢 Ref Code: ${ref_code}`, 
                wrap: true,
                size: "sm",
                color: "#007BFF"
              }
            ]
          }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          // ปุ่มดูสลิป (ถ้ามี)
          ...(slip_image_url ? [{
            type: "button",
            action: {
              type: "uri",
              label: "📄 ดูสลิปการโอน",
              uri: slip_image_url
            },
            style: "primary",
            color: "#007BFF"
          }] : []),
          // ปุ่มอนุมัติ/ปฏิเสธ (ถ้าต้องการเพิ่มในอนาคต)
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                action: {
                  type: "postback",
                  label: "✅ อนุมัติ",
                  data: `action=approve&ref_code=${ref_code}`
                },
                style: "primary",
                color: "#28A745",
                flex: 1
              },
              {
                type: "button",
                action: {
                  type: "postback",
                  label: "❌ ปฏิเสธ",
                  data: `action=reject&ref_code=${ref_code}`
                },
                style: "secondary",
                flex: 1
              }
            ]
          }
        ],
        paddingAll: "lg"
      }
    }
  };
};

const sendStarterSlipToAdmin = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { ref_code, duration } = req.body;
    
    console.log(`🔍 [${ref_code}] เริ่มค้นหาข้อมูลใน starter_plan_users`);

    // ดึงข้อมูลจาก starter_plan_users
    const { data: userData, error: fetchError } = await supabase
      .from('starter_plan_users')
      .select('first_name, last_name, phone_number, national_id, slip_image_url, submissions_status')
      .eq('ref_code', ref_code)
      .single();

    if (fetchError) {
      console.error(`❌ [${ref_code}] Database Error:`, fetchError);
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูล ref_code นี้ในระบบ',
        code: 'REF_CODE_NOT_FOUND',
        ref_code
      });
    }

    if (!userData) {
      console.error(`❌ [${ref_code}] ไม่พบข้อมูลผู้ใช้`);
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
        code: 'USER_DATA_NOT_FOUND',
        ref_code
      });
    }

    const { first_name, last_name, submissions_status } = userData;
    const full_name = `${first_name} ${last_name}`;
    
    console.log(`✅ [${ref_code}] ดึงข้อมูลผู้ใช้สำเร็จ: ${full_name}`);

    // ตรวจสอบสถานะการส่ง
    if (submissions_status === 'notified_admin') {
      console.log(`⚠️ [${ref_code}] แอดมินได้รับการแจ้งเตือนแล้ว`);
      return res.status(200).json({
        success: true,
        message: 'แอดมินได้รับการแจ้งเตือนแล้ว',
        code: 'ALREADY_NOTIFIED',
        ref_code,
        status: submissions_status
      });
    }

    // สร้าง Flex Message
    const flexMessage = createStarterPlanFlexMessage(userData, ref_code, duration);

    const targetUserId = process.env.ADMIN_LINE_BOT2_USER_ID;
    
    console.log(`📤 [${ref_code}] กำลังส่ง Flex Message ไปยัง Admin: ${targetUserId}`);

    // ส่ง Flex Message ไปยัง Admin
    await client.pushMessage(targetUserId, flexMessage);

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${ref_code}] ส่ง Flex Message สำเร็จ (${processingTime}ms)`);

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
    console.error(`❌ ERROR @ sendStarterSlipToAdmin (${processingTime}ms):`, error);

    // ตรวจสอบประเภทของ error
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    
    if (error.message?.includes('Invalid user ID')) {
      statusCode = 400;
      errorCode = 'INVALID_ADMIN_USER_ID';
    } else if (error.message?.includes('channel access token')) {
      statusCode = 401;
      errorCode = 'INVALID_ACCESS_TOKEN';
    } else if (error.message?.includes('network')) {
      statusCode = 503;
      errorCode = 'NETWORK_ERROR';
    }

    return res.status(statusCode).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง Flex Message',
      code: errorCode,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      processing_time_ms: processingTime
    });
  }
};

module.exports = {
  sendStarterSlipToAdmin,
  validateInput
};
