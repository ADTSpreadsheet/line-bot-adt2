const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config");

const supabaseClient = createClient(supabase.url, supabase.key);

async function insertToSupabase(data) {
  const { error } = await supabaseClient.from("auth_sessions").insert([data]);
  if (error) throw error;
}

module.exports = { insertToSupabase };
