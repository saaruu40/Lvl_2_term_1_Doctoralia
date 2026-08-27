const express = require("express");

const {
  loginAdmin,

  getAdminProfile,
  getDashboardStats,

  getPendingDoctors,
  approveDoctor,
  rejectDoctor,

  getPendingStaff,
  approveStaff,
  rejectStaff,

  getDoctorHistory,
  getStaffHistory,

  getComplaints,
 // createComplaint,
  suspendFromComplaint,
  dismissComplaint,

  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/adminController");

const router = express.Router();


// Authentication (single admin login only — staff uses /api/staff/login)
router.post("/login", loginAdmin);


// Admin
router.get("/profile/:id", getAdminProfile);
router.get("/dashboard/stats", getDashboardStats);


// Doctor requests
router.get("/doctors/pending", getPendingDoctors);
router.patch("/doctors/:id/approve", approveDoctor);
router.patch("/doctors/:id/reject", rejectDoctor);


// Staff requests
router.get("/staff/pending", getPendingStaff);
router.patch("/staff/:id/approve", approveStaff);
router.patch("/staff/:id/reject", rejectStaff);


// Admin action history
router.get(
  "/history/doctors/:adminId",
  getDoctorHistory
);

router.get(
  "/history/staff/:adminId",
  getStaffHistory
);
router.get(
  "/complaints",
  getComplaints
);
// router.post(
//   "/complaints",
//   createComplaint
// );

router.patch(
  "/complaints/:id/suspend",
  suspendFromComplaint
);

router.patch(
  "/complaints/:id/dismiss",
  dismissComplaint
);


// Departments
router.get("/departments", getDepartments);
router.post("/departments", addDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);


module.exports = router;