// 📁 routes/checkBlockedMachineRoute.js

const express = require('express');
const router = express.Router();

const { checkBlockedMachine } = require('../controllers/checkBlockedMachineController');

// ✅ POST: ตรวจสอบว่า Machine ID ถูกบล็อคหรือไม่
router.post('/check-machine-status', checkBlockedMachine);

module.exports = router;
