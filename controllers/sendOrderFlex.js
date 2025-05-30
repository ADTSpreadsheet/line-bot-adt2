const line = require('@line/bot-sdk');
require('dotenv').config();

// LINE Bot 2 Client
const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const sendOrderFlex = async (req, res) => {
  try {
    const {
      license_no,
      first_name,
      last_name,
      phone_number,
      address
    } = req.body;

    if (!license_no || !first_name || !last_name || !phone_number || !address) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    const flexMessage = {
      type: 'flex',
      altText: `รายการใหม่จาก ${first_name} ${last_name}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'แจ้งเตือนคำสั่งซื้อใหม่',
              weight: 'bold',
              size: 'lg'
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
              text: `License No: ${license_no}`,
              weight: 'bold',
              size: 'sm'
            },
            {
              type: 'text',
              text: `ชื่อ: ${first_name} ${last_name}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `เบอร์โทร: ${phone_number}`,
              size: 'sm'
            },
            {
              type: 'text',
              text: `ที่อยู่: ${address}`,
              size: 'sm',
              wrap: true
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'md',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#28a745',
              action: {
                type: 'postback',
                label: '✅ อนุมัติ',
                data: `approve_order&${license_no}`
              }
            },
            {
              type: 'button',
              style: 'secondary',
              color: '#dc3545',
              action: {
                type: 'postback',
                label: '❌ ปฏิเสธ',
                data: `reject_order&${license_no}`
              }
            }
          ]
        }
      }
    };

    // ส่งไปยัง LINE USER ID ของแอดมิน (คุณตั้ม)
    const targetUserId = process.env.ADMIN_USER_ID_BOT2;
    if (!targetUserId) {
      throw new Error("❌ ไม่พบ ADMIN_USER_ID_BOT2 ใน .env");
    }

    await client.pushMessage(targetUserId, flexMessage);

    return res.status(200).json({ message: '✅ ส่ง Flex สำเร็จแล้วครับ' });

  } catch (error) {
    console.error('❌ ส่ง Flex ล้มเหลว:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่ง Flex' });
  }
};

module.exports = { sendOrderFlex };
