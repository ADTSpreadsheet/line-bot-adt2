const express = require('express');
const router = express.Router();

// Import Controller
const { handleTumcivilWebhook } = require('../controllers/tumcivilWebhookHandler');

// Debug middleware - เพิ่มเพื่อดู Request
router.use((req, res, next) => {
  console.log('🚨🚨🚨 มี Request เข้ามา:', req.method, req.path, new Date().toISOString());
  console.log('🚨🚨🚨 Request Body:', JSON.stringify(req.body, null, 2));
  next();
});

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
