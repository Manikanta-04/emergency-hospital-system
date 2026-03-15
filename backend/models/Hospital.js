const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        default: "Chennai",
      },
    },

    // ✅ Edge Case #6: availableSpecialists separate from listed specializations
    // specializations = what the hospital supports in general
    // availableSpecialists = who is actually ON DUTY right now
    specializations: {
      type: [String],
      enum: [
        "Cardiology",
        "Neurology",
        "Trauma",
        "General",
        "Orthopedics",
        "Burns",
        "Pediatrics",
      ],
      default: [],
    },

    availableSpecialists: {
      type: [String],
      enum: [
        "Cardiology",
        "Neurology",
        "Trauma",
        "General",
        "Orthopedics",
        "Burns",
        "Pediatrics",
      ],
      default: [],
    },

    beds: {
      icu: {
        total: { type: Number, default: 0 },
        available: { type: Number, default: 0 },
        reserved: { type: Number, default: 0 }, // ✅ Edge Case #5: optimistic locking
      },
      general: {
        total: { type: Number, default: 0 },
        available: { type: Number, default: 0 },
        reserved: { type: Number, default: 0 },
      },
      trauma: {
        total: { type: Number, default: 0 },
        available: { type: Number, default: 0 },
        reserved: { type: Number, default: 0 },
      },
    },

    contact: {
      phone: { type: String },
      emergencyLine: { type: String },
      email: { type: String },
    },

    // ✅ Edge Case #11: heartbeat for offline detection
    status: {
      type: String,
      enum: ["online", "offline", "maintenance"],
      default: "online",
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },

    // ✅ Edge Case #1: timestamp so UI can show "data as of X mins ago"
    bedsLastUpdated: {
      type: Date,
      default: Date.now,
    },

    // Hospital tier affects scoring weight
    tier: {
      type: Number,
      enum: [1, 2, 3], // 1 = top-tier (AIIMS level), 3 = basic
      default: 2,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    // For the map display
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for nearby queries
HospitalSchema.index({ "location.coordinates": "2dsphere" });

// Virtual: effective ICU beds (available minus reserved)
HospitalSchema.virtual("beds.icu.effective").get(function () {
  return this.beds.icu.available - this.beds.icu.reserved;
});

// Virtual: is the hospital actually reachable?
HospitalSchema.virtual("isReachable").get(function () {
  const HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
  return (
    this.status === "online" &&
    Date.now() - new Date(this.lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS
  );
});

HospitalSchema.set("toJSON", { virtuals: true });
HospitalSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Hospital", HospitalSchema);