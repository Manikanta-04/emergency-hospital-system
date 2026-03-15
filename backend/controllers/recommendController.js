const Hospital = require("../models/Hospital");
const { rankHospitals, EMERGENCY_SPECIALIST_MAP, EMERGENCY_BED_MAP } = require("../utils/scoring");

/**
 * POST /api/recommend
 * Body: { emergencyType, lat, lng, patientCount? }
 * Returns ranked list of hospitals with AI scores
 */
const getRecommendation = async (req, res) => {
  try {
    const { emergencyType, lat, lng, patientCount = 1 } = req.body;

    // ── Validate inputs ───────────────────────────────────────────────────
    if (!emergencyType || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: "emergencyType, lat, and lng are required",
      });
    }

    const validEmergencyTypes = ["Accident", "Stroke", "Heart Attack", "Trauma", "Burns", "Other"];
    if (!validEmergencyTypes.includes(emergencyType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid emergencyType. Must be one of: ${validEmergencyTypes.join(", ")}`,
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        error: "lat and lng must be valid numbers",
      });
    }

    // ── Fetch online hospitals ────────────────────────────────────────────
    // ✅ Edge Case #2: Start with 20km radius, expand if needed
    let hospitals = [];
    const RADIUS_STEPS_KM = [20, 40, 60];
    let usedRadius = 20;

    for (const radiusKm of RADIUS_STEPS_KM) {
      hospitals = await Hospital.find({
  status: { $ne: "offline" },
  "location.coordinates": {
    $geoWithin: {
      $centerSphere: [[userLng, userLat], radiusKm / 6371],
    },
  },
}).lean();

      if (hospitals.length > 0) {
        usedRadius = radiusKm;
        break;
      }
    }

    if (hospitals.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No hospitals found within 60km. Please contact emergency services directly.",
      });
    }

    // ── Run AI scoring ────────────────────────────────────────────────────
    const ranked = rankHospitals(hospitals, emergencyType, userLat, userLng, patientCount);

    // ── Build response ────────────────────────────────────────────────────
    const best = ranked[0];
    const requiredSpecialist = EMERGENCY_SPECIALIST_MAP[emergencyType] || "General";
    const requiredBedType = EMERGENCY_BED_MAP[emergencyType] || "general";

    // Map unit label for pre-alert
    const UNIT_MAP = {
      icu: "ICU",
      trauma: "Trauma Care",
      general: "General Ward",
    };

    res.json({
      success: true,
      emergencyType,
      patientCount,
      requiredSpecialist,
      requiredUnit: UNIT_MAP[requiredBedType] || "ICU",
      searchRadiusKm: usedRadius,
      totalHospitalsEvaluated: ranked.length,

      // The AI's top pick
      recommendation: {
        rank: 1,
        hospitalId: best.hospital._id,
        hospitalName: best.hospital.name,
        address: best.hospital.location.address,
        coordinates: {
          lat: best.hospital.location.coordinates[1],
          lng: best.hospital.location.coordinates[0],
        },
        score: best.score,
        distanceKm: best.distanceKm,
        etaMinutes: best.etaMinutes,
        availableBeds: {
          icu: best.hospital.beds.icu.available - best.hospital.beds.icu.reserved,
          trauma: best.hospital.beds.trauma.available - best.hospital.beds.trauma.reserved,
          general: best.hospital.beds.general.available - best.hospital.beds.general.reserved,
        },
        availableSpecialists: best.hospital.availableSpecialists,
        contact: best.hospital.contact,
        scoreBreakdown: best.breakdown,
      },

      // All ranked hospitals for the map display
      allRanked: ranked.map((r, i) => ({
        rank: i + 1,
        hospitalId: r.hospital._id,
        hospitalName: r.hospital.name,
        address: r.hospital.location.address,
        coordinates: {
          lat: r.hospital.location.coordinates[1],
          lng: r.hospital.location.coordinates[0],
        },
        score: r.score,
        distanceKm: r.distanceKm,
        etaMinutes: r.etaMinutes,
        availableBeds: {
          icu: r.hospital.beds.icu.available - r.hospital.beds.icu.reserved,
          trauma: r.hospital.beds.trauma.available - r.hospital.beds.trauma.reserved,
          general: r.hospital.beds.general.available - r.hospital.beds.general.reserved,
        },
        availableSpecialists: r.hospital.availableSpecialists,
        tier: r.hospital.tier,
        status: r.hospital.status,
        scoreBreakdown: r.breakdown,
      })),
    });
  } catch (err) {
    console.error("getRecommendation error:", err.message);
    res.status(500).json({ success: false, error: "Recommendation engine failed" });
  }
};

module.exports = { getRecommendation };
