require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const registrationRouter = require('./routes/registration');
const { line } = require('@line/bot-sdk');

// ตรวจสอบตัวแปรที่จำเป็น
const requiredEnvVars = [
  'LINE_BOT2_ACCESS_TOKEN',
  'LINE_BOT2_CHANNEL_SECRET',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ ไม่พบตัวแปรสภาพแวดล้อม: ${envVar}`);
    process.exit(1);
  }
});

const app = express();

// LINE SDK Config สำหรับ Bot2
const lineConfig = {
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

// เปิด CORS
app.use(cors());

// Logging ทุก request
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Middleware ตรวจสอบลายเซ็นของ LINE
app.use('/webhook', (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  if (!signature || !req.body) {
    bodyParser.json({
      verify: (req, res, buf) => {
        req.rawBody = buf.toString();
      }
    })(req, res, next);
    return;
  }
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
      const hmac = crypto.createHmac('sha256', lineConfig.channelSecret)
        .update(req.rawBody)
        .digest('base64');
      if (hmac !== signature) {
        console.error('❌ Signature ไม่ถูกต้อง');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✅ Signature ถูกต้อง');
    }
  })(req, res, next);
});

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/webhook2", registrationRouter);

// Default route
app.get("/", (req, res) => {
  res.send("ADT Line Bot 2 Webhook is running.");
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook2`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] Unhandled error in main app: ${err.stack}`);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
