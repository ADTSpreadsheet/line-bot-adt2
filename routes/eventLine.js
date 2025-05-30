const { generateWorkshopSummary } = require('../controllers/workshopSummary');

if (event.type === 'message' && event.message.text === 'ADTLive-Workshop-Recheck') {
  const replyText = await generateWorkshopSummary();
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}
