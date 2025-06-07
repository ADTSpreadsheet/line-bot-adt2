const axios = require('axios');
const line = require('@line/bot-sdk');
const editAdminFlexMessage = require('./submitStarterSlip').editAdminFlexMessage;
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
        const license_no = data.get('license_no');      // สำหรับ Pro Plan
        const plan_type = data.get('plan_type');        // สำหรับ Starter Plan
        
        // แสดง log ให้ถูกต้อง
        const planInfo = license_no || plan_type || 'unknown';
        console.log(`📥 TumCivil Admin กด${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}: ${ref_code}, ${planInfo}`);
        
        if (action === 'approve' || action === 'reject') {
          try {
            // เรียก API1 processOrder (endpoint เดียวสำหรับทุก plan)
            const requestBody = {
              ref_code,
              action,
              license_no,    // จะเป็น null สำหรับ Starter Plan
              plan_type      // จะเป็น null สำหรับ Pro Plan
            };

            console.log('📤 กำลังเรียก API1 processOrder:', requestBody);

            const response = await axios.post(`https://line-bot-adt.onrender.com/processOrder`, requestBody);
            
            if (response.status === 200) {
              const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
              const planName = plan_type ? 'Starter' : 'Professional';
              
              // 🎨 แก้ไข Flex Message ของ Admin (เฉพาะ Starter Plan)
              if (plan_type === 'starter') {
                try {
                  console.log('🎨 กำลังแก้ไข Flex Message ของ Admin...');
                  await editAdminFlexMessage({
                    body: { 
                      ref_code, 
                      action: action === 'approve' ? 'approved' : 'rejected',
                      duration: 1 // Starter Plan = 1 วัน (ปรับตามจริง)
                    }
                  });
                  console.log('✅ แก้ไข Flex Message ของ Admin สำเร็จ');
                } catch (flexError) {
                  console.error('⚠️ ไม่สามารถแก้ไข Flex Message ได้:', flexError.message);
                  // ไม่ throw error เพราะการประมวลผลหลักสำเร็จแล้ว
                }
              }
              
              await client.replyMessage(event.replyToken, {
                type: 'text',
                text: `✅ TumCivil ${actionText}คำสั่งซื้อสำเร็จ\n📦 แพคเกจ: ${planName} Plan\n🔖 Ref: ${ref_code}\n🏢 ดำเนินการโดย: TumCivil Admin`
              });
              
              console.log('✅ TumCivil ประมวลผลสำเร็จ');
              return res.status(200).json({ message: 'TumCivil Success' });
            }
            
          } catch (apiError) {
            console.error('❌ TumCivil API Error:', apiError.response?.data || apiError.message);
            
            // Handle API errors specifically
            if (apiError.response && apiError.response.status === 400) {
              // Duplicate Error - ส่งข้อความแล้วตอบ 400 (ไม่ retry)
              const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
              const errorMessage = `⚠️ หมายเลข Ref.Code ${ref_code}\nคุณได้ทำการ${actionText}ไปแล้ว`;
              
              await client.replyMessage(event.replyToken, {
                type: 'text',
                text: errorMessage
              });
              
              return res.status(400).json({ message: 'Duplicate request handled' });
              
            } else if (apiError.response && apiError.response.status === 404) {
              // API1 ไม่พบ endpoint
              const errorMessage = `❌ TumCivil ระบบขัดข้อง\nไม่พบ endpoint ที่ต้องการ\n🔧 กรุณาติดต่อทีมพัฒนา`;
              
              await client.replyMessage(event.replyToken, {
                type: 'text',
                text: errorMessage
              });
              
              return res.status(500).json({ error: 'API endpoint not found' });
              
            } else {
              // Error อื่นๆ - ส่งข้อความแล้วตอบ 500 (อาจ retry)
              const errorMessage = `❌ TumCivil ระบบขัดข้อง\nError: ${apiError.message}\n🔧 กรุณาติดต่อทีมพัฒนา`;
              
              await client.replyMessage(event.replyToken, {
                type: 'text',
                text: errorMessage
              });
              
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
    res.status(500).json({ error: error.message });
  }
};

module.exports = { handleTumcivilWebhook };
