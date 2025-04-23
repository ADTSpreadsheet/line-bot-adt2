const { lineBot3, lineBot2, adminUserId } = require("../services/lineBot");
const { createClient } = require("@supabase/supabase-js");
const moment = require("moment");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const lineWebhook3 = async (req, res) => {
  try {
    console.log("📨 Event:", event);
    const events = req.body.events;

    for (const event of events) {
      if (event.type === "postback") {
        console.log("🔄 รับ postback แล้ว:", event.postback.data);
        const userId = event.source.userId;
        console.log("🧍‍♂️ ผู้ใช้ที่กดปุ่มคือ:", userId);
        const postData = new URLSearchParams(event.postback.data);

        const action = postData.get("action"); // approve / reject
        const slipRef = postData.get("slip_ref"); // แก้ตรงนี้

        if (!slipRef) continue;

        let status = "rejected";
        let licenseNo = null;

        if (action === "approve") {
          // ดึง license ล่าสุด
          const { data: lastLic } = await supabase
            .from("license_holders")
            .select("license_no")
            .order("license_no", { ascending: false })
            .limit(1);

          const lastNumber = lastLic?.[0]?.license_no?.split("-")[2] || "00000"; // แก้เลข index
          const nextNumber = String(Number(lastNumber) + 1).padStart(5, "0");
          licenseNo = `ADT-01-7500-${nextNumber}`;
          status = "approved";
        }

        // ดึงข้อมูลลูกค้าเพิ่มเพื่อรายงานพี่เก่ง
        const { data: slipData } = await supabase
          .from("slip_submissions")
          .select("first_name, last_name, product_source")
          .eq("slip_ref", slipRef)
          .single();

        const { first_name, last_name, product_source } = slipData;

        // อัปเดตสถานะในตาราง
        await supabase
          .from("slip_submissions")
          .update({
            submissions_status: status,
            license_no: licenseNo
          })
          .eq("slip_ref", slipRef);

        const now = moment().format("YYYY-MM-DD HH:mm");

        // ส่งข้อความกลับไปยังพี่เก่งผ่าน Bot2
        if (status === "approved") {
          const reportText =
            `🔔 TumCivil (Bot3) ได้อนุมัติคำสั่งซื้อเรียบร้อยแล้ว\n\n` +
            `✅ License Number: ${licenseNo}\n` +
            `👤 ลูกค้า: ${first_name} ${last_name}\n` +
            `🧾 สินค้า: ${product_source}\n` +
            `⏰ เวลาอนุมัติ: ${now}\n\n` +
            `ผู้ใช้สามารถเข้าสู่ขั้นตอน Verify License ต่อได้เลยครับ`;

          await lineBot2.pushMessage(adminUserId, {
            type: "text",
            text: reportText
          });
        } else {
          await lineBot2.pushMessage(adminUserId, {
            type: "text",
            text: `❌ TumCivil ปฏิเสธสลิป ${slipRef}`
          });
        }
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("🔥 LINE webhook3 error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { lineWebhook3 };
