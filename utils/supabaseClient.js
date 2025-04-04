const { createClient } = require('@supabase/supabase-js');


const supabaseUrl = "https://wpxpukbvynxawfxcdroj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHB1a2J2eW54YXdmeGNkcm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjM4Njc5MiwiZXhwIjoyMDU3OTYyNzkyfQ.tgeHy_TMIx6UuQLBXDiKYTi8QyeO7fMI7ZSRuEBiUKM";

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
