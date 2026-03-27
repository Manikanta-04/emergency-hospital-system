require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const ambulanceLocations = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("ambulance-location", (data) => {
    const { ambulanceId, lat, lng, speed, alertLogId } = data;
    ambulanceLocations[ambulanceId] = { lat, lng, speed, ambulanceId, alertLogId, updatedAt: new Date() };
    io.emit("ambulance-update", ambulanceLocations[ambulanceId]);
  });

  socket.on("ambulance-stop", (data) => {
    delete ambulanceLocations[data.ambulanceId];
    io.emit("ambulance-stopped", { ambulanceId: data.ambulanceId });
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

app.set("io", io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/emergency-hospital-db";

mongoose.connect(MONGO_URI).then(async () => {
  console.log("✅ MongoDB connected");
  const Hospital = require("./models/Hospital");
  await Hospital.updateMany({}, { $set: { status: "online", lastHeartbeat: new Date() } });
  console.log("✅ All hospitals reset to online");
  startHeartbeatMonitor();
}).catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});

mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/hospitals", require("./routes/hospitals"));
app.use("/api/recommend", require("./routes/recommend"));
app.use("/api/alert", require("./routes/alert"));
app.use("/api/auth", require("./routes/auth")); // ✅ NEW: Auth routes

// ─── Ambulance Tracking ───────────────────────────────────────────────────────
app.get("/api/tracking/:ambulanceId", (req, res) => {
  const loc = ambulanceLocations[req.params.ambulanceId];
  if (!loc) return res.json({ active: false, message: "Ambulance not currently tracking" });
  res.json({ active: true, ...loc });
});

app.get("/api/tracking", (req, res) => {
  res.json({ ambulances: Object.values(ambulanceLocations) });
});

// ─── Root & Health ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Emergency Hospital System API",
    status: "running",
    version: "1.0.0",
    features: ["hospital-routing", "ai-recommendation", "alerts", "live-tracking", "auth"],
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    activeAmbulances: Object.keys(ambulanceLocations).length,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

// ─── Heartbeat Monitor ────────────────────────────────────────────────────────
function startHeartbeatMonitor() {
  const Hospital = require("./models/Hospital");
  setInterval(async () => {
    try { await Hospital.updateMany({}, { $set: { lastHeartbeat: new Date() } }); }
    catch (err) { console.error("Heartbeat error:", err.message); }
  }, 60 * 60 * 1000);
  console.log("💓 Heartbeat monitor started");
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Emergency Hospital API running on port ${PORT}`);
});

module.exports = app;
