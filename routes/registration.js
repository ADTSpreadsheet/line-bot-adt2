const express = require("express");
const router = express.Router();
const { sendLineNotify } = require("../utils/lineBot");
const { insertUserRegistration } = require("../utils/database");

// Enhanced logging middleware
const requestLogger = (req, res, next) => {
  console.log('🔍 Incoming Webhook2 Request:');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Method: ${req.method}`);
  console.log(`🔗 Path: ${req.path}`);
  console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  next();
};

// Error tracking middleware
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

// Main route handler
router.post("/",
  requestLogger,
  async (req, res, next) => {
    const data = req.body;

    // Mapping fields to match table structure in user_registrations
    const registrationData = {
      line_user_id: '', // Optional, can be updated later if available
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

      const [supabaseResult, lineNotifyResult] = await Promise.all([
        insertUserRegistration(registrationData),
        sendLineNotify(registrationData)
      ]);

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

// Global error handler
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
