require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const registrationRouter = require('./routes/registration');
const line = require('@line/bot-sdk');

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
const lineClient = new line.Client(lineConfig);

// เปิด CORS
app.use(cors());

// Logging ทุก request
app.use((req, res, next) => {
 console.log(`[DEBUG] Incoming request: ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
 next();
});

// Body Parser
app.use(bodyParser.json({
 verify: (req, res, buf) => {
   req.rawBody = buf.toString();
 }
}));

// LINE Webhook Route
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
 Promise
   .all(req.body.events.map(handleEvent))
   .then((result) => res.json(result))
   .catch((err) => {
     console.error('Error processing webhook:', err);
     res.status(500).end();
   });
});

// ฟังก์ชันจัดการ event
async function handleEvent(event) {
 console.log('Received LINE event:', event);
 
 switch (event.type) {
   case 'message':
     return handleMessageEvent(event);
   case 'follow':
     return handleFollowEvent(event);
   default:
     return Promise.resolve(null);
 }
}

function handleMessageEvent(event) {
 const message = event.message;
 console.log('Message event:', message);
 
 // ตอบกลับข้อความ
 return lineClient.replyMessage(event.replyToken, {
   type: 'text',
   text: `ได้รับข้อความ: ${message.text}`
 });
}

function handleFollowEvent(event) {
 console.log('User followed:', event.source.userId);
 return Promise.resolve(null);
}

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
 console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook`);
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
