const express = require("express");
const router = express.Router();

const { handleSlipSubmission } = require("../controllers/handleSlipSubmission");

// POST /slip/submit
router.post("/submit", handleSlipSubmission);

module.exports = router;
