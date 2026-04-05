const express = require("express");
const router = express.Router();
const { sendAlert, retryAlert, getAlertLogs, markComplete, subscribePush } = require("../controllers/alertController");

router.post("/subscribe", subscribePush);          // Hospital registers push subscription
router.post("/", sendAlert);
router.post("/:alertLogId/retry", retryAlert);
router.get("/logs", getAlertLogs);
router.patch("/:alertLogId/complete", markComplete);

module.exports = router;
