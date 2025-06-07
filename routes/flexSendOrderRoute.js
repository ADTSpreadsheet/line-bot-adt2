const express = require('express');
const router = express.Router();
const { sendToAPI1 } = require('../controllers/sendToCustomerController');

// Endpoint: POST /flex/send-order
router.post('/flex/send-order', sendToAPI1);

module.exports = router;
