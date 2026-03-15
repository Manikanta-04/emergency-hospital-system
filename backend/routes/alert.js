const express = require("express");
const router = express.Router();
const { sendAlert, retryAlert, getAlertLogs, markComplete } = require("../controllers/alertController");

router.post("/", sendAlert);
router.post("/:alertLogId/retry", retryAlert);
router.get("/logs", getAlertLogs);
router.patch("/:alertLogId/complete", markComplete);

module.exports = router;
