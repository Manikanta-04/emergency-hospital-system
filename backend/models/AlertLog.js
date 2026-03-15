const mongoose = require("mongoose");

const AlertLogSchema = new mongoose.Schema(
  {
    // ✅ Edge Case #18: unique alertLogId prevents duplicate alerts
    alertLogId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    hospitalName: {
      type: String,
      required: true,
    },

    emergencyType: {
      type: String,
      enum: ["Accident", "Stroke", "Heart Attack", "Trauma", "Burns", "Other"],
      required: true,
    },

    patientLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },

    eta: {
      type: Number, // in minutes
      required: true,
    },

    // ✅ Edge Case #10: multi-patient support
    patientCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    requiredUnit: {
      type: String,
      enum: ["ICU", "Trauma Care", "Cardiology", "Neurology", "General", "Burns"],
      required: true,
    },

    // Webhook delivery tracking
    webhookStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "retrying"],
      default: "pending",
    },

    webhookAttempts: {
      type: Number,
      default: 0,
    },

    webhookLastAttempt: {
      type: Date,
    },

    webhookError: {
      type: String,
      default: "",
    },

    // ✅ Edge Case #13: track if dispatcher overrode AI recommendation
    wasManualOverride: {
      type: Boolean,
      default: false,
    },

    aiRecommendedHospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },

    // SMS/Email notification status
    notificationStatus: {
      sms: {
        type: String,
        enum: ["pending", "sent", "failed", "skipped"],
        default: "pending",
      },
      email: {
        type: String,
        enum: ["pending", "sent", "failed", "skipped"],
        default: "pending",
      },
      dashboard: {
        type: String,
        enum: ["pending", "delivered", "failed"],
        default: "pending",
      },
    },

    // Final outcome tracking
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    dispatcherId: {
      type: String,
      default: "anonymous",
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups by hospital + time
AlertLogSchema.index({ hospitalId: 1, createdAt: -1 });
AlertLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("AlertLog", AlertLogSchema);