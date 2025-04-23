const express = require("express");
const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabaseClient");
const { getNextSlipNumber } = require("../services/slipNumberService");
const { sendFlexToTum } = require("../services/lineBot");
const bodyParser = require("body-parser");

// สร้าง Express app หรือ Router
const router = express.Router();

// เพิ่ม limit สำหรับการรับข้อมูล JSON ขนาดใหญ่
router.use(bodyParser.json({ limit: '50mb' }));
router.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// route สำหรับรับข้อมูลการอัพโหลดสลิป
router.post("/submit", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      national_id,
      phone_number,
      product_source,
      file_name,       // ชื่อไฟล์เดิมจากลูกค้า
      file_content     // base64 string ของรูปภาพ
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!file_content) {
      return res.status(400).json({ error: "Slip image file content is required." });
    }

    // 1️⃣ รันหมายเลข Slip ใหม่
    const slipNo = await getNextSlipNumber(); // เช่น "0007"
    const slipRef = `SLP-${slipNo}`;
    const fileName = `${product_source}-SLP-${slipNo}.jpg`;

    // 2️⃣ แปลง base64 เป็น buffer และอัพโหลดไป storage
    // ตัด prefix base64 ออกถ้ามี (เช่น data:image/jpeg;base64,)
    let base64Data = file_content;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');

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
});

module.exports = router;
