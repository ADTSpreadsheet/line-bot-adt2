const express = require('express');
const router = express.Router();

// 👉 เรียก controller ที่ถูกต้อง
const { sendStarterSlipToAdmin } = require('../controllers/submitStarterSlip');

// ✅ POST route จาก API1 → ส่ง Flex ให้ Bot2 (Admin)
router.post('/notify-admin-slip', sendStarterSlipToAdmin);

module.exports = router;
