const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const line = require('@line/bot-sdk');
const registrationRouter = require("./routes/registration");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// LINE Bot Configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

// ตรวจสอบ Configuration
if (!lineConfig.channelAccessToken || !lineConfig.channelSecret) {
  console.error('❌ Missing LINE Bot Configuration');
  process.exit(1);
}

const lineClient = new line.Client(lineConfig);

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

// LINE Webhook Middleware
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing webhook:', err);
      res.status(500).end();
    });
});

// ฟังก์ชันจัดการ event จาก LINE
async function handleEvent(event) {
  console.log('Received LINE event:', event);
  
  // จัดการ event ตามประเภท
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

app.listen(PORT, () => {
  console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook2`);
});
