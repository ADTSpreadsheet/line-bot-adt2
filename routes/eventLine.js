const express = require('express');
const router = express.Router();
const { generateWorkshopSummary } = require('../controllers/workshopSummary');
const line = require('@line/bot-sdk');
const client = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET,
});

router.post('/webhook2', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.status(200).send('No events');

    const event = events[0];
    if (event.type === 'message' && event.message.text === 'ADTLive-Workshop-Recheck') {
      const replyText = await generateWorkshopSummary();
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText,
      });
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[❌] Error in eventLine.js:', err);
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
