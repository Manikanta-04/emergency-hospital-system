const Hospital = require("../models/Hospital");
const AlertLog = require("../models/AlertLog");
const webpush = require("web-push");

// ── Web Push VAPID Config ─────────────────────────────────────────────────────
// Generate once: npx web-push generate-vapid-keys
webpush.setVapidDetails(
  "mailto:admin@emergency.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// In-memory push subscription store (use DB in production)
const pushSubscriptions = new Map(); // hospitalId → subscription

/**
 * POST /api/alert/subscribe
 * Hospital dashboard saves its push subscription
 */
const subscribePush = async (req, res) => {
  try {
    const { subscription, hospitalId } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription object" });
    }
    // Store subscription keyed by hospitalId (or 'all' for broadcast)
    const key = hospitalId || "all";
    pushSubscriptions.set(key, subscription);
    console.log(`✅ Push subscription saved for: ${key}`);
    res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/alert
 * Sends a browser push notification instead of email webhook
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

    if (!hospitalId || !emergencyType || !eta || !patientLocation) {
      return res.status(400).json({
        success: false,
        error: "hospitalId, emergencyType, eta, and patientLocation are required",
      });
    }

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

    const UNIT_MAP = {
      Stroke: "Neurology",
      "Heart Attack": "Cardiology",
      Trauma: "Trauma Care",
      Accident: "Trauma Care",
      Burns: "ICU",
      Other: "General",
    };
    const requiredUnit = UNIT_MAP[emergencyType] || "ICU";

    const alertLogId = `ALERT-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    // Duplicate check
    const recentDuplicate = await AlertLog.findOne({
      hospitalId,
      emergencyType,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      status: "active",
    });

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        error:
          "Duplicate alert detected. An alert was already sent to this hospital in the last 2 minutes.",
        existingAlertId: recentDuplicate.alertLogId,
      });
    }

    // Reserve beds
    const bedType = ["Trauma", "Accident"].includes(emergencyType) ? "trauma" : "icu";
    await Hospital.findByIdAndUpdate(hospitalId, {
      $inc: { [`beds.${bedType}.reserved`]: patientCount },
    });

    // Create alert log
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

    // ── Send Web Push Notification ────────────────────────────────────────
    let pushSuccess = false;
    let pushError = "";

    const pushPayload = JSON.stringify({
      title: `🚨 EMERGENCY: ${emergencyType}`,
      body: `${patientCount} patient(s) arriving at ${hospital.name} in ${eta} min. Unit: ${requiredUnit}`,
      icon: "/ambulance-icon.png",
      badge: "/badge.png",
      tag: alertLogId,
      data: {
        alertLogId,
        hospitalId,
        emergencyType,
        eta,
        patientCount,
        requiredUnit,
        url: "/hospital",
      },
    });

    // Try to send to the hospital-specific subscription, fallback to 'all'
    const subscription =
      pushSubscriptions.get(hospitalId.toString()) || pushSubscriptions.get("all");

    if (subscription) {
      try {
        await webpush.sendNotification(subscription, pushPayload);
        pushSuccess = true;
        console.log(`✅ Push notification sent for alert ${alertLogId}`);

        await AlertLog.findByIdAndUpdate(alertLog._id, {
          $set: {
            webhookStatus: "sent",
            webhookAttempts: 1,
            webhookLastAttempt: new Date(),
            "notificationStatus.dashboard": "delivered",
          },
        });
      } catch (pushErr) {
        pushError = pushErr.message;
        console.error("⚠️  Push notification failed:", pushError);

        // Remove stale subscription
        if (pushErr.statusCode === 410) {
          pushSubscriptions.delete(hospitalId.toString());
          pushSubscriptions.delete("all");
        }

        await AlertLog.findByIdAndUpdate(alertLog._id, {
          $set: {
            webhookStatus: "failed",
            webhookAttempts: 1,
            webhookLastAttempt: new Date(),
            webhookError: pushError,
          },
        });
      }
    } else {
      // No push subscription registered — mark as sent anyway (hospital polls)
      pushSuccess = true;
      console.warn("⚠️  No push subscription found — hospital will see alert on next poll");
      await AlertLog.findByIdAndUpdate(alertLog._id, {
        $set: { webhookStatus: "sent", webhookAttempts: 0 },
      });
    }

    // Decrement beds
    await Hospital.findByIdAndUpdate(hospitalId, {
      $inc: {
        [`beds.${bedType}.available`]: -patientCount,
        [`beds.${bedType}.reserved`]: -patientCount,
      },
      $set: { bedsLastUpdated: new Date() },
    });

    res.status(201).json({
      success: true,
      alertLogId,
      hospitalName: hospital.name,
      emergencyType,
      requiredUnit,
      eta,
      patientCount,
      webhookStatus: pushSuccess ? "sent" : "failed",
      webhookError: pushSuccess ? null : pushError,
      canRetry: !pushSuccess,
      message: pushSuccess
        ? `✅ Alert sent to ${hospital.name}. Staff are being notified.`
        : `⚠️ Alert logged but push notification failed. Hospital will see alert on refresh.`,
    });
  } catch (err) {
    console.error("sendAlert error:", err.message);
    res.status(500).json({ success: false, error: "Alert dispatch failed" });
  }
};

/**
 * POST /api/alert/:alertLogId/retry
 */
const retryAlert = async (req, res) => {
  try {
    const { alertLogId } = req.params;
    const alertLog = await AlertLog.findOne({ alertLogId });
    if (!alertLog) {
      return res.status(404).json({ success: false, error: "Alert not found" });
    }
    if (alertLog.webhookStatus === "sent") {
      return res
        .status(400)
        .json({ success: false, error: "Alert was already sent successfully" });
    }

    const pushPayload = JSON.stringify({
      title: `🚨 RETRY: ${alertLog.emergencyType}`,
      body: `${alertLog.patientCount} patient(s) arriving at ${alertLog.hospitalName} in ${alertLog.eta} min`,
      tag: alertLogId,
      data: { alertLogId, url: "/hospital" },
    });

    const subscription =
      pushSubscriptions.get(alertLog.hospitalId.toString()) || pushSubscriptions.get("all");

    if (subscription) {
      try {
        await webpush.sendNotification(subscription, pushPayload);
        await AlertLog.findByIdAndUpdate(alertLog._id, {
          $set: {
            webhookStatus: "sent",
            webhookLastAttempt: new Date(),
            "notificationStatus.dashboard": "delivered",
          },
          $inc: { webhookAttempts: 1 },
        });
        res.json({ success: true, message: "Push notification retry successful" });
      } catch (err) {
        await AlertLog.findByIdAndUpdate(alertLog._id, {
          $set: { webhookStatus: "failed", webhookLastAttempt: new Date(), webhookError: err.message },
          $inc: { webhookAttempts: 1 },
        });
        res.status(502).json({ success: false, error: "Retry failed", canRetry: true });
      }
    } else {
      res
        .status(400)
        .json({ success: false, error: "No push subscription registered for this hospital" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "Retry failed" });
  }
};

/**
 * GET /api/alert/logs
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

/**
 * PATCH /api/alert/:alertLogId/complete
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

module.exports = { sendAlert, retryAlert, getAlertLogs, markComplete, subscribePush };
