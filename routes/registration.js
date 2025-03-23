const express = require("express");
const router = express.Router();
const { sendLineNotify } = require("../utils/lineBot");
const { insertToSupabase } = require("../utils/database");
const { isValidRegistration } = require("../utils/validation");

router.post("/", async (req, res) => {
  const data = req.body;

  if (!isValidRegistration(data)) {
    return res.status(400).json({ success: false, message: "Invalid data format." });
  }

  try {
    await insertToSupabase(data);
    await sendLineNotify(data);
    res.status(200).json({ success: true, message: "Data saved and notified." });
  } catch (error) {
    console.error("Error in /webhook2:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
