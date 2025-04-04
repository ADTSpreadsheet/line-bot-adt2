const express = require('express');
const router = express.Router();
const { registerMachine } = require('../controllers/registerMachineController');

router.post('/router/register-machine', registerMachine);

module.exports = router;
