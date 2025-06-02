const axios = require('axios');
const line = require('@line/bot-sdk');
require('dotenv').config();

const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const handleOrderAction = async (req, res) => {
  try {
    const { ref_code, license_no, action } = req.query;
    
    console.log(`📥 Admin กด${action === 'Ap' ? 'อนุมัติ' : 'ปฏิเสธ'}: ${ref_code}, ${license_no}`);
    
    // 🔥 ยิง POST ไป API1
    const response = await axios.post(`${process.env.API1_URL}/api/process-order`, {
      ref_code,
      license_no,
      status: action
    });
    
    if (response.status === 200) {
      const statusText = action === 'Ap' ? 'อนุมัติ' : 'ปฏิเสธ';
      await client.pushMessage(process.env.ADMIN_USER_ID_BOT2, {
        type: 'text',
        text: `✅ ${statusText}คำสั่งซื้อสำเร็จ\n📋 License: ${license_no}\n🔖 Ref: ${ref_code}`
      });
      
      return res.status(200).send(`✅ ${statusText}สำเร็จ`);
    }
    
  } catch (error) {
    console.error('❌ ประมวลผลล้มเหลว:', error);
    return res.status(500).send('❌ เกิดข้อผิดพลาด');
  }
};

module.exports = { handleOrderAction };
