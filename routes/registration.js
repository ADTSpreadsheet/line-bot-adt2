const express = require("express");
const router = express.Router();
const { sendLineNotify } = require("../utils/lineBot");
const { insertToSupabase } = require("../utils/database");
const { isValidRegistration } = require("../utils/validation");

router.post("/", async (req, res) => {
 console.log('📥 Incoming Webhook2 Request:');
 console.log('Request Body:', JSON.stringify(req.body, null, 2));
 
 const data = req.body;
 
 try {
   // Validate registration data
   if (!isValidRegistration(data)) {
     console.warn('❌ Invalid registration data:', data);
     return res.status(400).json({ 
       success: false, 
       message: "Invalid data format.",
       receivedData: data 
     });
   }

   // Log data before processing
   console.log('✅ Valid registration data received');
   
   // Insert to Supabase
   const supabaseResult = await insertToSupabase(data);
   console.log('💾 Supabase Insertion Result:', supabaseResult);

   // Send Line Notify
   const lineNotifyResult = await sendLineNotify(data);
   console.log('📱 Line Notify Result:', lineNotifyResult);

   // Successful response
   res.status(200).json({ 
     success: true, 
     message: "Data saved and notified.",
     processedData: data 
   });

 } catch (error) {
   console.error("🚨 Error in /webhook2:", {
     errorMessage: error.message,
     errorStack: error.stack,
     receivedData: data
   });

   res.status(500).json({ 
     success: false, 
     message: "Internal server error.",
     errorDetails: error.message 
   });
 }
});

module.exports = router;
