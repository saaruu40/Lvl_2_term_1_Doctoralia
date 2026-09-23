const pool = require("../config/db");


const getNotifications = async(req,res)=>{


try{


const {
role,
id
}=req.params;



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