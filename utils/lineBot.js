const axios = require("axios");
const { lineBot2, adminUserId } = require("../config");

async function sendLineNotify(data) {
 console.log('📱 Preparing Line Notify:', JSON.stringify(data, null, 2));

 try {
   const message = `
🟢 ผู้ลงทะเบียนสำเร็จรายใหม่
👤 ชื่อ: ${data.fullname}
🏠 ที่อยู่: ${data.address}
📞 เบอร์โทร: ${data.phone}
📧 อีเมล: ${data.email}
🆔 บัตร ปชช: ${data.citizen_id}
💻 MID: ${data.machine_id}
🌐 IP: ${data.ip_address}
⏰ เวลา: ${data.timestamp}
   `.trim();

   const response = await axios.post(
     "https://api.line.me/v2/bot/message/push", 
     {
       to: adminUserId,
       messages: [{ type: "text", text: message }],
     }, 
     {
       headers: {
         Authorization: `Bearer ${lineBot2.accessToken}`,
         "Content-Type": "application/json",
       },
     }
   );

   console.log('✅ Line Notify Sent Successfully');
   return response.data;
 } catch (error) {
   console.error('❌ Line Notify Error:', {
     errorMessage: error.message,
     errorResponse: error.response ? error.response.data : 'No response',
     requestData: data
   });
   throw error;
 }
}

module.exports = { sendLineNotify };
