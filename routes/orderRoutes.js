const express = require('express');
const router = express.Router();

// Import Controller
const { handleOrderAction } = require('../controllers/orderActionHandler');

// Route สำหรับจัดการการกดปุ่ม Approve/Reject
router.get('/order-action', handleOrderAction);

module.exports = router;
