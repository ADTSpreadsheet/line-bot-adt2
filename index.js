const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');

const lineConfig = {
 channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
 channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET
};

const app = express();

// Middleware สำหรับ LINE Webhook
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
 console.log('📨 Received LINE Webhook Request');
 console.log('Request Body:', JSON.stringify(req.body, null, 2));

 // ตรวจสอบว่ามี events หรือไม่
 if (!req.body.events || req.body.events.length === 0) {
   console.log('❌ No events in webhook request');
   return res.status(200).json({ message: 'No events' });
 }

 // จัดการ events
 Promise
   .all(req.body.events.map(handleEvent))
   .then((result) => {
     console.log('✅ Successfully processed events');
     res.json(result);
   })
   .catch((err) => {
     console.error('❌ Error processing webhook events:', err);
     res.status(500).json({ error: 'Webhook event processing failed' });
   });
});

// ฟังก์ชันจัดการ event
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
   console.error(`❌ Error handling ${event.type} event:`, error);
   return Promise.resolve(null);
 }
}

// จัดการ message event
async function handleMessageEvent(event) {
 console.log('💬 Message Event:', event.message);
 
 // ตอบกลับข้อความง่ายๆ
 return line.replyMessage(event.replyToken, {
   type: 'text',
   text: `Received: ${event.message.text}`
 });
}

// จัดการ follow event
async function handleFollowEvent(event) {
 console.log('👥 User Followed Bot:', event.source.userId);
 return Promise.resolve(null);
}

// จัดการ unfollow event
async function handleUnfollowEvent(event) {
 console.log('👋 User Unfollowed Bot:', event.source.userId);
 return Promise.resolve(null);
}

// Error handling middleware
app.use((err, req, res, next) => {
 console.error('🚨 Unhandled Error:', err);
 res.status(500).json({ 
   success: false, 
   message: 'Unexpected server error' 
 });
});

module.exports = app;
