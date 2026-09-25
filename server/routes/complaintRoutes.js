const express = require("express");

const {
  createComplaint,
} = require("../controllers/complaintController");

const router = express.Router();

// DEPRECATED for Staff — Staff must use POST /api/staff/complaints (🔒 staff, filed_by_id from req.user.staff_id)
// Generic endpoint kept for backward compat (patient/doctor flows) but not recommended for Staff
router.post("/", createComplaint);

module.exports = router;