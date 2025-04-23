const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabaseClient");
const { getNextSlipNumber } = require("../services/slipNumberService");
const { sendFlexToTum, reportFlexSentToAdmin } = require("../services/lineBot");

const handleSlipSubmission = async (req, res) => {
  try {
    console.log("✅ STEP 0: Start slip submission");

    const {
      first_name,
      last_name,
      national_id,
      phone_number,
      product_source,
      file_name,
      file_content
    } = req.body;

    console.log("📦 Data received:", { first_name, last_name, national_id, phone_number, product_source });
    console.log("🧾 file_content length:", file_content.length);

    if (!file_content) {
      return res.status(400).json({ error: "Slip image file content is required." });
    }

    // STEP 1: Gen SlipRef + file name
    const slipNo = await getNextSlipNumber();
    const slipRef = `SLP-${slipNo}`;
    const productSource = product_source.split("/").pop().split(".")[0];
    const fileName = `${Source}-SLP-${slipNo}.jpg`;
    console.log("🆔 SlipRef:", slipRef);

    // STEP 2: Convert base64 to buffer and upload
    let base64Data = file_content;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    console.log("📤 Uploading image to Supabase...");

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("adtpayslip")
      .upload(fileName, fileBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return res.status(500).json({ error: "Failed to upload image", details: uploadError.message });
    }

    console.log("✅ Upload complete:", uploadData);

    // STEP 3: Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from("adtpayslip")
      .getPublicUrl(fileName);

    console.log("🌐 Public URL:", publicUrl);

    // STEP 4: Insert DB
    const { error: insertError } = await supabase
      .from("slip_submissions")
      .insert([{
        slip_ref: slipRef,
        first_name,
        last_name,
        national_id,
        phone_number,
        _source: Source,
        slip_image_url: publicUrl,
        submissions_status: "pending"
      }]);

    if (insertError) {
      console.error("❌ DB insert error:", insertError);
      return res.status(500).json({ error: "Failed to insert into database", details: insertError.message });
    }

    // ✅ STEP 5.0: Map _source → _name
    const { data: Row, error: lookupError } = await supabase
      .from("product_Data_Base")
      .select("product_name")
      .eq("product_code", productSource)
      .single();

    if (lookupError || !productRow) {
      console.error("❌ Product name lookup failed:", lookupError);
      return res.status(500).json({ error: "Product not found" });
    }

    const productName = productRow.product_name;
    console.log("🔎 Found product name:", productName);

    // STEP 5.1: ส่ง Flex + รายงาน Bot2
    console.log("📤 Sending Flex to Tum...");
    await sendFlexToTum({
      slip_ref: slipRef,
      full_name: `${first_name} ${last_name}`,
      phone_number,
      national_id,
      product_name: productName,
      slip_url: publicUrl
    });

    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    await reportFlexSentToAdmin({
      full_name: `${first_name} ${last_name}`,
      national_id,
      phone_number,
      product_name: productName,
      time: now
    });

    // STEP 6: ตอบกลับ VBA
    console.log("✅ All done!");
    return res.status(200).json({
      message: "Slip uploaded and Flex sent",
      slip_ref: slipRef
    });

  } catch (err) {
    console.error("🔥 Uncaught error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

module.exports = { handleSlipSubmission };
