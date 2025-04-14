// routes/webhook2.js

const express = require('express');
const router = express.Router();
const { handleWebhookFromBot2 } = require('../controllers/lineWebhookBot2');

// 📦 POST จาก LINE → แชท Bot2
router.post('/webhook2', handleWebhookFromBot2);

module.exports = router;
