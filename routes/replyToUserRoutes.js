// routes/replyToUserRoutes.js

const express = require('express');
const router = express.Router();

const { replyToUser } = require('../controllers/replyToUserController');
const { sendToCustomer } = require('../controllers/sendToCustomerController');

// ✅ Bot2 ตอบกลับไปยังลูกค้า
router.post('/router/reply-to-user', replyToUser);

// ✅ Bot2 ส่งข้อความกลับไปยังลูกค้าโดยตรง
router.post('/send-to-customer', sendToCustomer);

module.exports = router;
