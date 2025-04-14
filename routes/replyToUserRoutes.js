// routes/replyToUserRoutes.js
const express = require('express');
const router = express.Router();
const { replyToUser } = require('../controllers/replyToUserController');

// เส้นทางสำหรับให้ BOT2 ส่งข้อความกลับไปยังลูกค้า BOT1
router.post('/router/reply-to-user', replyToUser);

module.exports = router;
