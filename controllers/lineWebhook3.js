const { lineBot3, lineBot2, adminUserIdBot2 } = require("../services/lineBot");
const { createClient } = require("@supabase/supabase-js");
const moment = require("moment");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const lineWebhook3 = async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === "postback") {
        const userId = event.source.userId;
        const postData = new URLSearchParams(event.postback.data);

        const action = postData.get("action"); // approve / reject
        const slipRef = postData.get("ref");

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

          const lastNumber = lastLic?.[0]?.license_no?.split("-")[1] || "00000";
          const nextNumber = String(Number(lastNumber) + 1).padStart(5, "0");
          licenseNo = `ADT-01-7500-${nextNumber}`;
          status = "approved";
        }

        // ดึงข้อมูลลูกค้าเพิ่มเพื่อรายงานพี่เก่ง
        const { data: slipData } = await supabase
          .from("slip_submissions")
          .select("first_name, last_name, product_name")
          .eq("slip_ref", slipRef)
          .single();

        // อัปเดตสถานะในตาราง
        await supabase
          .from("slip_submissions")
          .update({
            submissions_status: status,
            license_no: licenseNo
          })
          .eq("slip_ref", slipRef);

        // ถ้าอนุมัติ → ส่งข้อความธรรมดาไปหาพี่เก่งผ่าน Bot2
        if (status === "approved") {
          const { first_name, last_name, product_name } = slipData;

          const reportText =
            `🔔 TumCivil (Bot3) ได้ทำการอนุมัติการสั่งซื้อเรียบร้อยแล้ว\n\n` +
            `✅ License Number: ${licenseNo}\n` +
            `👤 ชื่อลูกค้า: ${first_name} ${last_name}\n` +
            `🧾 รายการสินค้า: ${product_name}\n` +
            `⏰ เวลาอนุมัติ: ${moment().format("YYYY-MM-DD HH:mm")}\n\n` +
            `ผู้ใช้สามารถไปดำเนินการ Verify License ต่อได้เลยครับ 💼`;

          await lineBot2.pushMessage(adminUserIdBot2, {
            type: "text",
            text: reportText
          });
        }

        // ถ้าปฏิเสธ ก็ส่งข้อความแจ้งเช่นกัน
        if (status === "rejected") {
          await lineBot2.pushMessage(adminUserIdBot2, {
            type: "text",
            text: `❌ TumCivil ปฏิเสธสลิป ${slipRef}`
          });
        }
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("LINE webhook3 error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { lineWebhook3 };
