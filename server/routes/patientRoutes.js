
const express = require("express");
const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const {
  registerPatient,
  loginPatient,

  getApprovedDoctors,
  getPatientDepartments,
  getDoctorDetails,
  getDoctorAvailableSchedules,
  getAvailableStaff,

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
// PROFILE
// ===============================

router.get(
  "/profile/:id",
  getPatientProfile
);

router.put(
  "/profile/:id",
  updatePatientProfile
);


// ===============================
// APPOINTMENT
// ===============================

router.post(
  "/appointments",
  createAppointment
);

router.get(
  "/:patientId/appointments",
  getPatientAppointments
);

router.delete(
  "/appointments/:id",
  deleteAppointment
);


// ===============================
// PAYMENT
// ===============================

router.post(
  "/payments",
  makePayment
);


// ===============================
// COMPLAINT
// ===============================

router.post(
  "/complaints",
  createPatientComplaint
);

router.get(
  "/:patientId/complaints",
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