// const express = require("express");

// const {
//   registerPatient,
//   loginPatient,
// } = require("../controllers/patientController");

// const router = express.Router();

// router.post("/register", registerPatient);
// router.post("/login", loginPatient);

// module.exports = router;
const express = require("express");

const {
  registerPatient,
  loginPatient,

  getApprovedDoctors,
  getPatientDepartments,
  getDoctorDetails,
  getAvailableStaff,

  createAppointment,
  getPatientAppointments,
  deleteAppointment,

  makePayment,

  getPatientProfile,
  updatePatientProfile,

  createPatientComplaint,
  getPatientComplaints,
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


module.exports = router;