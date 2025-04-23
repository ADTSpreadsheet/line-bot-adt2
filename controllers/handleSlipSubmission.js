const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabaseClient");
const { getNextSlipNumber } = require("../services/slipNumberService");
const { sendFlexToTum } = require("../services/lineBot");

const handleSlipSubmission = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      national_id,
      phone_number,
      product_source,
      slip_path // local file path เช่น "D:\\ADT\\slips\\slip001.jpg"
    } = req.body;

    if (!fs.existsSync(slip_path)) {
      return res.status(400).json({ error: "Slip image file not found." });
    }

    // 1️⃣ รันหมายเลข Slip ใหม่
    const slipNo = await getNextSlipNumber(); // เช่น "0007"
    const slipRef = `SLP-${slipNo}`;
    const fileName = `${product_source}-SLP-${slipNo}.jpg`;

    // 2️⃣ อ่านภาพจาก path แล้ว upload ไป storage
    const fileBuffer = fs.readFileSync(slip_path);

    const { error: uploadError } = await supabase.storage
      .from("adtpayslip")
      .upload(fileName, fileBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: "Failed to upload image", details: uploadError });
    }

    // 3️⃣ Get public URL ของภาพ
    const { data: { publicUrl } } = supabase
      .storage
      .from("adtpayslip")
      .getPublicUrl(fileName);

    // 4️⃣ Insert ข้อมูลลงฐาน
    const { error: insertError } = await supabase
      .from("slip_submissions")
      .insert([{
        slip_ref: slipRef,
        first_name,
        last_name,
        national_id,
        phone_number,
        product_source,
        slip_image_url: publicUrl,
        submissions_status: "pending"
      }]);

    if (insertError) {
      return res.status(500).json({ error: "Failed to insert into database", details: insertError });
    }

    // 5️⃣ ส่ง Flex ไปคุณตั้ม
    await sendFlexToTum({
      slip_ref: slipRef,
      full_name: `${first_name} ${last_name}`,
      phone_number,
      national_id,
      product_source,
      slip_url: publicUrl
    });

    // 6️⃣ ตอบกลับให้ VBA
    return res.status(200).json({
      message: "Slip uploaded successfully",
      slip_ref: slipRef
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { handleSlipSubmission };
