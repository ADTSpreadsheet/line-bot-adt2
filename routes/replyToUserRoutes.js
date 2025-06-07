// routes/replyToUserRoutes.js

const express = require('express');
const router = express.Router();

const { replyToUser } = require('../controllers/replyToUserController');
const { sendToAPI1 } = require('../controllers/sendToCustomerController');

// 🔄 Bot2 ตอบกลับไปให้ลูกค้า
router.post('/router/reply-to-user', replyToUser);

// 🔄 Bot2 ส่งข้อมูลกลับไปให้ API1
router.post('/send-to-customer', sendToAPI1);

module.exports = router;
