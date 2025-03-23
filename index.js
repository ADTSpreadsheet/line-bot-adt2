const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const registrationRouter = require("./routes/registration");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware logging ละเอียด
app.use((req, res, next) => {
 console.log('🔍 Incoming Request:');
 console.log(`Method: ${req.method}`);
 console.log(`Path: ${req.path}`);
 console.log('Headers:', req.headers);
 console.log('Body:', req.body);
 
 // Capture start time for request duration
 req.startTime = Date.now();
 next();
});

// Error handling middleware
app.use((err, req, res, next) => {
 console.error('🚨 Unhandled Error:', err);
 res.status(500).json({ 
   success: false, 
   message: 'Unexpected server error' 
 });
});

// Response logging middleware
app.use((req, res, next) => {
 const originalJson = res.json;
 res.json = function(body) {
   console.log('📤 Response:', {
     status: res.statusCode,
     body: body,
     duration: Date.now() - req.startTime + 'ms'
   });
   originalJson.call(this, body);
 };
 next();
});

app.use(bodyParser.json());

// Routes
app.use("/webhook2", registrationRouter);

// Default route
app.get("/", (req, res) => {
 res.send("ADT Line Bot 2 Webhook is running.");
});

app.listen(PORT, () => {
 console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
 console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook2`);
});
