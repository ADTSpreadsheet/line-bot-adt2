// routes/webhook2.js

const express = require('express');
const router = express.Router();
const { handleWebhookBot2 } = require('../controllers/lineWebhookBot2');

// 📬 POST จาก LINE > เข้า Bot2
router.post('/webhook2', handleWebhookBot2);

module.exports = router;
