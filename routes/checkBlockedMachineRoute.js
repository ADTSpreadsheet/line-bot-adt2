// 📁 routes/checkBlockedMachineRoute.js

const express = require('express');
const router = express.Router();
const { checkBlockedMachine } = require('../controllers/checkBlockedMachineController');

router.post('/check-machine-status', checkBlockedMachine);

module.exports = router;
