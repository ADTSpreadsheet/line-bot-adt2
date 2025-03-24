// ✅ utils/database.js (อัปเดตเวอร์ชันที่พี่เก่งใช้งานได้ทันที)

const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config");
const supabaseClient = createClient(supabase.url, supabase.key);

async function insertUserRegistration(data) {
  console.log('💾 Inserting User Registration to Supabase:', JSON.stringify(data, null, 2));

  try {
    const payload = {
      line_user_id: data.line_user_id || '',
      machine_id: data.machine_id || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      house_number: data.house_number || '',
      district: data.district || '',
      province: data.province || '',
      phone_number: data.phone_number || '',
      email: data.email || '',
      national_id: data.national_id || '',
      ip_address: data.ip_address || '',
      day_created_at: new Date().toISOString().slice(0, 10),
      verify_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'VERIFIED'
    };

    console.log('🔎 Final Payload to Supabase:', payload);

    const { data: insertedData, error } = await supabaseClient
      .from("user_registrations")
      .insert([payload])
      .select();

    if (error) {
      console.error('❌ Supabase Insertion Error:', error);
      throw error;
    }

    console.log('✅ User Registration Inserted Successfully');
    return insertedData;
  } catch (error) {
    console.error('🚨 Unexpected Error in Supabase Insertion:', {
      errorMessage: error.message,
      errorDetails: error,
      insertedData: data
    });
    throw error;
  }
}

module.exports = { insertUserRegistration };
