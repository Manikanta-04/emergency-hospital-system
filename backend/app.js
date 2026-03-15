require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/emergency-hospital-db";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected:", MONGO_URI);

    // ✅ Reset all hospitals to online when server starts
    const Hospital = require("./models/Hospital");

    await Hospital.updateMany(
      {},
      {
        $set: {
          status: "online",
          lastHeartbeat: new Date(),
        },
      }
    );

    console.log("✅ All hospitals reset to online");

    startHeartbeatMonitor(); // start offline detection monitor
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected — retrying...");
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/hospitals", require("./routes/hospitals"));
app.use("/api/recommend", require("./routes/recommend"));
app.use("/api/alert", require("./routes/alert"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  res.status(500).json({
    error: "Internal server error",
    detail: err.message,
  });
});

// ─── Heartbeat Monitor ────────────────────────────────────────────────────────
// Marks hospitals as offline if they haven't pinged in a long time
function startHeartbeatMonitor() {
  const Hospital = require("./models/Hospital");

  // ✅ Changed timeout to 1 year for demo stability
  const HEARTBEAT_TIMEOUT_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

      const result = await Hospital.updateMany(
        {
          status: "online",
          lastHeartbeat: { $lt: cutoff },
        },
        { $set: { status: "offline" } }
      );

      if (result.modifiedCount > 0) {
        console.warn(
          `⚠️ Heartbeat monitor: marked ${result.modifiedCount} hospital(s) as offline`
        );
      }
    } catch (err) {
      console.error("Heartbeat monitor error:", err.message);
    }
  }, 60 * 1000); // check every 60 seconds

  console.log("💓 Heartbeat monitor started (checks every 60s)");
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Emergency Hospital API running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

module.exports = app;