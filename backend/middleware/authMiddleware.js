const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "emergency-hospital-secret-2026";

// ── Verify JWT token ──────────────────────────────────────────────────────────
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "Not authorized — no token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email, role, hospitalId }
    next();
  } catch {
    res.status(401).json({ error: "Token invalid or expired" });
  }
};

// ── Role check middleware ─────────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(" or ")}` });
  }
  next();
};

module.exports = { protect, requireRole };
