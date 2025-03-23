const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config");
const supabaseClient = createClient(supabase.url, supabase.key);

async function insertToSupabase(data) {
 console.log('💾 Inserting Data to Supabase:', JSON.stringify(data, null, 2));

 try {
   const { data: insertedData, error } = await supabaseClient
     .from("auth_sessions")
     .insert([data])
     .select();

   if (error) {
     console.error('❌ Supabase Insertion Error:', error);
     throw error;
   }

   console.log('✅ Data Successfully Inserted to Supabase');
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

module.exports = { insertToSupabase };
