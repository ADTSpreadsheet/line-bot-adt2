// index.js
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 10000;

// Line configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(bodyParser.json());

// LINE webhook middleware for signature verification
const lineMiddleware = line.middleware(lineConfig);

// LINE webhook route
app.post('/webhook', lineMiddleware, async (req, res) => {
  console.log("📲 LINE Webhook triggered");
  res.status(200).end(); // ✅ ตอบกลับก่อนเพื่อไม่ให้ TIMEOUT จาก LINE

  const events = req.body.events;

  if (!events || !Array.isArray(events)) {
    console.warn("⚠️ No events received from LINE");
    return;
  }

  events.forEach(async (event) => {
    try {
      console.log(`🔍 Processing event type: ${event.type}`);

      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        console.log(`📝 Received message: "${text}" from user: ${userId}`);

        const client = new line.Client(lineConfig);

        if (text.toUpperCase() === 'PING') {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'PONG'
          });
          console.log(`✅ Replied PONG to user: ${userId}`);
        } else {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `✅ ได้รับข้อความของคุณ: "${text}"`
          });
          console.log(`✅ Replied to message from user: ${userId}`);
        }
      } else if (event.type === 'follow') {
        const userId = event.source.userId;
        console.log(`🎉 User ${userId} added the bot as a friend`);

        try {
          const client = new line.Client(lineConfig);
          await client.pushMessage(userId, {
            type: 'text',
            text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน! ยินดีต้อนรับสู่บริการของเรา'
          });
          console.log(`✅ Sent welcome message to user: ${userId}`);
        } catch (pushError) {
          console.error('❌ Error sending welcome message:', pushError.message);
        }
      } else if (event.type === 'unfollow') {
        const userId = event.source.userId;
        console.log(`👋 User ${userId} blocked the bot`);
      }
    } catch (err) {
      console.error("❌ Error in event processing:", err.message);
    }
  });
});
