const express = require('express');
const router = express.Router();

// Import Controller
const { handleTumcivilWebhook } = require('../controllers/tumcivilWebhookHandler');

// Route สำหรับ TumCivil LINE Webhook (ใช้ /webhook2 ตาม LINE Console)
router.post('/webhook2', handleTumcivilWebhook);

// Health check route สำหรับ TumCivil
router.get('/tumcivil-health', (req, res) => {
  res.status(200).json({ 
    message: 'TumCivil Admin System is running',
    service: 'ADTSpreadsheet Order Management',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
