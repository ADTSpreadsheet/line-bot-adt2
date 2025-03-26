// routes/checkMachineID.js

const express = require("express");
const router = express.Router();
const supabase = require("../utils/database");

// ✅ Endpoint: GET /webhook2/check-machine-id?machine_id=XXXXX
router.get("/check-machine-id", async (req, res) => {
  const { machine_id } = req.query;

  if (!machine_id) {
    return res.status(400).json({ error: "Missing machine_id" });
  }

  try {
    const { data, error } = await supabase
      .from("user_registrations")
      .select("status")
      .eq("machine_id", machine_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ status: "INACTIVE" });
    }

    if (data.status === "ACTIVE") {
      return res.json({ status: "ACTIVE" });
    } else {
      return res.json({ status: "INACTIVE" });
    }
  } catch (err) {
    console.error("Error checking machine ID:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
