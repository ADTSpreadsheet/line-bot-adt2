const { supabase } = require('../utils/supabaseClient');

const verifyADTLiveWorkshopUser = async (req, res) => {
  try {
    const { license_no, national_id, phone_number } = req.body;

    // 🔐 ตรวจสอบความครบถ้วน
    if (!license_no || !national_id || !phone_number) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // 🔎 ค้นจาก license_no ก่อน (หลัก)
    const { data, error } = await supabase
      .from('license_holders')
      .select('*')
      .eq('license_no', license_no)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'License not found.' });
    }

    // ✅ ตรวจสอบว่าตรงอย่างน้อย 2 ช่อง
    let matchCount = 0;
    if (data.license_no === license_no) matchCount += 1;
    if (data.national_id === national_id) matchCount += 1;
    if (data.phone_number === phone_number) matchCount += 1;

    if (matchCount >= 2) {
      return res.status(200).json({ message: 'License verified successfully.' });
    } else {
      return res.status(403).json({ error: 'At least 2 of 3 fields must match.' });
    }

  } catch (err) {
    console.error('Unexpected error in /ADTLiveWorkshop/verify:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};

module.exports = { verifyADTLiveWorkshopUser };
