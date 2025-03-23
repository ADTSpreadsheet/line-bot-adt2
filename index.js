const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const registrationRouter = require("./routes/registration");
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());

// Routes
app.use("/webhook2", registrationRouter);

// ✅ Route พิเศษสำหรับตอบกลับ Webhook ของ LINE
app.post("/ok", (req, res) => {
  res.sendStatus(200); // แค่ตอบกลับว่าโอเค
});

// Start server
app.listen(PORT, () => {
  console.log(`[✅] ADT Line Bot 2 is running on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://line-bot-adt-2.onrender.com/webhook2`);
  console.log(`🆗 LINE Webhook OK: https://line-bot-adt-2.onrender.com/ok`);
});
