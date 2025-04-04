// 📁 routes/machineRoutes.js
const express = require('express');
const router = express.Router();
const { registerMachine } = require('../controllers/registerMachineController');

// ✅ POST: รับข้อมูลลงตาราง registered_machines
router.post('/register-machine', registerMachine);

module.exports = router;
