const { supabase } = require('../utils/supabaseClient');

const checkAdmin = async (req, res) => {
  try {
    const { machine_id } = req.body;

    if (!machine_id) {
      return res.status(400).json({ status: 400, message: 'Missing machine_id' });
    }

    // ค้นหา machine_id ในตาราง admin_machines
    const { data, error } = await supabase
      .from('admin_machines')
      .select('*')
      .eq('machine_id', machine_id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(403).json({ status: 403, message: 'Not authorized' });
    }

    return res.status(200).json({ status: 200, message: 'Admin verified' });
  } catch (err) {
    console.error('checkAdmin error:', err);
    return res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

module.exports = checkAdmin;
