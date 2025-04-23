const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabaseClient");
const { getNextSlipNumber } = require("../services/slipNumberService");
const { sendFlexToTum } = require("../services/lineBot");

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

    // STEP 1
    const slipNo = await getNextSlipNumber();
    const slipRef = `SLP-${slipNo}`;
    const productCode = product_source.split("/").pop().split(".")[0];
    const fileName = `${productCode}-SLP-${slipNo}.jpg`;
    console.log("🆔 SlipRef:", slipRef);

    // STEP 2
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

    // STEP 3
    const { data: { publicUrl } } = supabase
      .storage
      .from("adtpayslip")
      .getPublicUrl(fileName);

    console.log("🌐 Public URL:", publicUrl);

    // STEP 4
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
      console.error("❌ DB insert error:", insertError);
      return res.status(500).json({ error: "Failed to insert into database", details: insertError.message });
    }

    // STEP 5
    console.log("📤 Sending Flex to Tum...");
    await sendFlexToTum({
      slip_ref: slipRef,
      full_name: `${first_name} ${last_name}`,
      phone_number,
      national_id,
      product_source,
      slip_url: publicUrl
    });

    console.log("✅ All done!");
    return res.status(200).json({
      message: "Slip uploaded successfully",
      slip_ref: slipRef
    });

  } catch (err) {
    console.error("🔥 Uncaught error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};


module.exports = { handleSlipSubmission };
