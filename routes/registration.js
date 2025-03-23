const express = require("express");
const router = express.Router();
const { sendLineNotify } = require("../utils/lineBot");
const { insertToSupabase } = require("../utils/database");
const { isValidRegistration } = require("../utils/validation");

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

// Comprehensive validation middleware
const strictValidation = (req, res, next) => {
 const data = req.body;
 const validationResults = {
   missingFields: [],
   invalidFields: []
 };

 // Check for required fields
 const requiredFields = [
   'fullname', 'address', 'phone', 
   'email', 'citizen_id', 'machine_id', 
   'ip_address', 'timestamp'
 ];

 requiredFields.forEach(field => {
   if (!data[field]) {
     validationResults.missingFields.push(field);
   }
 });

 // Additional format validations
 const validations = [
   { 
     field: 'phone', 
     regex: /^0\d{9}$/, 
     error: 'Invalid phone number format' 
   },
   { 
     field: 'email', 
     regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
     error: 'Invalid email format' 
   },
   { 
     field: 'citizen_id', 
     regex: /^\d{13}$/, 
     error: 'Invalid citizen ID format' 
   }
 ];

 validations.forEach(validation => {
   if (data[validation.field] && !validation.regex.test(data[validation.field])) {
     validationResults.invalidFields.push({
       field: validation.field,
       error: validation.error
     });
   }
 });

 if (validationResults.missingFields.length > 0 || validationResults.invalidFields.length > 0) {
   console.warn('❌ Validation Failed:', validationResults);
   return res.status(400).json({ 
     success: false, 
     message: "Invalid data format",
     details: validationResults,
     receivedData: data 
   });
 }

 next();
};

// Main route handler with comprehensive error handling
router.post("/", 
 requestLogger,
 strictValidation,
 async (req, res, next) => {
   const data = req.body;
   
   try {
     console.log('✅ Validated registration data received');
     
     // Parallel processing with timeout
     const processingStart = Date.now();
     const [supabaseResult, lineNotifyResult] = await Promise.all([
       insertToSupabase(data),
       sendLineNotify(data)
     ]);
     const processingTime = Date.now() - processingStart;

     console.log('💾 Supabase Insertion Result:', supabaseResult);
     console.log('📱 Line Notify Result:', lineNotifyResult);
     console.log(`⏱️ Total Processing Time: ${processingTime}ms`);

     res.status(200).json({ 
       success: true, 
       message: "Data saved and notified",
       processingTime,
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
