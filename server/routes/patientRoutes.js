
const express = require("express");
const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

// Verify that JWT patient_id matches :id or :patientId param (403 if mismatch)
const verifyPatientOwnership = (req, res, next) => {
  const tokenPatientId = req.user && req.user.patient_id;
  const paramId = req.params.id || req.params.patientId;
  if (!tokenPatientId) {
    return res.status(401).json({ message: "Unauthorized. Please login as patient." });
  }
  if (String(tokenPatientId) !== String(paramId)) {
    return res.status(403).json({ message: "Forbidden: you can only access your own data." });
  }
  next();
};

const {
  registerPatient,
  loginPatient,

  getApprovedDoctors,
  getAvailableDoctorsByDate,
  getAvailableSchedulesByDate,
  getPatientDepartments,
  getDoctorDetails,
  getDoctorAvailableSchedules,
  getAvailableStaff,
  getDoctorsWithoutStaff,
  getStaffRequiredStatus,

  createAppointment,
  getPatientAppointments,
  deleteAppointment,

  makePayment,

  getPatientProfile,
  updatePatientProfile,

  createPatientComplaint,
  getPatientComplaints,
  getPatientPrescriptions,
getPatientReferrals,
} = require("../controllers/patientController");


const router = express.Router();


// ===============================
// AUTH
// ===============================

router.post(
  "/register",
  registerPatient
);

router.post(
  "/login",
  loginPatient
);


// ===============================
// DOCTORS / DEPARTMENTS
// ===============================

router.get(
  "/doctors",
  getApprovedDoctors
);

// New Date-filtered flows (Req 12,13)
router.get(
  "/doctors/available-by-date",
  getAvailableDoctorsByDate
);

router.get(
  "/doctors/:id/schedules/by-date",
  getAvailableSchedulesByDate
);

router.get(
  "/staff-required",
  getStaffRequiredStatus
);

router.get(
  "/doctors/looking-for-staff",
  getDoctorsWithoutStaff
);

router.get(
  "/departments",
  getPatientDepartments
);

router.get(
  "/doctors/:id",
  getDoctorDetails
);

router.get(
  "/doctors/:id/schedules",
  getDoctorAvailableSchedules
);


// ===============================
// STAFF LIST FOR COMPLAINT
// ===============================

router.get(
  "/staff",
  getAvailableStaff
);


// ===============================
// PROFILE — patient can only view/update own (auth+role+own check)
// ===============================

router.get(
  "/profile/:id",
  authMiddleware,
  roleMiddleware("patient"),
  verifyPatientOwnership,
  getPatientProfile
);

router.put(
  "/profile/:id",
  authMiddleware,
  roleMiddleware("patient"),
  verifyPatientOwnership,
  updatePatientProfile
);


// ===============================
// APPOINTMENT
// ===============================

router.post(
  "/appointments",
  authMiddleware,
  roleMiddleware("patient"),
  createAppointment
);

router.get(
  "/:patientId/appointments",
  authMiddleware,
  roleMiddleware("patient"),
  verifyPatientOwnership,
  getPatientAppointments
);

router.delete(
  "/appointments/:id",
  authMiddleware,
  roleMiddleware("patient"),
  deleteAppointment
);


// ===============================
// PAYMENT — patient_id from JWT only (auth+role)
// ===============================

router.post(
  "/payments",
  authMiddleware,
  roleMiddleware("patient"),
  makePayment
);


// ===============================
// COMPLAINT — patient_id from JWT, own check for GET
// ===============================

router.post(
  "/complaints",
  authMiddleware,
  roleMiddleware("patient"),
  createPatientComplaint
);

router.get(
  "/:patientId/complaints",
  authMiddleware,
  roleMiddleware("patient"),
  verifyPatientOwnership,
  getPatientComplaints
);
// ===============================
// PRESCRIPTIONS
// ===============================

router.get(
  "/prescriptions",
  authMiddleware,
  roleMiddleware("patient"),
  getPatientPrescriptions
);


// ===============================
// REFERRALS
// ===============================

router.get(
  "/referrals",
  authMiddleware,
  roleMiddleware("patient"),
  getPatientReferrals
);


module.exports = router;