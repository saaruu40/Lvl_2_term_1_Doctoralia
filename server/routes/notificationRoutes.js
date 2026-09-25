const express=require("express");
const authMiddleware=require("../middleware/authMiddleware");
const roleMiddleware=require("../middleware/roleMiddleware");

const router=express.Router();


const {
getNotifications

}=require("../controllers/notificationController");



// Patient notifications: auth + patient role + own-ID check (inside controller)
// Staff notifications: auth + staff role + own-ID check (inside controller)
// Other roles use same endpoint but patient/staff role is enforced when :role matches
const verifyPatientNotificationRole = (req, res, next) => {
  if (req.params.role === "patient") {
    return roleMiddleware("patient")(req, res, next);
  }
  next();
};

const verifyStaffNotificationRole = (req, res, next) => {
  if (req.params.role === "staff") {
    return roleMiddleware("staff")(req, res, next);
  }
  next();
};

router.get(
"/:role/:id",
authMiddleware,
verifyPatientNotificationRole,
verifyStaffNotificationRole,
getNotifications
);



module.exports=router;