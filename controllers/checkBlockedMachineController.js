// 📁 controllers/checkBlockedMachineController.js

const { supabase } = require('../utils/supabaseClient');

const checkBlockedMachine = async (req, res) => {
  try {
    const { machine_id } = req.body;

    if (!machine_id) {
      return res.status(400).json({ success: false, message: 'Missing machine_id' });
    }

    const { data, error } = await supabase
      .from('registered_machines')
      .select('status')
      .eq('machine_id', machine_id)
      .single();

    if (error || !data) {
      console.error('[❌] Error fetching machine:', error);
      return res.status(404).json({ success: false, isBlocked: false, message: 'Machine not found' });
    }

    const isBlocked = data.status === 'BLOCK';

    console.log(`[✅] Machine ${machine_id} is ${isBlocked ? 'BLOCKED' : 'ACTIVE'}`);
    return res.status(200).json({ success: true, isBlocked });

  } catch (err) {
    console.error('[❌] Internal error in checkBlockedMachine:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { checkBlockedMachine };
