// const express = require("express");
// const multer = require("multer");
// const path = require("path");


// const {
//   applyDoctor,
//   loginDoctor,
// } = require("../controllers/doctorController");

// const router = express.Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/doctors");
//   },

//   filename: (req, file, cb) => {
//     const uniqueName =
//       `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
//       path.extname(file.originalname);

//     cb(null, uniqueName);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [
//     "image/jpeg",
//     "image/jpg",
//     "image/png",
//     "image/webp",
//   ];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("শুধু JPG, PNG বা WEBP image upload করা যাবে।"));
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024,
//   },
// });

// router.post(
//   "/apply",
//   upload.single("profile_photo"),
//   applyDoctor
// );
// router.post("/login", loginDoctor);
// module.exports = router;
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");


const {
  applyDoctor,
  loginDoctor,

  getDoctorProfile,
  getDoctorDashboardStats,
  getDoctorAppointments,

  getMedicines,
  getTests,

  createPrescription,

  getReferralDoctors,
  createReferral,
  getSentReferrals,
  getReceivedReferrals,

  getDoctorComplaintTargets,
  createDoctorComplaint,
  getDoctorComplaints,

} = require("../controllers/doctorController");

const {
  getWindowInfo,
  getHospitals,
  getMySchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  updateAvailability,
} = require("../controllers/doctorScheduleController");


const router = express.Router();


// =====================================================
// DOCTOR UPLOAD DIRECTORY
// =====================================================

const doctorUploadDir =
  path.join("uploads", "doctors");


if (!fs.existsSync(doctorUploadDir)) {
  fs.mkdirSync(
    doctorUploadDir,
    {
      recursive: true,
    }
  );
}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(
      null,
      doctorUploadDir
    );
  },

  filename: (req, file, cb) => {

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}` +
      path.extname(
        file.originalname
      );

    cb(
      null,
      uniqueName
    );
  },
});


// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = (
  req,
  file,
  cb
) => {

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];


  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {

    cb(
      null,
      true
    );

  } else {

    cb(
      new Error(
        "Only JPG, PNG or WEBP images can be uploaded."
      )
    );
  }
};


// =====================================================
// MULTER
// =====================================================

const upload = multer({

  storage,

  fileFilter,

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },
});


// =====================================================
// PUBLIC ROUTES
// =====================================================


// Doctor Application

router.post(
  "/apply",
  upload.single("profile_photo"),
  applyDoctor
);


// Doctor Login

router.post(
  "/login",
  loginDoctor
);


// =====================================================
// ALL ROUTES BELOW NEED DOCTOR JWT
// =====================================================

router.use(
  authMiddleware,
  roleMiddleware("doctor")
);


// =====================================================
// PROFILE
// =====================================================

router.get(
  "/profile",
  getDoctorProfile
);


// =====================================================
// DASHBOARD
// =====================================================

router.get(
  "/dashboard/stats",
  getDoctorDashboardStats
);


// =====================================================
// APPOINTMENTS
// =====================================================

router.get(
  "/appointments",
  getDoctorAppointments
);


// =====================================================
// MEDICINE
// =====================================================

router.get(
  "/medicines",
  getMedicines
);


// =====================================================
// TEST
// =====================================================

router.get(
  "/tests",
  getTests
);


// =====================================================
// PRESCRIPTION
// =====================================================

router.post(
  "/prescriptions",
  createPrescription
);


// =====================================================
// REFERRAL
// =====================================================


// Approved doctors available for referral

router.get(
  "/referral-doctors",
  getReferralDoctors
);


// Create referral

router.post(
  "/referrals",
  createReferral
);


// Referrals sent by logged-in doctor

router.get(
  "/referrals/sent",
  getSentReferrals
);


// Referrals received by logged-in doctor

router.get(
  "/referrals/received",
  getReceivedReferrals
);


// =====================================================
// COMPLAINT
// =====================================================


// Patient + Staff list

router.get(
  "/complaint-targets",
  getDoctorComplaintTargets
);


// Submit complaint

router.post(
  "/complaints",
  createDoctorComplaint
);


// Doctor's complaint history

router.get(
  "/complaints",
  getDoctorComplaints
);


// =====================================================
// SCHEDULE MANAGEMENT (Doctor owns own schedules)
// Window: 00:01-03:00 for following day only
// =====================================================

router.get("/hospitals", getHospitals);

router.get("/schedules/window", getWindowInfo);

router.get("/schedules", getMySchedules);

router.post("/schedules", createSchedule);

router.put("/schedules/:id", updateSchedule);

router.delete("/schedules/:id", deleteSchedule);

router.patch("/schedules/:id/availability", updateAvailability);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;