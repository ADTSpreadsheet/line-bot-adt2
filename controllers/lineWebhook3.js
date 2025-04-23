const { lineBot3, lineBot2, adminUserId } = require("../config");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const lineWebhook3 = async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      // ตรวจสอบว่าเป็น postback (จากปุ่มกดใน Flex)
      if (event.type === "postback") {
        const userId = event.source.userId;
        const postData = new URLSearchParams(event.postback.data);

        const action = postData.get("action"); // "approve" หรือ "reject"
        const slipRef = postData.get("ref");   // เช่น SLP-00025

        if (!slipRef) continue;

        // ตั้งค่าพื้นฐาน
        let status = "rejected";
        let licenseNo = null;

        // ถ้าอนุมัติ ให้รันเลข License ใหม่
        if (action === "approve") {
          // 🔢 ดึง license ล่าสุดแล้วเพิ่ม 1
          const { data: last, error } = await supabase
            .from("license_holders")
            .select("license_no")
            .order("license_no", { ascending: false })
            .limit(1);

          const lastNo = last?.[0]?.license_no?.split("-")?.[1] || "0000";
          const nextNo = String(Number(lastNo) + 1).padStart(5, "0");
          licenseNo = `LIC-${nextNo}`;
          status = "approved";
        }

        // 🔄 อัปเดต slip_submissions
        const { error: updateError } = await supabase
          .from("slip_submissions")
          .update({
            submissions_status: status,
            license_no: licenseNo,
          })
          .eq("slip_ref", slipRef);

        if (updateError) {
          console.error("Update DB error:", updateError);
        }

        // 🔔 ส่งข้อความรายงานพี่เก่งผ่าน Bot2
        let message = "";

        if (status === "approved") {
          message = `✅ คุณตั้มอนุมัติสลิป ${slipRef}\nLicense No: ${licenseNo}`;
        } else {
          message = `❌ คุณตั้มปฏิเสธสลิป ${slipRef}`;
        }

        await axios.post("https://api.line.me/v2/bot/message/push", {
          to: adminUserId,
          messages: [
            {
              type: "text",
              text: message,
            },
          ],
        }, {
          headers: {
            Authorization: `Bearer ${lineBot2.accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    }

    return res.status(200).send("OK");

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};

module.exports = { lineWebhook3 };
