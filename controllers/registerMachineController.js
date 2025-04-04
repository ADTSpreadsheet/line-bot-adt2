// ✅ FILE: controllers/registerMachineController.js

const { supabase } = require('../utils/supabaseClient');

/**
 * ✅ ฟังก์ชันสำหรับบันทึกข้อมูลลง registered_machines
 * ใช้ ref_code → ดึง line_user_id จาก auth_sessions
 * จากนั้น insert หรือ update ลง registered_machines
 */
const registerMachine = async (req, res) => {
  try {
    const {
      ref_code,
      machine_id,
      pdpa_status,
      user_data,
      expires_at
    } = req.body;

    if (!ref_code || !machine_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // ✅ ดึง line_user_id จาก auth_sessions
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('line_user_id')
      .eq('ref_code', ref_code)
      .eq('machine_id', machine_id)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, message: 'Ref.Code หรือ Machine ID ไม่ถูกต้อง' });
    }

    const line_user_id = session.line_user_id;

    // ✅ ตรวจสอบว่ามีอยู่แล้วหรือยัง
    const { data: existing, error: checkError } = await supabase
      .from('registered_machines')
      .select('id')
      .eq('ref_code', ref_code)
      .maybeSingle();

    const dataToSave = {
      ref_code,
      line_user_id,
      machine_id,
      pdpa_status,
      status: 'ACTIVE',
      status_update_at: new Date().toISOString(),
      registered_at: new Date().toISOString(),
      trial_start_date: new Date().toISOString(),
      trial_end_date: expires_at,
      completed_at: new Date().toISOString(),
      expires_at,
      last_active: new Date().toISOString(),
      login_count: 1,
      user_data,
      is_flagged: false,
      role: 'user'
    };

    if (existing) {
      await supabase
        .from('registered_machines')
        .update(dataToSave)
        .eq('ref_code', ref_code);
    } else {
      await supabase
        .from('registered_machines')
        .insert(dataToSave);
    }

    return res.status(200).json({ success: true, message: 'ลงทะเบียนเครื่องสำเร็จ' });
  } catch (err) {
    console.error('❌ ERROR in registerMachine:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  registerMachine
};
