// 📁 controllers/checkBlockedMachineController.js
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

const checkBlockedMachine = async (req, res) => {
  const { machine_id } = req.body;
  const now = new Date().toISOString();

  if (!machine_id) {
    return res.status(400).send('Missing machine_id');
  }

  const { data, error } = await supabase
    .from('registered_machines')
    .select('status, expires_at')
    .eq('machine_id', machine_id)
    .maybeSingle();

  // 🆕 ถ้าไม่เจอข้อมูลเครื่องนี้ → Insert ใหม่
  if (!data) {
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

    return res.status(200).send('New machine registered');
  }

  // ✅ 1. ถ้าเครื่องถูก BLOCK ไปแล้ว
  if (data.status === 'BLOCK') {
    logger.warn(`🔴 Machine "${machine_id}" ถูกบล็อกแล้วอยู่ก่อนหน้า >> Go to SaleUserForm`);
    return res.status(200).send('BLOCKED');
  }

  // ✅ 2. ถ้าเครื่องยัง ACTIVE แต่หมดอายุ → ต้อง BLOCK
  if (data.status === 'ACTIVE' && data.expires_at <= now) {
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

  // ✅ 3. ยังไม่หมดอายุ → ผ่าน
  logger.info(`🟨 Machine "${machine_id}" ยังไม่หมดอายุ → Go to UF_TrialAccess ✅`);
  return res.status(403).send('Not expired');
};

module.exports = { checkBlockedMachine };
