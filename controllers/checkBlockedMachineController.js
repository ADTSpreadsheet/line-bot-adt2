const checkBlockedMachine = async (req, res) => {
  const { machine_id } = req.body;
  const now = new Date().toISOString();

  if (!machine_id) {
    return res.status(400).send('Missing machine_id');
  }

  // ดึงข้อมูลเครื่องเดียว
  const { data, error } = await supabase
    .from('registered_machines')
    .select('status, expires_at')
    .eq('machine_id', machine_id)
    .maybeSingle();

  if (error || !data) {
    logger.error(`❌ Supabase error: ${error?.message || "No data found"}`);
    return res.status(404).send('Machine not found');
  }

  // เช็คว่าเครื่องนี้หมดอายุและยังไม่ได้ถูกบล็อก
  if (data.status === 'ACTIVE' && data.expires_at <= now) {
    const { error: updateError } = await supabase
      .from('registered_machines')
      .update({ status: 'BLOCK', status_update_at: now })
      .eq('machine_id', machine_id);

    if (updateError) {
      logger.error(`❌ Failed to BLOCK machine: ${machine_id}`);
      return res.status(500).send('Failed to block expired machine');
    }

    logger.info(`✅ Machine ID "${machine_id}" → Update status  already ✅`);
    logger.warn(`🔴 BLOCKED machine: "${machine_id}" due to expiration >> Go to SaleUserForm 🔒`);
    return res.status(200).send('BLOCKED');
  }

  // ถ้ายังไม่หมดอายุ หรือถูกบล็อกอยู่แล้ว
  logger.info(`🟨 Machine "${machine_id}" is not expired or already blocked >> Go to UF_TrialAccess ✅`);
  return res.status(403).send('Not expired or not blocked');
};
