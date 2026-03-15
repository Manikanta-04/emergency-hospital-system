const express = require("express");
const router = express.Router();
const {
  getAllHospitals,
  getNearbyHospitals,
  getHospitalById,
  updateHeartbeat,
} = require("../controllers/hospitalController");

router.get("/", getAllHospitals);
router.get("/nearby", getNearbyHospitals);
router.get("/:id", getHospitalById);
router.post("/:id/heartbeat", updateHeartbeat);

module.exports = router;
