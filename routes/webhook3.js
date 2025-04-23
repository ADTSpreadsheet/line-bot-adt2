const express = require("express");
const router = express.Router();
const { lineWebhook3 } = require("../controllers/lineWebhook3");

// ✅ POST /webhook3
router.post("/", lineWebhook3);

module.exports = router;
