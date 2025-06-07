// controllers/sendToCustomerController.js
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const logger = require('../utils/logger');

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const sendToAPI1 = async (req, res) => {
  const { action, ref_code, license_no, plan_type } = req.body;

  if (!action || !ref_code) {
    logger.warn('Missing action or ref_code in request');
    return res.status(400).json({ error: 'action and ref_code are required' });
  }

  try {
    let payloadToAPI1 = {
      ref_code,
      action
    };

    // 🔍 ตรวจสอบประเภท Plan และเพิ่มข้อมูลเฉพาะ
    if (license_no) {
      // Pro Plan
      payloadToAPI1.license_no = license_no;
      logger.info(`📦 Pro Plan detected - License: ${license_no}`);
      
    } else if (plan_type === 'starter') {
      // Starter Plan  
      payloadToAPI1.plan_type = 'starter';
      logger.info(`🎯 Starter Plan detected - Ref: ${ref_code}`);
      
    } else {
      logger.error(`❌ ไม่สามารถระบุประเภท Plan ได้ - Ref: ${ref_code}`);
      return res.status(400).json({ error: 'ไม่สามารถระบุประเภท Plan ได้' });
    }

    // 🚀 ส่งข้อมูลไปยัง API1
    logger.info(`🚀 กำลังส่งข้อมูลไป API1:`, payloadToAPI1);
    
    const api1Response = await axios.post(process.env.API1_ENDPOINT, payloadToAPI1, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (api1Response.status === 200) {
      logger.info(`✅ ส่งข้อมูลไป API1 สำเร็จ - Ref: ${ref_code}, Action: ${action}`);
      
      return res.status(200).json({
        success: true,
        message: 'ส่งข้อมูลไป API1 สำเร็จ',
        data: {
          ref_code,
          action,
          plan_type: license_no ? 'pro' : 'starter',
          api1_response: api1Response.data
        }
      });
      
    } else {
      logger.error(`❌ API1 ตอบกลับสถานะไม่ถูกต้อง: ${api1Response.status}`);
      return res.status(500).json({ 
        error: 'API1 ตอบกลับสถานะไม่ถูกต้อง',
        status: api1Response.status 
      });
    }

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      logger.error(`⏰ Timeout เชื่อมต่อ API1 - Ref: ${ref_code}`);
      return res.status(408).json({ error: 'Timeout เชื่อมต่อ API1' });
      
    } else if (err.response) {
      logger.error(`❌ API1 Error Response: ${err.response.status} - ${err.response.data?.message || err.message}`);
      return res.status(err.response.status).json({ 
        error: 'เกิดข้อผิดพลาดจาก API1', 
        details: err.response.data?.message || err.message 
      });
      
    } else {
      logger.error(`❌ sendToAPI1 Error: ${err.message}`);
      return res.status(500).json({ 
        error: 'เกิดข้อผิดพลาดในระบบ', 
        details: err.message 
      });
    }
  }
};

module.exports = { sendToAPI1 };
