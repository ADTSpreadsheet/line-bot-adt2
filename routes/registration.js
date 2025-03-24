const express = require("express");
const router = express.Router();
const { sendLineNotify } = require("../utils/lineBot");
const { insertUserRegistration } = require("../utils/database");

//
// ✅ 1. Enhanced Logging Middleware
//
const requestLogger = (req, res, next) => {
  console.log('🔍 Incoming Webhook2 Request:');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Method: ${req.method}`);
  console.log(`🔗 Path: ${req.path}`);
  console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  next();
};

//
// ✅ 2. Error Tracking Middleware
//
const errorTracker = (error, req, res, next) => {
  console.error('🚨 Detailed Error Tracking:', {
    timestamp: new Date().toISOString(),
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack,
    requestBody: req.body,
    requestHeaders: req.headers
  });
  next(error);
};

//
// ✅ 3. Main Route Handler
//
router.post("/",
  requestLogger,
  async (req, res, next) => {
    const data = req.body;

    // 🧱 Mapping to match table `user_registrations`
    const registrationData = {
      line_user_id: '',
      machine_id: data.machine_id || '',
      first_name: data.first_name,
      last_name: data.last_name,
      house_number: data.house_number,
      district: data.district,
      province: data.province,
      phone_number: data.phone_number,
      email: data.email,
      national_id: data.national_id,
      ip_address: data.ip_address,
      status: 'VERIFIED'
    };

    try {
      console.log('✅ Validated registration data received');
      console.log('📥 Sending data to Supabase:', registrationData);

      // 📡 ส่งข้อมูลพร้อมกันทั้ง Supabase และ LINE Notify
      const [supabaseResult, lineNotifyResult] = await Promise.all([
        insertUserRegistration(registrationData),
        sendLineNotify(registrationData)
      ]);

      // 🧾 แสดงผลลัพธ์จากทั้งสองฝั่ง
      console.log('📦 Supabase Result:', supabaseResult);
      console.log('📲 LINE Notify Result:', lineNotifyResult);

      // 📤 ตอบกลับ Excel VBA
      res.status(200).json({
        success: true,
        message: "Data saved and notified",
        processedData: {
          supabaseResult,
          lineNotifyResult
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

//
// ✅ 4. Global Error Handling
//
router.use(errorTracker);
router.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    errorDetails: {
      name: err.name,
      message: err.message,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
