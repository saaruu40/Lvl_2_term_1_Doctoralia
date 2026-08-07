const express = require("express");

const {
  registerAdmin,
  loginAdmin,
  getPendingDoctors,
  approveDoctor,
} = require("../controllers/adminController");

const router = express.Router();


// Admin registration
router.post("/register", registerAdmin);


// Admin login
router.post("/login", loginAdmin);


// Get pending doctors
router.get("/doctors/pending", getPendingDoctors);


// Approve doctor
router.patch("/doctors/:id/approve", approveDoctor);


module.exports = router;