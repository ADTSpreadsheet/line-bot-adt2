const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const line = require('@line/bot-sdk');
const registrationRouter = require("./routes/registration");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// LINE Webhook Configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// Middleware logging
app.use((req, res, next) => {
  console.log('🔍 Incoming Request:');
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use(bodyParser.json());

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

// Event Handler
function handleEvent(event) {
  console.log('Received LINE event:', event);
  
  // Basic event handling
  switch (event.type) {
    case 'message':
      return handleMessageEvent(event);
    default:
      return Promise.resolve(null);
  }
}

function handleMessageEvent(event) {
  // Simple message handler
  console.log('Message event:', event.message);
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
  console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook`);
});
