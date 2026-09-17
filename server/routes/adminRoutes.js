const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const adminController = require("../controllers/adminController");

const {
  registerAdmin,
  loginAdmin,
  getAdminRegistrationStatus,

  getAdminProfile,
  getDashboardStats,

  getPendingDoctors,
  approveDoctor,
  rejectDoctor,

  getPendingStaff,
  approveStaff,
  rejectStaff,
  getApprovedStaff,
  getSuspendedStaff,
  getAvailableStaffAdmin,

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


// Authentication
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/status", getAdminRegistrationStatus);


// Admin
router.get("/profile/:id",authMiddleware,roleMiddleware("admin"),getAdminProfile);
router.get("/dashboard/stats",authMiddleware,roleMiddleware("admin"), getDashboardStats);


// Doctor requests
router.get("/doctors/pending",authMiddleware,roleMiddleware("admin"),getPendingDoctors);
router.patch("/doctors/:id/approve",authMiddleware,roleMiddleware("admin"), approveDoctor);
router.patch("/doctors/:id/reject", authMiddleware,roleMiddleware("admin"),rejectDoctor);


// Staff requests
router.get("/staff/pending",authMiddleware,roleMiddleware("admin"), getPendingStaff);
router.patch("/staff/:id/approve",authMiddleware,roleMiddleware("admin"), approveStaff);
router.patch("/staff/:id/reject",authMiddleware, roleMiddleware("admin"),rejectStaff);
router.get("/staff/approved",authMiddleware,roleMiddleware("admin"), getApprovedStaff);
router.get("/staff/suspended",authMiddleware,roleMiddleware("admin"), getSuspendedStaff);
router.get("/staff/available",authMiddleware,roleMiddleware("admin"), getAvailableStaffAdmin);


// Admin action history
router.get(
  "/history/doctors/:adminId",authMiddleware,roleMiddleware("admin"),
  getDoctorHistory
);

router.get(
  "/history/staff/:adminId",authMiddleware,roleMiddleware("admin"),
  getStaffHistory
);
router.get(
  "/complaints",authMiddleware,roleMiddleware("admin"),
  getComplaints
);
// router.post(
//   "/complaints",
//   createComplaint
// );

router.patch(
  "/complaints/:id/suspend",authMiddleware,roleMiddleware("admin"),
  suspendFromComplaint
);

router.patch(
  "/complaints/:id/dismiss",authMiddleware,roleMiddleware("admin"),
  dismissComplaint
);


// Departments
router.get("/departments", authMiddleware,roleMiddleware("admin"),getDepartments);
router.post("/departments",authMiddleware, roleMiddleware("admin"),addDepartment);
router.put("/departments/:id",authMiddleware,roleMiddleware("admin"), updateDepartment);
//router.delete("/departments/:id",authMiddleware,roleMiddleware("admin"), deleteDepartment);
router.put(
"/departments/:id/disable",
adminController.disableDepartment
);


router.put(
"/departments/:id/enable",
adminController.enableDepartment
);

module.exports = router;