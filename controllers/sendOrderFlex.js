const line = require('@line/bot-sdk');
const { supabase } = require('../utils/supabaseClient'); // เพิ่ม supabase client
require('dotenv').config();

// LINE Bot 2 Client
const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const sendOrderFlex = async (req, res) => {
  try {
    const { ref_code, license_no } = req.body;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!ref_code || !license_no) {
      return res.status(400).json({ message: 'ต้องมี ref_code และ license_no' });
    }

    console.log("🔍 กำลังดึงข้อมูลจาก database:", { ref_code, license_no });

    // ดึงข้อมูลจาก license_holders
    const { data: licenseData, error: licenseError } = await supabase
      .from('license_holders')
      .select('*')
      .eq('license_no', license_no)
      .eq('ref_code', ref_code)
      .single();

    if (licenseError || !licenseData) {
      console.error("❌ ไม่พบข้อมูลใน license_holders:", licenseError);
      return res.status(404).json({ message: 'ไม่พบข้อมูล license' });
    }

    // ดึงข้อมูลจาก slip_submissions
    const { data: slipData, error: slipError } = await supabase
      .from('slip_submissions')
      .select('*')
      .eq('license_no', license_no)
      .eq('ref_code', ref_code)
      .single();

    if (slipError || !slipData) {
      console.error("❌ ไม่พบข้อมูลใน slip_submissions:", slipError);
      return res.status(404).json({ message: 'ไม่พบข้อมูล slip' });
    }

    console.log("✅ ดึงข้อมูลครบแล้ว:", { licenseData, slipData });

    // สร้าง Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `รายการใหม่จาก ${licenseData.first_name} ${licenseData.last_name}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔔 แจ้งเตือนคำสั่งซื้อใหม่',
              weight: 'bold',
              size: 'lg',
              color: '#FF5551'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: `📋 License: ${licenseData.license_no}`,
              weight: 'bold',
              size: 'sm'
            },
            {
              type: 'text',
              text: `👤 ชื่อ: ${licenseData.first_name} ${licenseData.last_name}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `📱 เบอร์: ${licenseData.phone_number}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `🆔 เลขบัตร: ${licenseData.national_id}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `📍 ที่อยู่: ${licenseData.address}`,
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📮 รหัสไปรษณีย์: ${licenseData.postal_code}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `📦 สินค้า: ${slipData.product_source}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `🔖 Ref: ${ref_code}`,
              size: 'sm'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            // ปุ่มดูสลิป (ถ้ามี slip_image_url)
            ...(slipData.slip_image_url ? [{
              type: 'button',
              style: 'link',
              action: {
                type: 'uri',
                label: '📄 ดูสลิปการโอนเงิน',
                uri: slipData.slip_image_url
              }
            }] : []),
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'md',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#28a745',
                  action: {
                    type: 'uri',
                    label: '✅ อนุมัติ',
                    uri: `https://line-bot-adt.onrender.com/approve-order?ref_code=${ref_code}&license_no=${license_no}`
                  }
                },
                {
                  type: 'button',
                  style: 'secondary',
                  color: '#dc3545',
                  action: {
                    type: 'uri',
                    label: '❌ ปฏิเสธ',
                    uri: `https://line-bot-adt.onrender.com/reject-order?ref_code=${ref_code}&license_no=${license_no}`
                  }
                }
              ]
            }
          ]
        }
      }
    };

    // ส่งไปยัง LINE USER ID ของแอดมิน
    const targetUserId = process.env.ADMIN_USER_ID_BOT2;
    if (!targetUserId) {
      throw new Error("❌ ไม่พบ ADMIN_USER_ID_BOT2 .env");
    }

    console.log("📤 กำลังส่ง Flex Message ไปยัง Admin:", targetUserId);

    await client.pushMessage(targetUserId, flexMessage);

    console.log("✅ ส่ง Flex Message สำเร็จ");

    return res.status(200).json({ 
      message: '✅ ส่ง Flex สำเร็จแล้ว',
      license_no,
      ref_code
    });

  } catch (error) {
    console.error('❌ ส่ง Flex ล้มเหลว:', error);
    return res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการส่ง Flex',
      error: error.message
    });
  }
};

module.exports = { sendOrderFlex };
