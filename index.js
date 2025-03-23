require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const registrationRouter = require('./routes/registration');
const line = require('@line/bot-sdk');

// ตรวจสอบและ Log ตัวแปรสภาพแวดล้อม
const requiredEnvVars = [
  'LINE_BOT2_ACCESS_TOKEN',
  'LINE_BOT2_CHANNEL_SECRET',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing environment variable: ${envVar}`);
    process.exit(1);
  } else {
    console.log(`✅ Environment variable loaded: ${envVar}`);
  }
});

const app = express();

// LINE SDK Configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

const lineClient = new line.Client(lineConfig); // ✅ เพิ่มตรงนี้ให้เรียบร้อย

// Logging Middleware
const loggingMiddleware = (req, res, next) => {
  const requestStartTime = Date.now();
  console.log('🔍 Incoming Request Details:');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Method: ${req.method}`);
  console.log(`🔗 Path: ${req.url}`);
  console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));

  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });

  req.on('end', () => {
    try {
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};
      console.log('📦 Request Body:', JSON.stringify(parsedBody, null, 2));
    } catch (error) {
      console.error('❌ Error parsing request body:', error);
    }
  });

  const originalJson = res.json;
  res.json = function(body) {
    const responseTime = Date.now() - requestStartTime;
    console.log('📤 Response Details:');
    console.log(`⏱️ Response Time: ${responseTime}ms`);
    console.log('📦 Response Body:', JSON.stringify(body, null, 2));
    originalJson.call(this, body);
  };

  next();
};

// Error Handling
const errorHandlingMiddleware = (err, req, res, next) => {
  console.error('🚨 Unhandled Error:');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);

  res.status(500).json({
    success: false,
    error: {
      name: err.name,
      message: err.message,
      timestamp: new Date().toISOString()
    }
  });
};

// LINE Signature Validation
const signatureValidationMiddleware = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  if (!signature) {
    console.warn('⚠️ Missing LINE Signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const rawBody = req.rawBody || '';
  const hmac = crypto
    .createHmac('sha256', lineConfig.channelSecret)
    .update(rawBody)
    .digest('base64');

  if (hmac !== signature) {
    console.error('❌ Invalid LINE Signature');
    console.error('Expected Signature:', hmac);
    console.error('Received Signature:', signature);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('✅ Signature Validated Successfully');
  next();
};

// Middleware Setup
app.use(cors());
app.use(loggingMiddleware);
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// LINE Webhook
app.post('/webhook',
  signatureValidationMiddleware,
  line.middleware(lineConfig),
  (req, res) => {
    console.log('🤖 Processing LINE Webhook Event');

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => {
        console.log('✅ All events processed successfully');
        res.json(result);
      })
      .catch((err) => {
        console.error('❌ Error processing webhook events:', err);
        res.status(500).json({
          error: 'Webhook event processing failed',
          details: err.message
        });
      });
  }
);

// Event Handler
async function handleEvent(event) {
  console.log('📨 Received LINE Event:', JSON.stringify(event, null, 2));

  try {
    switch (event.type) {
      case 'message':
        return await handleMessageEvent(event);
      case 'follow':
        return await handleFollowEvent(event);
      case 'unfollow':
        return await handleUnfollowEvent(event);
      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
        return Promise.resolve(null);
    }
  } catch (error) {
    console.error(`❌ Error handling ${event.type} event:`, error);
    return Promise.resolve(null);
  }
}

async function handleMessageEvent(event) {
  console.log('💬 Handling Message Event');
  const message = event.message;

  try {
    return await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: `Received: ${message.text}`
    });
  } catch (error) {
    console.error('❌ Error in handleMessageEvent:', error);
    return Promise.resolve(null);
  }
}

async function handleFollowEvent(event) {
  console.log('👥 User Followed Bot:', event.source.userId);
  return Promise.resolve(null);
}

async function handleUnfollowEvent(event) {
  console.log('👋 User Unfollowed Bot:', event.source.userId);
  return Promise.resolve(null);
}

// Additional Routes
app.use("/webhook2", registrationRouter);

app.get("/", (req, res) => {
  res.send("ADT Line Bot 2 Webhook is running.");
});

// Server Start
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook`);
});

// Global Error Handling
app.use(errorHandlingMiddleware);
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
