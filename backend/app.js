require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/emergency-hospital-db";

mongoose.connect(MONGO_URI).then(async () => {
  console.log("✅ MongoDB connected");

  // ✅ Reset ALL hospitals to online on every startup
  const Hospital = require("./models/Hospital");
  const result = await Hospital.updateMany(
    {},
    { $set: { status: "online", lastHeartbeat: new Date() } }
  );
  console.log(`✅ Reset ${result.modifiedCount} hospitals to online`);

  startHeartbeatMonitor();
}).catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — retrying...");
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/hospitals", require("./routes/hospitals"));
app.use("/api/recommend", require("./routes/recommend"));
app.use("/api/alert", require("./routes/alert"));

// ─── Root Route (Fix "Route not found" on base URL) ──────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Emergency Hospital System API",
    status: "running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      hospitals: "/api/hospitals",
      recommend: "/api/recommend",
      alert: "/api/alert",
    },
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", availableRoutes: ["/", "/health", "/api/hospitals", "/api/recommend", "/api/alert"] });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

// ─── Heartbeat Monitor ────────────────────────────────────────────────────────
function startHeartbeatMonitor() {
  const Hospital = require("./models/Hospital");
  // ✅ Set to 1 year — hospitals never go offline automatically
  const HEARTBEAT_TIMEOUT_MS = 365 * 24 * 60 * 60 * 1000;

  setInterval(async () => {
    try {
      // Also refresh all heartbeats every hour to keep them online
      await Hospital.updateMany({}, { $set: { lastHeartbeat: new Date() } });
    } catch (err) {
      console.error("Heartbeat monitor error:", err.message);
    }
  }, 60 * 60 * 1000); // every 1 hour

  console.log("💓 Heartbeat monitor started");
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Emergency Hospital API running on port ${PORT}`);
});

module.exports = app;
