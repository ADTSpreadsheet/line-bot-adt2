const line = require('@line/bot-sdk');

const lineBot3 = new line.Client({
  channelAccessToken: process.env.BOT3_ACCESS_TOKEN,
  channelSecret: process.env.BOT3_CHANNEL_SECRET,
});

const lineBot2 = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET,
});

const adminUserId = process.env.BOT3_TARGET_USER_ID;

// 🧩 ฟังก์ชันส่ง Flex ไปยังคุณตั้มผ่าน Bot3
async function sendFlexToTum({ slip_ref, full_name, phone_number, national_id, product_source, slip_url }) {
  const flexMessage = {
    type: "flex",
    altText: "แจ้งเตือนรายการโอนเงินใหม่",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "รายการใหม่!", weight: "bold", size: "lg" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: `ชื่อ: ${full_name}`, wrap: true },
          { type: "text", text: `เลขบัตร: ${national_id}`, wrap: true },
          { type: "text", text: `เบอร์โทร: ${phone_number}`, wrap: true },
          { type: "text", text: `สินค้า: ${product_source}`, wrap: true },
          { type: "image", url: slip_url, size: "full", aspectRatio: "1.51:1", aspectMode: "fit" }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "✅ อนุมัติ",
              data: JSON.stringify({ action: "approve", slip_ref })
            }
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "❌ ปฏิเสธ",
              data: JSON.stringify({ action: "reject", slip_ref })
            }
          }
        ]
      }
    }
  };

  await lineBot3.pushMessage(adminUserId, flexMessage);
}

// 🧩 ฟังก์ชันให้ Bot2 รายงานพี่เก่ง
async function reportFlexSentToAdmin({ full_name, national_id, phone_number, product_source, time }) {
  const report = `📣 รายงานการส่ง Flex สำเร็จแล้ว

👤 ชื่อ: ${full_name}
🆔 เลขบัตร: ${national_id}
📱 เบอร์โทร: ${phone_number}
🛒 สินค้า: ${product_source}
⏰ เวลา: ${time}

📌 สถานะ: รอการอนุมัติจาก Tumcivil`;

  await lineBot2.pushMessage(adminUserId, { type: "text", text: report });
}

module.exports = {
  lineBot3,
  lineBot2,
  adminUserId,
  sendFlexToTum,
  reportFlexSentToAdmin
};
