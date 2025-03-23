// index.js
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;

const lineConfig = {
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

// Middleware
app.use(bodyParser.json());

// ✅ LINE Webhook Route (requires signature validation)
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  console.log("📥 LINE Webhook Event:", JSON.stringify(req.body, null, 2));

  if (!req.body.events || req.body.events.length === 0) {
    console.log("❌ No events found in webhook request");
    return res.status(200).json({ message: "No events" });
  }

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log("✅ All events handled successfully");
      res.json(result);
    })
    .catch((err) => {
      console.error("❌ Error handling LINE events:", err);
      res.status(500).json({ error: "LINE event handling failed" });
    });
});

// ✅ Excel VBA Webhook Route (no signature validation)
app.post('/webhook2', async (req, res) => {
  try {
    console.log("📥 Received data from Excel VBA:", JSON.stringify(req.body, null, 2));
    // TODO: Add Supabase or other processing logic here
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error in /webhook2:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error("🚨 Unhandled error:", err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ LINE Bot 2 is running on port ${PORT}`);
  console.log(`🌐 LINE Webhook: /webhook`);
  console.log(`🌐 Excel VBA Webhook: /webhook2`);
});

// Handle incoming LINE events
async function handleEvent(event) {
  console.log('📝 Handling Event:', JSON.stringify(event, null, 2));

  switch (event.type) {
    case 'message':
      return handleMessage(event);
    case 'follow':
      console.log('👥 User followed:', event.source.userId);
      return Promise.resolve(null);
    case 'unfollow':
      console.log('👋 User unfollowed:', event.source.userId);
      return Promise.resolve(null);
    default:
      console.log('🔔 Unknown event type:', event.type);
      return Promise.resolve(null);
  }
}

// Reply to LINE message
async function handleMessage(event) {
  const client = new line.Client(lineConfig);
  const message = {
    type: 'text',
    text: `Received: ${event.message.text}`
  };
  return client.replyMessage(event.replyToken, message);
}
