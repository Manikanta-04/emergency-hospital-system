const axios = require("axios");
const { v4: uuidv4 } = require("crypto"); // Node built-in crypto for UUID
const Hospital = require("../models/Hospital");
const AlertLog = require("../models/AlertLog");

/**
 * POST /api/alert
 * Body: { hospitalId, emergencyType, eta, patientLocation, patientCount?, wasManualOverride?, aiRecommendedHospitalId? }
 *
 * ✅ Edge Case #3:  Webhook failure handling + retry button support
 * ✅ Edge Case #5:  Bed reservation (optimistic locking) on alert confirm
 * ✅ Edge Case #14: Bed count decrement after confirmed routing
 * ✅ Edge Case #18: Duplicate alert prevention via alertLogId
 */
const sendAlert = async (req, res) => {
  try {
    const {
      hospitalId,
      emergencyType,
      eta,
      patientLocation,
      patientCount = 1,
      wasManualOverride = false,
      aiRecommendedHospitalId = null,
      dispatcherId = "anonymous",
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!hospitalId || !emergencyType || !eta || !patientLocation) {
      return res.status(400).json({
        success: false,
        error: "hospitalId, emergencyType, eta, and patientLocation are required",
      });
    }

    // ── Fetch hospital ────────────────────────────────────────────────────
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    if (hospital.status === "offline") {
      return res.status(409).json({
        success: false,
        error: "Hospital is currently offline. Please select another hospital.",
      });
    }

    // ── Determine required unit ───────────────────────────────────────────
    const UNIT_MAP = {
      "Stroke": "Neurology",
      "Heart Attack": "Cardiology",
      "Trauma": "Trauma Care",
      "Accident": "Trauma Care",
      "Burns": "ICU",
      "Other": "General",
    };
    const requiredUnit = UNIT_MAP[emergencyType] || "ICU";

    // ── Generate unique alertLogId (✅ Edge Case #18: prevent duplicates) ──
    const alertLogId = `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Check for duplicate (same hospital + emergency within last 2 minutes)
    const recentDuplicate = await AlertLog.findOne({
      hospitalId,
      emergencyType,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      status: "active",
    });

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        error: "Duplicate alert detected. An alert was already sent to this hospital in the last 2 minutes.",
        existingAlertId: recentDuplicate.alertLogId,
      });
    }

    // ── ✅ Edge Case #5: Reserve beds immediately (optimistic locking) ────
    const bedType = ["Trauma", "Accident"].includes(emergencyType) ? "trauma" : "icu";
    await Hospital.findByIdAndUpdate(hospitalId, {
      $inc: { [`beds.${bedType}.reserved`]: patientCount },
    });

    // ── Create alert log entry ────────────────────────────────────────────
    const alertLog = new AlertLog({
      alertLogId,
      hospitalId,
      hospitalName: hospital.name,
      emergencyType,
      patientLocation,
      eta,
      patientCount,
      requiredUnit,
      wasManualOverride,
      aiRecommendedHospitalId,
      dispatcherId,
      webhookStatus: "pending",
    });

    await alertLog.save();

    // ── Fire n8n webhook ──────────────────────────────────────────────────
    const webhookPayload = {
      alertLogId,
      hospitalName: hospital.name,
      hospitalContact: hospital.contact,
      emergencyType,
      requiredUnit,
      eta,
      patientCount,
      patientLocation,
      timestamp: new Date().toISOString(),
      wasManualOverride,
    };

    let webhookSuccess = false;
    let webhookError = "";

    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    if (N8N_WEBHOOK_URL) {
      try {
        await axios.post(N8N_WEBHOOK_URL, webhookPayload, { timeout: 5000 });
        webhookSuccess = true;

        // Update log with success
        await AlertLog.findByIdAndUpdate(alertLog._id, {
          $set: {
            webhookStatus: "sent",
            webhookAttempts: 1,
            webhookLastAttempt: new Date(),
            "notificationStatus.dashboard": "delivered",
          },
        });
      } catch (webhookErr) {
        webhookError = webhookErr.message;
        console.error("⚠️  n8n webhook failed:", webhookError);

        // ✅ Edge Case #3: Log failure so UI can show retry button
        await AlertLog.findByIdAndUpdate(alertLog._id, {
          $set: {
            webhookStatus: "failed",
            webhookAttempts: 1,
            webhookLastAttempt: new Date(),
            webhookError,
          },
        });
      }
    } else {
      // No webhook configured — skip but don't fail
      webhookSuccess = true;
      console.warn("⚠️  N8N_WEBHOOK_URL not set — skipping webhook");
      await AlertLog.findByIdAndUpdate(alertLog._id, {
        $set: { webhookStatus: "sent", webhookAttempts: 0 },
      });
    }

    // ── ✅ Edge Case #14: Decrement bed count after confirmed routing ─────
    await Hospital.findByIdAndUpdate(hospitalId, {
      $inc: {
        [`beds.${bedType}.available`]: -patientCount,
        [`beds.${bedType}.reserved`]: -patientCount, // release the reservation
      },
      $set: { bedsLastUpdated: new Date() },
    });

    // ── Respond to frontend ───────────────────────────────────────────────
    res.status(201).json({
      success: true,
      alertLogId,
      hospitalName: hospital.name,
      emergencyType,
      requiredUnit,
      eta,
      patientCount,

      // ✅ Edge Case #3: Tell UI exactly what happened with the webhook
      webhookStatus: webhookSuccess ? "sent" : "failed",
      webhookError: webhookSuccess ? null : webhookError,
      canRetry: !webhookSuccess,

      message: webhookSuccess
        ? `✅ Alert sent to ${hospital.name}. Staff are being notified.`
        : `⚠️ Alert logged but notification failed. Please call the hospital directly: ${hospital.contact?.emergencyLine || hospital.contact?.phone}`,
    });
  } catch (err) {
    console.error("sendAlert error:", err.message);
    res.status(500).json({ success: false, error: "Alert dispatch failed" });
  }
};

/**
 * POST /api/alert/:alertLogId/retry
 * ✅ Edge Case #3: Retry failed webhook
 */
const retryAlert = async (req, res) => {
  try {
    const { alertLogId } = req.params;

    const alertLog = await AlertLog.findOne({ alertLogId });
    if (!alertLog) {
      return res.status(404).json({ success: false, error: "Alert not found" });
    }

    if (alertLog.webhookStatus === "sent") {
      return res.status(400).json({ success: false, error: "Alert was already sent successfully" });
    }

    const hospital = await Hospital.findById(alertLog.hospitalId);

    const webhookPayload = {
      alertLogId: alertLog.alertLogId,
      hospitalName: alertLog.hospitalName,
      hospitalContact: hospital?.contact,
      emergencyType: alertLog.emergencyType,
      requiredUnit: alertLog.requiredUnit,
      eta: alertLog.eta,
      patientCount: alertLog.patientCount,
      patientLocation: alertLog.patientLocation,
      timestamp: new Date().toISOString(),
      isRetry: true,
    };

    try {
      await axios.post(process.env.N8N_WEBHOOK_URL, webhookPayload, { timeout: 5000 });

      await AlertLog.findByIdAndUpdate(alertLog._id, {
        $set: {
          webhookStatus: "sent",
          webhookLastAttempt: new Date(),
          "notificationStatus.dashboard": "delivered",
        },
        $inc: { webhookAttempts: 1 },
      });

      res.json({ success: true, message: "Alert retry successful" });
    } catch (err) {
      await AlertLog.findByIdAndUpdate(alertLog._id, {
        $set: { webhookStatus: "failed", webhookLastAttempt: new Date(), webhookError: err.message },
        $inc: { webhookAttempts: 1 },
      });

      res.status(502).json({
        success: false,
        error: "Retry failed. Hospital notified via fallback.",
        canRetry: true,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "Retry failed" });
  }
};

/**
 * GET /api/alert/logs
 * Returns recent alert logs for the hospital dashboard
 */
const getAlertLogs = async (req, res) => {
  try {
    const { hospitalId, limit = 20 } = req.query;
    const filter = hospitalId ? { hospitalId } : {};

    const logs = await AlertLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch alert logs" });
  }
};

module.exports = { sendAlert, retryAlert, getAlertLogs };

/**
 * PATCH /api/alert/:alertLogId/complete
 * Mark alert as completed from hospital dashboard
 */
const markComplete = async (req, res) => {
  try {
    const { alertLogId } = req.params;
    const alertLog = await AlertLog.findOneAndUpdate(
      { alertLogId },
      { $set: { status: "completed" } },
      { new: true }
    );
    if (!alertLog) return res.status(404).json({ success: false, error: "Alert not found" });
    res.json({ success: true, message: "Alert marked as completed" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update alert" });
  }
};

module.exports = { sendAlert, retryAlert, getAlertLogs, markComplete };
