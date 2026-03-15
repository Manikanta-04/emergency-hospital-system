// ✅ Edge Case #20: Offline demo mode — hardcoded fallback data
export const MOCK_HOSPITALS = [
  {
    _id: "mock001",
    name: "Apollo Hospitals - Greams Road",
    location: { coordinates: [80.2574, 13.0569], address: "21, Greams Lane, Chennai - 600006" },
    beds: { icu: { available: 8, reserved: 0 }, trauma: { available: 5, reserved: 0 }, general: { available: 45, reserved: 0 } },
    availableSpecialists: ["Cardiology", "Neurology", "General"],
    status: "online", tier: 1, rating: 4.8,
    contact: { phone: "044-28293333", emergencyLine: "044-28296666" },
    distanceKm: 3.2,
  },
  {
    _id: "mock002",
    name: "MIOT International Hospital",
    location: { coordinates: [80.1955, 13.0358], address: "Mount Poonamallee Rd, Chennai - 600089" },
    beds: { icu: { available: 12, reserved: 0 }, trauma: { available: 10, reserved: 0 }, general: { available: 30, reserved: 0 } },
    availableSpecialists: ["Orthopedics", "Trauma", "General"],
    status: "online", tier: 1, rating: 4.7,
    contact: { phone: "044-22490000", emergencyLine: "044-22490011" },
    distanceKm: 9.7,
  },
  {
    _id: "mock003",
    name: "Kauvery Hospital",
    location: { coordinates: [80.2341, 13.0418], address: "Luz Church Rd, Mylapore, Chennai - 600004" },
    beds: { icu: { available: 14, reserved: 0 }, trauma: { available: 7, reserved: 0 }, general: { available: 55, reserved: 0 } },
    availableSpecialists: ["Cardiology", "Trauma", "General", "Pediatrics"],
    status: "online", tier: 1, rating: 4.5,
    contact: { phone: "044-40006000", emergencyLine: "044-40006001" },
    distanceKm: 6.0,
  },
];

export const EMERGENCY_TYPES = [
  { value: "Stroke", label: "🧠 Stroke", specialist: "Neurology", color: "#6366f1" },
  { value: "Heart Attack", label: "❤️ Heart Attack", specialist: "Cardiology", color: "#ef4444" },
  { value: "Trauma", label: "🩹 Trauma", specialist: "Trauma Care", color: "#f97316" },
  { value: "Accident", label: "🚗 Accident", specialist: "Trauma Care", color: "#eab308" },
  { value: "Burns", label: "🔥 Burns", specialist: "Burns Unit", color: "#dc2626" },
  { value: "Other", label: "🏥 Other", specialist: "General", color: "#14b8a6" },
];
