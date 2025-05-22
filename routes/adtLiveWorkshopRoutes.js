const express = require('express');
const router = express.Router();

// Controller สำหรับ Workshop นี้
const { verifyADTLiveWorkshopUser } = require('../controllers/adtLiveWorkshopController');

// ตรวจสอบสิทธิ์เข้าเรียน
router.post('/verify', verifyADTLiveWorkshopUser);

// (สามารถเพิ่ม endpoint อื่น ๆ ได้ที่นี่ เช่น /register, /submit-screenshot)

module.exports = router;
