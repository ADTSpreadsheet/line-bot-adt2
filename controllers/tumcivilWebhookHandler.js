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
      // เช็ค Redelivery - ข้าม request ที่เป็น retry
      if (event.deliveryContext?.isRedelivery) {
        console.log('⚠️ ข้าม Redelivery Request');
        continue;
      }
      
      if (event.type === 'postback') {
        const data = new URLSearchParams(event.postback.data);
        const action = data.get('action');
        const ref_code = data.get('ref_code');
        const license_no = data.get('license_no');
        
        console.log(`📥 TumCivil Admin กด${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}: ${ref_code}, ${license_no}`);
        
        if (action === 'approve' || action === 'reject') {
          const status = action === 'approve' ? 'Ap' : 'Rj';
          
          try {
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
              
              // ส่งข้อความสำเร็จแล้ว ตอบ 200
              return res.status(200).json({ message: 'TumCivil Success' });
            }
            
          } catch (apiError) {
            // Handle API errors specifically
            if (apiError.response && apiError.response.status === 400) {
              // Duplicate Error - ส่งข้อความแล้วตอบ 400 (ไม่ retry)
              const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
              const errorMessage = `⚠️ หมายเลข Ref.Code ${ref_code}\nคุณได้ทำการ${actionText}ไปแล้ว`;
              
              await client.replyMessage(event.replyToken, {
                type: 'text',
                text: errorMessage
              });
              
              // ตอบ 400 เพื่อไม่ให้ retry
              return res.status(400).json({ message: 'Duplicate request handled' });
            } else {
              // Error อื่นๆ - ส่งข้อความแล้วตอบ 500 (อาจ retry)
              const errorMessage = `❌ TumCivil ระบบขัดข้อง\nError: ${apiError.message}\n🔧 กรุณาติดต่อทีมพัฒนา`;
              
              await client.replyMessage(event.replyToken, {
                type: 'text',
                text: errorMessage
              });
              
              // ตอบ 500 เพื่อให้ LINE อาจ retry ได้
              return res.status(500).json({ error: apiError.message });
            }
          }
        }
      }
    }
    
    // ไม่มี postback หรือ action ที่รองรับ
    res.status(200).json({ message: 'No action processed' });
    
  } catch (error) {
    console.error('❌ TumCivil Webhook error:', error);
    // Error ระดับ function - ตอบ 500
    res.status(500).json({ error: error.message });
  }
};

module.exports = { handleTumcivilWebhook };
