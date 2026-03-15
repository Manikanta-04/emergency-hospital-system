const Hospital = require("../models/Hospital");

// ─── GET /api/hospitals ───────────────────────────────────────────────────────
// Returns all hospitals (used for full map display)
const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({ status: { $ne: "offline" } }).lean();

    // ✅ Edge Case #1: Add staleness warning to each hospital
    const now = Date.now();
    const hospitalsWithStaleness = hospitals.map((h) => {
      const minsAgo = Math.floor(
        (now - new Date(h.bedsLastUpdated).getTime()) / 60000
      );
      return {
        ...h,
        dataFreshness: {
          minsAgo,
          isStale: minsAgo > 5,
          label:
            minsAgo === 0
              ? "Just updated"
              : `Data as of ${minsAgo} min${minsAgo > 1 ? "s" : ""} ago`,
        },
      };
    });

    res.json({
      success: true,
      count: hospitalsWithStaleness.length,
      hospitals: hospitalsWithStaleness,
    });
  } catch (err) {
    console.error("getAllHospitals error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch hospitals" });
  }
};

// ─── GET /api/hospitals/nearby ────────────────────────────────────────────────
// Returns hospitals near a lat/lng, with auto-expanding radius fallback
const getNearbyHospitals = async (req, res) => {
  try {
    let { lat, lng, radius = 10 } = req.query;

    // Validate coordinates
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    radius = parseFloat(radius);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: "Invalid coordinates. Provide lat and lng as numbers.",
      });
    }

    // ✅ Edge Case #2: Auto-expand radius if no hospitals found (10km → 25km → 50km)
    const RADIUS_STEPS = [radius, 25, 50];
    let hospitals = [];
    let usedRadius = radius;

    for (const r of RADIUS_STEPS) {
  hospitals = await Hospital.find({
    status: { $ne: "offline" },
    "location.coordinates": {
      $geoWithin: {
        $centerSphere: [[lng, lat], r / 6371],
      },
    },
  }).lean();

      if (hospitals.length > 0) {
        usedRadius = r;
        break;
      }
    }

    // ✅ Edge Case #1: Add staleness info
    const now = Date.now();
    const hospitalsWithMeta = hospitals.map((h) => {
      const minsAgo = Math.floor(
        (now - new Date(h.bedsLastUpdated).getTime()) / 60000
      );

      // Calculate straight-line distance in km
      const distKm = getDistanceKm(
        lat,
        lng,
        h.location.coordinates[1],
        h.location.coordinates[0]
      );

      return {
        ...h,
        distanceKm: Math.round(distKm * 10) / 10,
        dataFreshness: {
          minsAgo,
          isStale: minsAgo > 5,
          label:
            minsAgo === 0
              ? "Just updated"
              : `Data as of ${minsAgo} min${minsAgo > 1 ? "s" : ""} ago`,
        },
      };
    });

    res.json({
      success: true,
      count: hospitalsWithMeta.length,
      searchRadius: usedRadius,
      radiusExpanded: usedRadius > radius, // tells frontend if we had to expand
      message:
        usedRadius > radius
          ? `No hospitals found within ${radius}km — expanded search to ${usedRadius}km`
          : `Found ${hospitalsWithMeta.length} hospitals within ${usedRadius}km`,
      hospitals: hospitalsWithMeta,
    });
  } catch (err) {
    console.error("getNearbyHospitals error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch nearby hospitals" });
  }
};

// ─── GET /api/hospitals/:id ───────────────────────────────────────────────────
const getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).lean();
    if (!hospital) {
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }
    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch hospital" });
  }
};

// ─── POST /api/hospitals/:id/heartbeat ───────────────────────────────────────
// ✅ Edge Case #11: Hospital dashboard pings this every 60s to stay "online"
const updateHeartbeat = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          lastHeartbeat: new Date(),
          status: "online",
        },
      },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    res.json({ success: true, message: "Heartbeat received", hospitalId: hospital._id });
  } catch (err) {
    res.status(500).json({ success: false, error: "Heartbeat update failed" });
  }
};

// ─── Helper: Haversine distance formula ──────────────────────────────────────
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  getAllHospitals,
  getNearbyHospitals,
  getHospitalById,
  updateHeartbeat,
};
