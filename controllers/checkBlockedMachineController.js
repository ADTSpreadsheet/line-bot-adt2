// 📁 controllers/checkBlockedMachineController.js
const { supabase } = require('../utils/supabaseClient');

const checkBlockedMachine = async (req, res) => {
  const { machine_id } = req.body;
  const now = new Date().toISOString();

  if (!machine_id) {
    console.warn('❌ Missing machine_id');
    return res.status(400).send('Missing machine_id');
  }

  const { data, error } = await supabase
    .from('registered_machines')
    .select('status, expires_at')
    .eq('machine_id', machine_id)
    .maybeSingle();

  // ✅ กรณีไม่พบ Machine ID นี้เลย → ถือว่าเป็นผู้ใช้ใหม่ → ไม่ insert
  if (!data) {
    console.warn(`🆕 ไม่พบ Machine ID "${machine_id}" ในระบบ → ถือเป็นผู้ใช้ใหม่`);
    return res.status(403).send('NEW_MACHINE');
  }

  // ✅ ถ้าเคยใช้งานแล้ว แต่ถูกบล็อกไปแล้ว
  if (data.status === 'BLOCK') {
    console.warn(`🔴 เครื่อง "${machine_id}" ถูกบล็อกก่อนหน้า >> Go to SaleUserForm`);
    return res.status(200).send('BLOCK');
  }

  // ✅ ถ้าหมดอายุแล้ว แต่ยัง ACTIVE → ต้อง BLOCK
  if (data.status === 'ACTIVE' && data.expires_at <= now) {
    const { error: updateError } = await supabase
      .from('registered_machines')
      .update({ status: 'BLOCK', status_update_at: now })
      .eq('machine_id', machine_id);

    if (updateError) {
      console.error(`❌ Failed to auto-BLOCK machine: ${machine_id}`);
      return res.status(500).send('Failed to block expired machine');
    }

    console.warn(`🔴 เครื่อง "${machine_id}" หมดอายุแล้ว → BLOCK สำเร็จ >> Go to SaleUserForm`);
    return res.status(200).send('BLOCK');
  }

  // ✅ ยังไม่หมดอายุ → ให้ใช้ฟรีได้ต่อ
  console.info(`🟨 Machine "${machine_id}" ยังไม่หมดอายุ → Go to UF_TrialAccess ✅`);
  return res.status(403).send('Not expired');
};

module.exports = { checkBlockedMachine };
