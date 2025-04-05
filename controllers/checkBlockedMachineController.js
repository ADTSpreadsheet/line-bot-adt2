const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

const checkBlockedMachine = async (req, res) => {
  const { machine_id } = req.body;
  const now = new Date().toISOString();

  if (!machine_id) {
    logger.warn('⚠️ Missing machine_id from request body');
    return res.status(400).send('Missing machine_id');
  }

  // 🔍 STEP 1: ดึงข้อมูลเครื่องเดียวจาก registered_machines
  const { data, error } = await supabase
    .from('registered_machines')
    .select('status, expires_at')
    .eq('machine_id', machine_id)
    .maybeSingle();

  if (error || !data) {
    logger.error(`❌ Supabase error: ${error?.message || "No data found for machine ID"}`);
    return res.status(404).send('Machine not found');
  }

  const status = data.status?.toUpperCase();
  const expired = data.expires_at && data.expires_at <= now;

  // 🛑 STEP 2: ถ้าหมดอายุและยังเป็น ACTIVE → ทำการ BLOCK
  if (status === 'ACTIVE' && expired) {
    const { error: updateError } = await supabase
      .from('registered_machines')
      .update({ status: 'BLOCK', status_update_at: now })
      .eq('machine_id', machine_id);

    if (updateError) {
      logger.error(`❌ Failed to BLOCK machine: ${machine_id}`);
      return res.status(500).send('Failed to block expired machine');
    }

    logger.warn(`🔴 BLOCK machine: "${machine_id}" due to expiration >> Go to SaleUserForm 🔒`);
    return res.status(200).send('BLOCKED');
  }

  // ✅ STEP 3: ยังไม่หมดอายุ หรือถูกบล็อกไปแล้ว
  logger.info(`🟨 Machine "${machine_id}" is not expired or already blocked >> Go to UF_TrialAccess ✅`);
  return res.status(403).send('Not expired or not blocked');
};

module.exports = { checkBlockedMachine };
