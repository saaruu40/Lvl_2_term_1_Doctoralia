const pool = require("../config/db");


const getNotifications = async(req,res)=>{


try{


const {
role,
id
}=req.params;

    // Better authorization: users can only fetch their own notifications
    // req.user comes from authMiddleware ( { admin_id|doctor_id|patient_id|staff_id, role } )
    if (req.user) {
      const tokenRole = req.user.role;
      const tokenId = String(req.user[`${tokenRole}_id`] ?? req.user.admin_id ?? req.user.doctor_id ?? req.user.patient_id ?? req.user.staff_id ?? "");
      if (String(role) !== String(tokenRole) || String(id) !== tokenId) {
        return res.status(403).json({ message: "Access denied. You can only access your own notifications." });
      }
    }



const result = await pool.query(

`
SELECT *
FROM notification

WHERE receiver_role=$1
AND receiver_id=$2

ORDER BY created_at DESC

`,
[
role,
id
]


);



res.status(200).json({

notifications:result.rows

});


}

catch(error){


console.log(error);


res.status(500).json({

message:"Notification loading failed"

});


}



};



module.exports={
getNotifications
};