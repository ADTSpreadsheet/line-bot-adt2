const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const registrationRouter = require("./routes/registration");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

// Routes
app.use("/webhook2", registrationRouter);

app.listen(PORT, () => {
  console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook2`);
});

// Start server
app.listen(PORT, () => {
  console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
});
