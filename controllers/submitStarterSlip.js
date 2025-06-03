const { supabase } = require('../utils/supabaseClient');
const { client } = require('../utils/lineClient'); // LINE SDK (Bot2)

const submitStarterSlip = async (req, res) => {
  try {
    const { ref_code, duration } = req.body;

    // ✅ Logic 1: ค้นหา ref_code ใน starter_plan_users
    const { data, error } = await supabase
      .from('starter_plan_users')
      .select('first_name, last_name, phone_number, national_id, slip_image_url')
      .eq('ref_code', ref_code)
      .single();

    if (error || !data) {
      console.error("❌ ไม่พบข้อมูลใน starter_plan_users:", error);
      return res.status(404).json({ message: 'ไม่พบข้อมูล ref_code นี้' });
    }

    const {
      first_name,
      last_name,
      phone_number,
      national_id,
      slip_image_url
    } = data;

    const full_name = `${first_name} ${last_name}`;

    // ✅ Logic 2: สร้าง Flex Message และส่งหาผู้ดูแล (Bot2)
    const flexMessage = {
      type: "flex",
      altText: "แจ้งเตือนคำสั่งซื้อใหม่",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "แจ้งเตือนคำสั่งซื้อใหม่",
              size: "lg",
              weight: "bold",
              color: "#007BFF"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: `ชื่อ: ${full_name}`,
              wrap: true
            },
            {
              type: "text",
              text: `เบอร์: ${phone_number}`,
              wrap: true
            },
            {
              type: "text",
              text: `เลขบัตร: ${national_id}`,
              wrap: true
            },
            {
              type: "text",
              text: `ใช้งานโปรแกรม: ${duration} วัน`,
              wrap: true
            },
            {
              type: "text",
              text: `Ref: ${ref_code}`,
              wrap: true
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "ดูสลิปการโอน",
                uri: slip_image_url
              },
              style: "primary"
            }
          ]
        }
      }
    };

    // ✅ ส่ง Flex ไปที่ LINE Admin
    await client.pushMessage(process.env.BOT2_LINE_USER_ID, flexMessage);

    return res.status(200).json({ message: 'ส่ง Flex สำเร็จแล้ว' });

  } catch (err) {
    console.error("❌ ERROR @ submitStarterSlip:", err);
    return res.status(500).json({ message: 'ระบบมีปัญหา', error: err.message });
  }
};

module.exports = submitStarterSlip;
