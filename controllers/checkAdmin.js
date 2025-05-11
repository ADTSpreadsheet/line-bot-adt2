const { supabase } = require('../utils/supabaseClient');

const checkAdmin = async (req, res) => {
  try {
    const { machine_id } = req.body;

    if (!machine_id) {
      return res.status(400).json({ status: 400, message: 'Missing machine_id' });
    }

    // ค้นหา machine_id ที่เปิดใช้งานอยู่
    const { data, error } = await supabase
      .from('admin_machines')
      .select('*')
      .eq('machine_id', machine_id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(403).json({ status: 403, message: 'Not authorized' });
    }

    // อัปเดต login_count + 1 และ last_login
    await supabase
      .from('admin_machines')
      .update({
        login_count: (data.login_count || 0) + 1,
        last_login: new Date()
      })
      .eq('machine_id', machine_id);

    return res.status(200).json({ status: 200, message: 'Admin verified' });

  } catch (err) {
    console.error('checkAdmin error:', err);
    return res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

module.exports = checkAdmin;
