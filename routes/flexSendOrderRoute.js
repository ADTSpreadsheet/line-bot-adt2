const express = require('express');
const router = express.Router();
const { sendOrderFlex } = require('../controllers/sendOrderFlex');

// Endpoint: POST /flex/send-order
router.post('/flex/send-order', sendOrderFlex);

module.exports = router;
