const axios = require("axios");
const { lineBot2, adminUserId } = require("../config");

async function sendLineNotify(data) {
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

  await axios.post("https://api.line.me/v2/bot/message/push", {
    to: adminUserId,
    messages: [{ type: "text", text: message }],
  }, {
    headers: {
      Authorization: `Bearer ${lineBot2.accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

module.exports = { sendLineNotify };
