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
  const { first_name, last_name, phone_number, national_id, slip_image_url, order_number, price_thb } = userData;
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
            text: `🔔 Starter Plan no. ${order_number || 'N/A'}`,
            size: "md",
            weight: "bold",
            color: "#007BFF"
          }
        ],
        backgroundColor: "#F8F9FA",
        paddingAll: "sm"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          { type: "text", text: `🔢 Ref.Code: ${ref_code}`, size: "sm", weight: "bold", color: "#007BFF" },
          { type: "text", text: `👤 ชื่อ: ${full_name}`, size: "sm" },
          { type: "text", text: `📱 เบอร์: ${phone_number}`, size: "sm" },
          { type: "text", text: `🆔 เลขบัตร: ${national_id}`, size: "sm" },
          { type: "text", text: `⏰ ระยะเวลา: ${duration} วัน`, size: "sm" },
          { type: "text", text: `💰 ราคาแพคเกจ: ${price_thb || 'N/A'} บาท`, size: "sm" }
        ],
        paddingAll: "sm"
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          // ปุ่มดูสลิป (ถ้ามี slip_image_url)
          ...(slip_image_url ? [{
            type: 'button',
            style: 'link',
            action: {
              type: 'uri',
              label: '📄 ดูสลิป',
              uri: slip_image_url
            },
            height: "sm"
          }] : []),
          // ปุ่มอนุมัติ/ปฏิเสธ
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
                  label: '✅ อนุมัติ',
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
                  label: '❌ ปฏิเสธ',
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

// 🎨 ฟังก์ชันสร้าง Flex Message หลังดำเนินการเสร็จ (สำหรับ Admin)
const createUpdatedAdminFlex = (userData, ref_code, action, actionData = {}) => {
  const { first_name, last_name, phone_number, national_id, slip_image_url, order_number, price_thb } = userData;
  const full_name = `${first_name} ${last_name}`;
  const isApproved = action === 'approved';
  const actionText = isApproved ? 'อนุมัติ' : 'ปฏิเสธ';
  const statusColor = isApproved ? '#28a745' : '#dc3545';
  const statusIcon = isApproved ? '✅' : '❌';

  return {
    type: "flex",
    altText: `${actionText}คำสั่งซื้อ ${full_name} แล้ว`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${statusIcon} Starter Plan no. ${order_number || 'N/A'}`,
            size: "md",
            weight: "bold",
            color: statusColor
          }
        ],
        backgroundColor: "#F8F9FA",
        paddingAll: "sm"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          { type: "text", text: `🔢 Ref.Code: ${ref_code}`, size: "sm", weight: "bold", color: "#007BFF" },
          { type: "text", text: `👤 ชื่อ: ${full_name}`, size: "sm" },
          { type: "text", text: `📱 เบอร์: ${phone_number}`, size: "sm" },
          { type: "text", text: `🆔 เลขบัตร: ${national_id}`, size: "sm" },
          { type: "text", text: `⏰ ระยะเวลา: ${actionData.duration || 'N/A'} วัน`, size: "sm" },
          { type: "text", text: `💰 ราคาแพคเกจ: ${price_thb || 'N/A'} บาท`, size: "sm" }
        ],
        paddingAll: "sm"
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          // แสดงสถานะการดำเนินการ
          {
            type: 'text',
            text: `${statusIcon} ${actionText}คำสั่งซื้อนี้แล้ว`,
            weight: 'bold',
            color: statusColor,
            align: 'center',
            size: 'md',
            margin: 'md'
          },
          {
            type: 'text',
            text: `${actionText}เมื่อ: ${new Date().toLocaleString('th-TH')}`,
            size: 'xs',
            color: '#666666',
            align: 'center',
            margin: 'sm'
          },
          // ปุ่มดูสลิป (ถ้ามี)
          ...(slip_image_url ? [{
            type: 'button',
            style: 'link',
            action: {
              type: 'uri',
              label: '📄 ดูสลิป',
              uri: slip_image_url
            },
            height: "sm",
            margin: "md"
          }] : [])
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

    console.log('📱 กำลังสร้าง Flex Message...');
    const flexMessage = createStarterPlanFlexMessage(userData, ref_code, duration);
    const adminId = process.env.ADMIN_USER_ID_BOT2;

    console.log('📤 กำลังส่ง Flex Message ไปยัง Admin:', adminId);
    const result = await client.pushMessage(adminId, flexMessage);

    console.log('✅ ส่ง Flex Message สำเร็จ');

    // 🎯 เก็บ messageId เพื่อใช้แก้ไข Flex ภายหลัง
    if (result.sentMessages && result.sentMessages.length > 0) {
      const messageId = result.sentMessages[0].id;
      console.log('📝 กำลังเก็บ messageId:', messageId);

      const { error: updateError } = await supabase
        .from('starter_plan_users')
        .update({ admin_message_id: messageId })
        .eq('ref_code', ref_code);

      if (updateError) {
        console.error('⚠️ ไม่สามารถเก็บ messageId ได้:', updateError);
        // ไม่ throw error เพราะการส่ง Flex สำเร็จแล้ว
      } else {
        console.log('✅ เก็บ messageId สำเร็จ');
      }
    }

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

// 🎯 ฟังก์ชันแก้ไข Flex Message ของ Admin (เรียกจาก API1)
const editAdminFlexMessage = async (req, res) => {
  try {
    const { ref_code, action, duration } = req.body;

    if (!ref_code || !action) {
      return res.status(400).json({ 
        success: false,
        message: 'ต้องมี ref_code และ action' 
      });
    }

    console.log(`🎨 กำลังแก้ไข Flex Message: ${ref_code} - ${action}`);

    // ดึงข้อมูลจาก database
    const { data: userData, error: fetchError } = await supabase
      .from('starter_plan_users')
      .select('*')
      .eq('ref_code', ref_code)
      .single();

    if (fetchError || !userData) {
      console.error('❌ ไม่พบข้อมูลใน starter_plan_users:', fetchError);
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูลสำหรับแก้ไข Flex Message' 
      });
    }

    if (!userData.admin_message_id) {
      console.log('⚠️ ไม่พบ admin_message_id สำหรับ', ref_code);
      return res.status(400).json({ 
        success: false,
        message: 'ไม่พบ messageId สำหรับแก้ไข Flex' 
      });
    }

    // สร้าง Flex Message ใหม่
    const durationDays = duration || Math.floor(userData.duration_minutes / 1440);
    const updatedFlex = createUpdatedAdminFlex(userData, ref_code, action, { duration: durationDays });

    // แก้ไข Flex Message
    await client.editMessage(userData.admin_message_id, updatedFlex);

    console.log('✅ แก้ไข Flex Message สำเร็จ');

    return res.status(200).json({
      success: true,
      message: 'แก้ไข Flex Message สำเร็จ',
      ref_code,
      action
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการแก้ไข Flex Message:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไข Flex Message',
      error: error.message
    });
  }
};

module.exports = { 
  sendStarterSlipToAdmin,
  editAdminFlexMessage 
};
