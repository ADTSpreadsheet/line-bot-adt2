const line = require('@line/bot-sdk');
const { supabase } = require('../utils/supabaseClient');
require('dotenv').config();

// LINE Bot 2 Client
const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const submitStarterSlip = async (req, res) => {
  try {
    const { ref_code, duration } = req.body;

    if (!ref_code || !duration) {
      return res.status(400).json({ message: 'ต้องมี ref_code และ duration' });
    }

    console.log("🔍 กำลังค้นหา ref_code:", ref_code);

    // ดึงข้อมูลจาก starter_plan_users
    const { data, error } = await supabase
      .from('starter_plan_users')
      .select('first_name, last_name, phone_number, national_id, slip_image_url')
      .eq('ref_code', ref_code)
      .single();

    if (error || !data) {
      console.error("❌ ไม่พบข้อมูลใน starter_plan_users:", error);
      return res.status(404).json({ message: 'ไม่พบข้อมูล ref_code นี้' });
    }

    const { first_name, last_name, phone_number, national_id, slip_image_url } = data;
    const full_name = `${first_name} ${last_name}`;

    console.log("✅ ดึงข้อมูลผู้ใช้สำเร็จ:", full_name);

    // Flex Message
    const flexMessage = {
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
              text: "แจ้งเตือนคำสั่งซื้อใหม่",
              size: "lg",
              weight: "bold",
              color: "#007BFF"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: `ชื่อ: ${full_name}`, wrap: true },
            { type: "text", text: `เบอร์: ${phone_number}`, wrap: true },
            { type: "text", text: `เลขบัตร: ${national_id}`, wrap: true },
            { type: "text", text: `ใช้งานโปรแกรม: ${duration} วัน`, wrap: true },
            { type: "text", text: `Ref: ${ref_code}`, wrap: true }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            ...(slip_image_url ? [{
              type: "button",
              action: {
                type: "uri",
                label: "ดูสลิปการโอน",
                uri: slip_image_url
              },
              style: "primary"
            }] : [])
          ]
        }
      }
    };

    const targetUserId = process.env.ADMIN_LINE_BOT2_USER_ID;
    if (!targetUserId) {
      throw new Error("❌ ไม่พบ ADMIN_LINE_BOT2_USER_ID ใน .env");
    }

    console.log("📤 กำลังส่ง Flex Message ไปยัง Admin:", targetUserId);

    await client.pushMessage(targetUserId, flexMessage);

    console.log("✅ ส่ง Flex Message สำเร็จ");

    return res.status(200).json({ 
      message: '✅ ส่ง Flex สำเร็จแล้ว',
      ref_code,
      duration
    });

  } catch (error) {
    console.error("❌ ERROR @ submitStarterSlip:", error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการส่ง Flex',
      error: error.message
    });
  }
};

module.exports = submitStarterSlip;
