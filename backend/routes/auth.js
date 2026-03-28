const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "emergency-hospital-secret-2026";

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, hospitalId: user.hospitalId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, hospitalName } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "Name, email, password and role required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({ name, email, password, role, hospitalName });
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Signup failed: " + err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: "Invalid email or password" });

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, hospitalId: user.hospitalId, hospitalName: user.hospitalName,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/auth/users — Admin only ─────────────────────────────────────────
router.get("/users", protect, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/auth/users — Admin only ────────────────────────────────────────
router.post("/users", protect, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role, hospitalId, hospitalName } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "All fields required" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({ name, email, password, role, hospitalId, hospitalName });
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/auth/users/:id ─────────────────────────────────────────────────
router.patch("/users/:id", protect, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { $set: req.body }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/auth/users/:id ────────────────────────────────────────────────
router.delete("/users/:id", protect, requireRole("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/auth/seed ───────────────────────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.json({ message: "Users already exist" });
    await User.create([
      { name: "Admin User", email: "admin@emergency.com", password: "admin123", role: "admin" },
      { name: "Dispatcher 1", email: "dispatcher@emergency.com", password: "dispatch123", role: "dispatcher" },
      { name: "Apollo Hospital Staff", email: "apollo@emergency.com", password: "hospital123", role: "hospital", hospitalName: "Apollo Hospitals" },
    ]);
    res.json({ success: true, message: "Demo users created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
