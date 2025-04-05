// 📁 controllers/checkBlockedMachineController.js
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

const checkBlockedMachine = async (req, res) => {
  const { machine_id } = req.body;
  const now = new Date().toISOString();

  if (!machine_id) {
    return res.status(400).send('Missing machine_id');
  }

  // 🔍 STEP 1: ตรวจจากตาราง registered_machines
  const { data: machineData, error: machineError } = await supabase
    .from('registered_machines')
    .select('status, expires_at')
    .eq('machine_id', machine_id)
    .maybeSingle();

  // 🔍 STEP 2: ตรวจจากตาราง auth_sessions ว่า Ref.Code เคยมีมั้ย
  const { data: sessionData, error: sessionError } = await supabase
    .from('auth_sessions')
    .select('ref_code')
    .eq('machine_id', machine_id)
    .maybeSingle();

  // ✅ ยังไม่เคยเจอเครื่องนี้เลย → เพิ่มเครื่องใหม่
  if (!machineData) {
    logger.warn(`🆕 ยังไม่เคยเจอเครื่องนี้: ${machine_id} → ทำการเพิ่มเข้า Supabase`);

    const { error: insertErr } = await supabase
      .from('registered_machines')
      .insert({
        machine_id,
        status: 'ACTIVE',
        created_at: now,
        line_bot_status: 'NONE',
        line_status: 'none'
      });

    if (insertErr) {
      logger.error(`❌ Insert machine failed: ${insertErr.message}`);
      return res.status(500).send('Cannot insert machine');
    }

    // 🔄 ถ้าไม่มี ref_code ด้วย → ถือว่าเป็นคนใหม่ 100%
    if (!sessionData) {
      logger.warn(`🆕 ยังไม่มี Ref.Code ผูกกับเครื่อง ${machine_id} → ผู้ใช้ใหม่ทั้งระบบ`);
      return res.status(200).send('NEW_USER');
    }

    logger.info(`✅ ลงทะเบียนเครื่องใหม่สำเร็จ แต่เคยมี Ref.Code แล้ว`);
    return res.status(403).send('Machine registered - old user');
  }

  // ✅ ถ้าเครื่องถูก BLOCK ไปแล้ว
  if (machineData.status === 'BLOCK') {
    logger.warn(`🔴 Machine "${machine_id}" ถูกบล็อกแล้วอยู่ก่อนหน้า >> Go to SaleUserForm`);
    return res.status(200).send('BLOCKED');
  }

  // ✅ ถ้าเครื่องยัง ACTIVE แต่หมดอายุ → ต้อง BLOCK
  if (machineData.status === 'ACTIVE' && machineData.expires_at <= now) {
    const { error: updateError } = await supabase
      .from('registered_machines')
      .update({ status: 'BLOCK', status_update_at: now })
      .eq('machine_id', machine_id);

    if (updateError) {
      logger.error(`❌ Failed to BLOCK machine: ${machine_id}`);
      return res.status(500).send('Failed to block expired machine');
    }

    logger.warn(`🔴 Machine "${machine_id}" หมดอายุแล้ว → BLOCK สำเร็จ >> Go to SaleUserForm`);
    return res.status(200).send('BLOCKED');
  }

  // ✅ ทุกอย่างโอเค → ไปต่อ UF_TrialAccess
  logger.info(`🟨 Machine "${machine_id}" ยังไม่หมดอายุ → Go to UF_TrialAccess ✅`);
  return res.status(403).send('Not expired');
};

module.exports = { checkBlockedMachine };
