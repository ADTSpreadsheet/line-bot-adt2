const express = require('express');
const line = require('@line/bot-sdk');

const lineConfig = {
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

const app = express();

// ✅ Logging Middleware ก่อนทุก Route
app.use((req, res, next) => {
  console.log('---------------------------------------------');
  console.log('🛰️ Incoming Request');
  console.log('📅 Time:', new Date().toISOString());
  console.log('🌐 Method:', req.method);
  console.log('🔗 Path:', req.originalUrl);
  console.log('📥 Headers:', JSON.stringify(req.headers, null, 2));

  let rawData = [];
  req.on('data', chunk => {
    rawData.push(chunk);
  }).on('end', () => {
    const rawBody = Buffer.concat(rawData).toString();
    console.log('📦 Raw Body:', rawBody || '[No Body]');
    req.rawBody = rawBody;
    next();
  });
});

// ✅ Webhook Route จาก LINE
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  console.log('📨 Received LINE Webhook Request');
  console.log('📦 Parsed Events:', JSON.stringify(req.body.events, null, 2));

  if (!req.body.events || req.body.events.length === 0) {
    console.log('⚠️ No events received.');
    return res.status(200).json({ message: 'No events' });
  }

  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('✅ All events handled successfully.');
      res.json(result);
    })
    .catch((err) => {
      console.error('❌ Error handling events:', err);
      res.status(500).json({ error: 'Failed to process events' });
    });
});

// ✅ Handler Function
async function handleEvent(event) {
  console.log('📝 Handling Event:', JSON.stringify(event, null, 2));

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
    console.error(`❌ Error in ${event.type} handler:`, error);
    return Promise.resolve(null);
  }
}

async function handleMessageEvent(event) {
  console.log('💬 Message Event:', event.message);

  // ตอบกลับข้อความ
  const client = new line.Client(lineConfig);
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `Received: ${event.message.text}`
  });
}

async function handleFollowEvent(event) {
  console.log('👥 User Followed:', event.source.userId);
  return Promise.resolve(null);
}

async function handleUnfollowEvent(event) {
  console.log('👋 User Unfollowed:', event.source.userId);
  return Promise.resolve(null);
}

// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled Server Error:', err);
  res.status(500).json({ error: 'Server error' });
});

// ✅ Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ LINE Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Webhook is ready at: /webhook`);
});

module.exports = app;
