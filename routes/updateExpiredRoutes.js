// 📁 routes/updateExpiredRoutes.js

const express = require('express');
const router = express.Router();

const { updateExpiredMachines } = require('../controllers/updateExpiredController');

// ✅ Endpoint สำหรับเรียกอัปเดตสถานะผู้ใช้งานที่หมดอายุแล้ว
router.post('/block-expired-users', updateExpiredMachines);

module.exports = router;
