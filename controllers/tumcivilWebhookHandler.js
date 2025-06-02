const axios = require('axios');
const line = require('@line/bot-sdk');
require('dotenv').config();

const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN
});

const handleTumcivilWebhook = async (req, res) => {
  console.log('🔥🔥🔥 WEBHOOK ได้รับข้อมูล:', JSON.stringify(req.body, null, 2));
  console.log('🔥🔥🔥 REQUEST HEADERS:', JSON.stringify(req.headers, null, 2));
  
  try {
    const events = req.body.events;
    console.log('📋📋📋 EVENTS:', events);
    
    if (!events || events.length === 0) {
      console.log('❌ ไม่มี events');
      return res.status(200).json({ message: 'No events' });
    }
    
    for (const event of events) {
      console.log('🎯 EVENT TYPE:', event.type);
      console.log('🎯 EVENT:', JSON.stringify(event, null, 2));
      
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
      await client.replyMessage(req.body.events[0].replyToken, {
        type: 'text',
        text: `❌ TumCivil ระบบขัดข้อง\nError: ${error.message}\n🔧 กรุณาติดต่อทีมพัฒนา`
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

module.exports = { handleTumcivilWebhook };
