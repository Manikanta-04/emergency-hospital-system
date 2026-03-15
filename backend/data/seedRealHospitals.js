require("dotenv").config();
const mongoose = require("mongoose");
const https = require("https");
const Hospital = require("../models/Hospital");

// ─── Cities to fetch hospitals from ──────────────────────────────────────────
const CITIES = [
  { name: "Vijayawada", lat: 16.5193, lng: 80.6305, radius: 15000 },
  { name: "Guntur",     lat: 16.3067, lng: 80.4365, radius: 15000 },
  { name: "Chennai",    lat: 13.0827, lng: 80.2707, radius: 20000 },
];

// ─── Specialist assignment based on hospital name keywords ───────────────────
function guessSpecialists(name = "", tags = {}) {
  const n = (name + " " + (tags.description || "") + " " + (tags.healthcare || "")).toLowerCase();
  const specs = [];

  if (n.includes("cardiac") || n.includes("heart") || n.includes("cardio")) specs.push("Cardiology");
  if (n.includes("neuro") || n.includes("brain") || n.includes("stroke")) specs.push("Neurology");
  if (n.includes("trauma") || n.includes("accident") || n.includes("emergency")) specs.push("Trauma");
  if (n.includes("ortho") || n.includes("bone") || n.includes("joint")) specs.push("Orthopedics");
  if (n.includes("child") || n.includes("paed") || n.includes("pediatric") || n.includes("kids")) specs.push("Pediatrics");
  if (n.includes("burn")) specs.push("Burns");

  // All hospitals have General
  if (!specs.includes("General")) specs.push("General");

  // Large hospitals get more specialists
  if (n.includes("apollo") || n.includes("manipal") || n.includes("kims") || n.includes("yashoda")) {
    if (!specs.includes("Cardiology")) specs.push("Cardiology");
    if (!specs.includes("Neurology")) specs.push("Neurology");
    if (!specs.includes("Trauma")) specs.push("Trauma");
  }

  return specs;
}

// ─── Guess available specialists (subset of total) ───────────────────────────
function guessAvailableSpecialists(allSpecs) {
  // Simulate: not all specialists are on duty at all times
  // Keep General always, randomly keep 60-80% of others
  return allSpecs.filter(s => s === "General" || Math.random() > 0.3);
}

// ─── Guess bed counts based on hospital type/name ────────────────────────────
function guessBeds(name = "", tags = {}) {
  const n = name.toLowerCase();
  const beds = parseInt(tags.beds) || 0;

  // Tier 1 private hospitals
  if (n.includes("apollo") || n.includes("manipal") || n.includes("kims") || n.includes("yashoda") || n.includes("continental")) {
    return { icu: { total: 40, available: Math.floor(Math.random() * 15) + 5, reserved: 0 },
             general: { total: 200, available: Math.floor(Math.random() * 60) + 20, reserved: 0 },
             trauma: { total: 20, available: Math.floor(Math.random() * 8) + 2, reserved: 0 } };
  }
  // Government hospitals
  if (n.includes("government") || n.includes("govt") || n.includes("general hospital") || n.includes("district")) {
    return { icu: { total: 60, available: Math.floor(Math.random() * 20) + 5, reserved: 0 },
             general: { total: 500, available: Math.floor(Math.random() * 150) + 50, reserved: 0 },
             trauma: { total: 40, available: Math.floor(Math.random() * 15) + 3, reserved: 0 } };
  }
  // Mid-tier hospitals
  if (beds > 100) {
    return { icu: { total: 25, available: Math.floor(Math.random() * 10) + 3, reserved: 0 },
             general: { total: beds, available: Math.floor(beds * 0.3), reserved: 0 },
             trauma: { total: 15, available: Math.floor(Math.random() * 6) + 1, reserved: 0 } };
  }
  // Small hospitals
  return { icu: { total: 10, available: Math.floor(Math.random() * 5) + 1, reserved: 0 },
           general: { total: 50, available: Math.floor(Math.random() * 20) + 5, reserved: 0 },
           trauma: { total: 8, available: Math.floor(Math.random() * 4) + 1, reserved: 0 } };
}

// ─── Guess tier ───────────────────────────────────────────────────────────────
function guessTier(name = "") {
  const n = name.toLowerCase();
  if (n.includes("apollo") || n.includes("manipal") || n.includes("kims") ||
      n.includes("yashoda") || n.includes("continental") || n.includes("star") ||
      n.includes("andhra") || n.includes("nri") || n.includes("sri ramachandra")) return 1;
  if (n.includes("government") || n.includes("govt") || n.includes("district") ||
      n.includes("general hospital")) return 2;
  return 2;
}

// ─── Fetch hospitals from Overpass API ───────────────────────────────────────
function fetchFromOverpass(query) {
  return new Promise((resolve, reject) => {
    const url = "https://overpass-api.de/api/interpreter";
    const postData = `data=${encodeURIComponent(query)}`;

    const options = {
      hostname: "overpass-api.de",
      path: "/api/interpreter",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "EmergencyHospitalSystem/1.0",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse Overpass response"));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => reject(new Error("Overpass API timeout")));
    req.write(postData);
    req.end();
  });
}

// ─── Build Overpass query ─────────────────────────────────────────────────────
function buildQuery(lat, lng, radius) {
  return `
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      relation["amenity"="hospital"](around:${radius},${lat},${lng});
    );
    out center tags;
  `;
}

// ─── Main seed function ───────────────────────────────────────────────────────
async function seedWithRealData() {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/emergency-hospital-db";
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    let allHospitals = [];
    const seen = new Set(); // deduplicate by name+city

    for (const city of CITIES) {
      console.log(`🔍 Fetching hospitals in ${city.name} from Overpass API...`);

      try {
        const query = buildQuery(city.lat, city.lng, city.radius);
        const result = await fetchFromOverpass(query);
        const elements = result.elements || [];

        console.log(`   Found ${elements.length} raw results`);

        let cityCount = 0;
        for (const el of elements) {
          const tags = el.tags || {};
          const name = tags.name || tags["name:en"] || "";

          // Skip unnamed or unnamed hospitals
          if (!name || name.length < 3) continue;

          // Get coordinates
          const lat = el.lat || el.center?.lat;
          const lng = el.lon || el.center?.lon;
          if (!lat || !lng) continue;

          // Deduplicate
          const key = `${name.toLowerCase()}-${city.name}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const specializations = guessSpecialists(name, tags);
          const availableSpecialists = guessAvailableSpecialists(specializations);
          const beds = guessBeds(name, tags);
          const tier = guessTier(name);

          // Build address
          const addr = [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:suburb"] || tags["addr:city"] || city.name,
          ].filter(Boolean).join(", ") || `${city.name}, Andhra Pradesh`;

          // Phone
          const phone = tags.phone || tags["contact:phone"] || tags["phone:emergency"] || "";

          allHospitals.push({
            name,
            location: {
              type: "Point",
              coordinates: [lng, lat],
              address: addr,
              city: city.name,
            },
            specializations,
            availableSpecialists,
            beds,
            contact: {
              phone: phone || `+91-000-0000000`,
              emergencyLine: phone || `+91-000-0000000`,
              email: `emergency@${name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com`,
            },
            status: "online",
            lastHeartbeat: new Date(),
            bedsLastUpdated: new Date(),
            tier,
            rating: tier === 1 ? +(4.2 + Math.random() * 0.6).toFixed(1) : +(3.5 + Math.random() * 0.7).toFixed(1),
          });

          cityCount++;
        }

        console.log(`   ✅ ${cityCount} valid hospitals in ${city.name}`);

        // Small delay between cities to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        console.error(`   ❌ Failed to fetch ${city.name}: ${err.message}`);
        console.log(`   ⚠️  Skipping ${city.name} — will use existing data`);
      }
    }

    if (allHospitals.length === 0) {
      console.error("\n❌ No hospitals fetched. Check internet connection.");
      process.exit(1);
    }

    // Clear and reseed
    const deleted = await Hospital.deleteMany({});
    console.log(`\n🗑️  Cleared ${deleted.deletedCount} old records`);

    const inserted = await Hospital.insertMany(allHospitals);
    console.log(`🏥 Seeded ${inserted.length} REAL hospitals!\n`);

    // Summary by city
    const cities = [...new Set(inserted.map(h => h.location.city))];
    cities.forEach(city => {
      const list = inserted.filter(h => h.location.city === city);
      console.log(`  📍 ${city}: ${list.length} hospitals`);
      list.slice(0, 5).forEach(h => {
        const icu = h.beds.icu.available;
        const s = icu === 0 ? "🔴" : icu <= 3 ? "🟡" : "🟢";
        console.log(`    ${s} ${h.name}`);
      });
      if (list.length > 5) console.log(`    ... and ${list.length - 5} more`);
    });

    console.log(`\n✅ Done! ${inserted.length} real hospitals across ${cities.length} cities`);
    console.log("💡 Tip: Run 'node fixHospitals.js' to ensure all are online\n");

  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
}

seedWithRealData();
