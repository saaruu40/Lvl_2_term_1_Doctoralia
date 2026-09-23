const express=require("express");

const router=express.Router();


const {
getNotifications

}=require("../controllers/notificationController");



router.get(
"/:role/:id",
getNotifications
);



module.exports=router;