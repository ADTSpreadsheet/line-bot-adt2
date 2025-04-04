// 📁 controllers/updateExpiredController.js

const { supabase } = require('../utils/supabaseClient');

/**
 * ฟังก์ชันสำหรับอัปเดตสถานะผู้ใช้ที่หมดอายุแล้ว
 * เปลี่ยน status จาก ACTIVE → BLOCK
 */
const updateExpiredMachines = async (req, res) => {
  try {
    const now = new Date().toISOString();

    // 1. อัปเดตผู้ที่หมดอายุแล้ว และยัง ACTIVE อยู่
    const { data, error } = await supabase
      .from('registered_machines')
      .update({ status: 'BLOCK', status_update_at: now })
      .eq('status', 'ACTIVE')
      .lt('expires_at', now);

    if (error) {
      console.error('[❌] อัปเดตสถานะไม่สำเร็จ:', error);
      return res.status(500).json({ success: false, message: 'อัปเดตไม่สำเร็จ', error });
    }

    console.log(`[✅] บล็อกผู้ใช้งานหมดอายุ ${data?.length || 0} รายเรียบร้อยแล้ว`);
    return res.status(200).json({
      success: true,
      message: `อัปเดตสำเร็จ ${data?.length || 0} ราย`,
    });

  } catch (err) {
    console.error('[❌] เกิดข้อผิดพลาดใน updateExpiredMachines:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  updateExpiredMachines
};
