
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");


const {

  applyStaff,

  loginStaff,
  getStaffRegistrationStatus,

  getStaffProfile,
  getMyAssignment,

  getStaffDashboardStats,

  getStaffAppointments,

  getHospitals,

  scheduleAppointment,
  getAvailableSchedules,
  approveAppointment,
  rejectAppointment,

  getComplaintTargets,

  createStaffComplaint,

  getStaffComplaints,

} = require(
  "../controllers/staffController"
);


const router =
  express.Router();


// =====================================================
// STAFF UPLOAD DIRECTORY
// =====================================================

const staffUploadDir =
  path.join(
    "uploads",
    "staff"
  );


if (
  !fs.existsSync(
    staffUploadDir
  )
) {

  fs.mkdirSync(
    staffUploadDir,
    {
      recursive: true,
    }
  );
}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(
          null,
          staffUploadDir
        );
      },


    filename:
      (req, file, cb) => {

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

const fileFilter =
  (req, file, cb) => {

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

const upload =
  multer({

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


// STAFF REGISTRATION STATUS (for UI banner: one-time registration)
router.get("/status", getStaffRegistrationStatus);

// STAFF REGISTRATION

router.post(

  "/apply",

  upload.single(
    "profile_pic"
  ),

  applyStaff
);


// STAFF LOGIN

router.post(

  "/login",

  loginStaff
);


// =====================================================
// STAFF PROTECTED ROUTES
// =====================================================
//
// Everything below requires:
//
// 1. Valid JWT
// 2. role === "staff"
//
// =====================================================

router.use(

  authMiddleware,

  roleMiddleware("staff")
);


// =====================================================
// PROFILE
// =====================================================

router.get(

  "/profile",

  getStaffProfile
);

router.get(
  "/my-assignment",
  getMyAssignment
);


// =====================================================
// DASHBOARD STATISTICS
// =====================================================

router.get(

  "/dashboard/stats",

  getStaffDashboardStats
);


// =====================================================
// APPOINTMENTS
// =====================================================


// GET ALL APPOINTMENTS

router.get(

  "/appointments",

  getStaffAppointments
);


// GET HOSPITAL LIST

router.get(

  "/hospitals",

  getHospitals
);


// ASSIGN HOSPITAL + PICK EXISTING DOCTOR SLOT (staff cannot create doctor schedules)
// Staff only assigns hospital + existing available slot created by doctor
router.patch(

  "/appointments/:id/schedule",

  scheduleAppointment
);

// VIEW AVAILABLE SLOTS FOR A DOCTOR (read-only, staff cannot modify)
router.get(
  "/available-schedules",
  getAvailableSchedules
);

// APPROVE / REJECT - read-only relationships, capacity + race protected
router.patch(
  "/appointments/:id/approve",
  approveAppointment
);

router.patch(
  "/appointments/:id/reject",
  rejectAppointment
);


// =====================================================
// COMPLAINT
// =====================================================


// GET PATIENT + DOCTOR LIST

router.get(

  "/complaint-targets",

  getComplaintTargets
);


// CREATE STAFF COMPLAINT

router.post(

  "/complaints",

  createStaffComplaint
);


// STAFF COMPLAINT HISTORY

router.get(

  "/complaints",

  getStaffComplaints
);


// =====================================================
// EXPORT
// =====================================================

module.exports =
  router;