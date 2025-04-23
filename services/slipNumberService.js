// 📁 services/slipNumberService.js

const generateSlipNumber = async (supabase) => {
  const prefix = "SLP-";

  // ดึงเลขล่าสุดจากตาราง slip_submissions
  const { data, error } = await supabase
    .from("slip_submissions")
    .select("slip_ref")
    .order("created_at", { ascending: false })
    .limit(1);

  let lastNumber = 0;

  if (data && data.length > 0) {
    const lastRef = data[0].slip_ref;
    const match = lastRef?.match(/SLP-(\d+)/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  const nextNumber = lastNumber + 1;
  const slipRef = `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  return slipRef;
};

module.exports = { generateSlipNumber };
