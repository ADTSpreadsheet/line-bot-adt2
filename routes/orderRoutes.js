const express = require('express');
const router = express.Router();

// Import Controllers
const { sendOrderFlex } = require('../controllers/sendOrderFlex');
const { handleOrderAction } = require('../controllers/orderActionHandler');

// Route สำหรับส่ง Flex Message ไป Admin
router.post('/send-order-flex', sendOrderFlex);

// Route สำหรับจัดการการกดปุ่ม Approve/Reject
router.get('/order-action', handleOrderAction);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'API2 (Line Bot Admin) is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
