const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const router = express.Router();

// Public read: DoctorRegistration dropdown & search must fetch from DB
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);

// Protected writes: Only Admin can modify (single source of truth)
router.post("/", authMiddleware, roleMiddleware("admin"), createDepartment);
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateDepartment);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteDepartment);

module.exports = router;