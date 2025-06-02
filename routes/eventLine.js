const express = require('express');
const router = express.Router();
const { generateWorkshopSummary } = require('../controllers/workshopSummary');
const { handleTumcivilWebhook } = require('../controllers/tumcivilWebhookHandler');
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET,
});

router.post('/webhook2', async (req, res) => {
  try {
    console.log('🚨🚨🚨 มี Request เข้ามา:', req.method, req.path, new Date().toISOString());
    console.log('🚨🚨🚨 Request Body:', JSON.stringify(req.body, null, 2));
    
    const events = req.body.events;
    if (!events || events.length === 0) return res.status(200).send('No events');
    
    const event = events[0];
    console.log('🎯 EVENT TYPE:', event.type);
    
    // จัดการ Message (Workshop)
    if (event.type === 'message' && event.message.text === 'ADTLive-Workshop-Recheck') {
      const replyText = await generateWorkshopSummary();
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText,
      });
      return res.status(200).send('Workshop OK');
    }
    
    // จัดการ Postback (TumCivil)
    if (event.type === 'postback') {
      console.log('📥 เรียก TumCivil Handler');
      return await handleTumcivilWebhook(req, res);
    }
    
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[❌] Error in eventLine.js:', err);
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
