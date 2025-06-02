const axios = require('axios');
const line = require('@line/bot-sdk');
require('dotenv').config();

const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const handleTumcivilWebhook = async (req, res) => {
  try {
    const events = req.body.events;
    
    for (const event of events) {
      if (event.type === 'postback') {
        const data = new URLSearchParams(event.postback.data);
        const action = data.get('action');
        const ref_code = data.get('ref_code');
        const license_no = data.get('license_no');
        
        console.log(`📥 TumCivil Admin กด${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}: ${ref_code}, ${license_no}`);
        
        if (action === 'approve' || action === 'reject') {
          const status = action === 'approve' ? 'Ap' : 'Rj';
          
          // ยิง POST ไป API1
          const response = await axios.post(`https://line-bot-adt.onrender.com/${action}-order`, {
            ref_code,
            license_no,
            status
          });
          
          if (response.status === 200) {
            const statusText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `✅ TumCivil ${statusText}คำสั่งซื้อสำเร็จ\n📋 License: ${license_no}\n🔖 Ref: ${ref_code}\n🏢 ดำเนินการโดย: TumCivil Admin`
            });
          }
        }
      }
    }
    
    res.status(200).json({ message: 'TumCivil Webhook OK' });
    
  } catch (error) {
    console.error('❌ TumCivil Webhook error:', error);
    
    // แจ้งข้อผิดพลาดกลับไปยัง Admin
    if (req.body.events && req.body.events[0]) {
      
      // ตรวจสอบว่าเป็น Duplicate Error ไหม
      let errorMessage = `❌ TumCivil ระบบขัดข้อง\nError: ${error.message}\n🔧 กรุณาติดต่อทีมพัฒนา`;
      
      if (error.response && error.response.status === 400) {
        // Extract ref_code from error message or postback data
        const event = req.body.events[0];
        const data = new URLSearchParams(event.postback.data);
        const ref_code = data.get('ref_code');
        const action = data.get('action');
        const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
        
        errorMessage = `⚠️ หมายเลข Ref.Code ${ref_code}\nคุณได้ทำการ${actionText}ไปแล้ว`;
      }
      
      await client.replyMessage(req.body.events[0].replyToken, {
        type: 'text',
        text: errorMessage
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

module.exports = { handleTumcivilWebhook };
