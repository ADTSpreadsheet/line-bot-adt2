const express = require('express');
const router = express.Router();
const checkAdmin = require('../controllers/checkAdmin');

router.post('/check-admin', checkAdmin);

module.exports = router;
