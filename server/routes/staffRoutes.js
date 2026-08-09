const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  applyStaff,
  loginStaff,
    scheduleAppointment,
} = require("../controllers/staffController");

const router = express.Router();

const staffUploadDir = path.join("uploads", "staff");

if (!fs.existsSync(staffUploadDir)) {
  fs.mkdirSync(staffUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, staffUploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("শুধু JPG, PNG বা WEBP image upload করা যাবে।"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/apply", upload.single("profile_pic"), applyStaff);
router.post("/login", loginStaff);
router.patch(
  "/appointments/:id/schedule",
  scheduleAppointment
);

module.exports = router;
