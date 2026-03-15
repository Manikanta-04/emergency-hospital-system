// ─── Emergency Type → Required Specialist Mapping ────────────────────────────
const EMERGENCY_SPECIALIST_MAP = {
  "Stroke": "Neurology",
  "Heart Attack": "Cardiology",
  "Trauma": "Trauma",
  "Accident": "Trauma",
  "Burns": "Burns",
  "Other": "General",
};

// ─── Emergency Type → Required Bed Type ──────────────────────────────────────
const EMERGENCY_BED_MAP = {
  "Stroke": "icu",
  "Heart Attack": "icu",
  "Trauma": "trauma",
  "Accident": "trauma",
  "Burns": "icu",
  "Other": "general",
};

// ─── Scoring Weights ──────────────────────────────────────────────────────────
const WEIGHTS = {
  distance: 0.35,
  specialization: 0.40,
  beds: 0.25,
};

function scoreHospital(hospital, emergencyType, distanceKm, patientCount = 1) {
  const requiredSpecialist = EMERGENCY_SPECIALIST_MAP[emergencyType] || "General";
  const requiredBedType = EMERGENCY_BED_MAP[emergencyType] || "general";

  // ── 1. Distance Score ─────────────────────────────────────────────────────
  const distanceScore = Math.max(0, 100 - distanceKm * 3.33);

  // ── 2. Specialization Score ───────────────────────────────────────────────
  let specializationScore = 0;
  const hasSpecialistOnDuty = hospital.availableSpecialists?.includes(requiredSpecialist);
  const hasSpecialistListed = hospital.specializations?.includes(requiredSpecialist);

  if (hasSpecialistOnDuty) {
    specializationScore = 100;
  } else if (hasSpecialistListed) {
    specializationScore = 40;
  } else if (hospital.availableSpecialists?.includes("General")) {
    specializationScore = 20;
  } else {
    specializationScore = 10; // minimum — at least they're a hospital
  }

  // ── 3. Bed Availability Score (FIXED) ─────────────────────────────────────
  const bedData = hospital.beds?.[requiredBedType] || hospital.beds?.general;
  const available = bedData?.available || 0;
  const reserved = bedData?.reserved || 0;
  const total = bedData?.total || 10;
  const effectiveBeds = Math.max(0, available - reserved);

  let bedScore = 0;
  if (effectiveBeds === 0) {
    // No beds in required type — check general as fallback
    const generalEffective = Math.max(0,
      (hospital.beds?.general?.available || 0) - (hospital.beds?.general?.reserved || 0)
    );
    bedScore = generalEffective > 0 ? 25 : 5;
  } else if (effectiveBeds < patientCount) {
    // Partial beds
    bedScore = Math.round((effectiveBeds / patientCount) * 60);
  } else {
    // Good availability — scale between 60-100
    const occupancyRatio = effectiveBeds / Math.max(total, 1);
    bedScore = Math.min(100, 60 + Math.round(occupancyRatio * 40));
  }

  // ── 4. Tier Bonus ─────────────────────────────────────────────────────────
  const tierBonus = hospital.tier === 1 ? 5 : hospital.tier === 2 ? 2 : 0;

  // ── 5. Final Score ────────────────────────────────────────────────────────
  const rawScore =
    distanceScore * WEIGHTS.distance +
    specializationScore * WEIGHTS.specialization +
    bedScore * WEIGHTS.beds +
    tierBonus;

  const finalScore = Math.round(Math.min(100, rawScore));

  return {
    score: finalScore,
    breakdown: {
      distanceScore: Math.round(distanceScore),
      specializationScore: Math.round(specializationScore),
      bedScore: Math.round(bedScore),
      tierBonus,
      hasSpecialistOnDuty,
      hasSpecialistListed,
      requiredSpecialist,
      requiredBedType,
      effectiveBeds,
      patientCount,
    },
  };
}

function rankHospitals(hospitals, emergencyType, userLat, userLng, patientCount = 1) {
  const scored = hospitals.map((hospital) => {
    const distKm = getDistanceKm(
      userLat, userLng,
      hospital.location.coordinates[1],
      hospital.location.coordinates[0]
    );
    const { score, breakdown } = scoreHospital(hospital, emergencyType, distKm, patientCount);
    const etaMinutes = Math.ceil((distKm / 25) * 60);
    return { hospital, score, breakdown, distanceKm: Math.round(distKm * 10) / 10, etaMinutes };
  });

  // Sort by score, tiebreaker = total ICU beds
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.hospital.beds?.icu?.total || 0) - (a.hospital.beds?.icu?.total || 0);
  });

  return scored;
}

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

module.exports = { rankHospitals, scoreHospital, EMERGENCY_SPECIALIST_MAP, EMERGENCY_BED_MAP };
