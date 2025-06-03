const express = require('express');
const router = express.Router();

// 👇 เรียก controller ที่พี่เก่งเขียนไว้
const submitStarterSlip = require('../controllers/submitStarterSlip');

// ✅ POST route จาก API1 → ส่ง Flex ให้ Bot2 (Admin)
router.post('/notify-admin-slip', submitStarterSlip);

module.exports = router;
