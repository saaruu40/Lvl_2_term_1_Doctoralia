const express = require("express");
const multer = require("multer");
const path = require("path");


const {
  applyDoctor,
  loginDoctor,
} = require("../controllers/doctorController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/doctors");
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

router.post(
  "/apply",
  upload.single("profile_photo"),
  applyDoctor
);
router.post("/login", loginDoctor);
module.exports = router;