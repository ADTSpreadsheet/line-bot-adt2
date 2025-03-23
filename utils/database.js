const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config");
const supabaseClient = createClient(supabase.url, supabase.key);

async function insertUserRegistration(data) {
  console.log('💾 Inserting User Registration to Supabase:', JSON.stringify(data, null, 2));

  try {
    const { data: insertedData, error } = await supabaseClient
      .from("user_registrations")  // ← เปลี่ยนตรงนี้จาก auth_sessions
      .insert([data])
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
