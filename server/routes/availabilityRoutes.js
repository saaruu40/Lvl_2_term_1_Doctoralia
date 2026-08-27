const express = require("express");
const { getAvailableDoctors } = require("../controllers/availabilityController");
const router = express.Router();

router.get("/doctors", getAvailableDoctors);

module.exports = router;
