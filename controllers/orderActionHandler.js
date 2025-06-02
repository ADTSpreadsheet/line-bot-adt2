const axios = require('axios');
const line = require('@line/bot-sdk');
require('dotenv').config();

const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const handleOrderAction = async (req, res) => {
  try {
    const { ref_code, license_no, action } = req.query;
    
    // ตรวจสอบ parameters
    if (!ref_code || !license_no || !action) {
      return res.status(400).send('❌ ข้อมูลไม่ครบ');
    }
    
    console.log(`📥 Admin กด${action === 'Ap' ? 'อนุมัติ' : 'ปฏิเสธ'}: ${ref_code}, ${license_no}`);
    
    // 🔥 ยิง POST ไป API1
    const response = await axios.post(`${process.env.API1_URL}/api/process-order`, {
      ref_code,
      license_no,
      status: action // 'Ap' หรือ 'Rj'
    });
    
    if (response.status === 200) {
      // ✅ สำเร็จ - แจ้ง Admin
      const statusText = action === 'Ap' ? 'อนุมัติ' : 'ปฏิเสธ';
      await client.pushMessage(process.env.ADMIN_USER_ID_BOT2, {
        type: 'text',
        text: `✅ ${statusText}คำสั่งซื้อสำเร็จ\n📋 License: ${license_no}\n🔖 Ref: ${ref_code}`
      });
      
      return res.status(200).send(`✅ ${statusText}สำเร็จ`);
    }
    
  } catch (error) {
    console.error('❌ ประมวลผลล้มเหลว:', error);
    
    const statusText = req.query.action === 'Ap' ? 'อนุมัติ' : 'ปฏิเสธ';
    await client.pushMessage(process.env.ADMIN_USER_ID_BOT2, {
      type: 'text',
      text: `❌ ${statusText}ล้มเหลว\n📋 License: ${req.query.license_no}\n🔖 Ref: ${req.query.ref_code}\nError: ${error.message}`
    });
    
    return res.status(500).send('❌ เกิดข้อผิดพลาด');
  }
};

module.exports = { handleOrderAction };
