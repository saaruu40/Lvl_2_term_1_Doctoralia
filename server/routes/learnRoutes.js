const express = require("express");
const router = express.Router();
const { health, testSelect, testInsert, testUpdate, testDelete, testTransaction } = require("../controllers/learnController");

// Public learn APIs - no auth, for practice
router.get("/health", health);                 // GET /api/learn/health
router.get("/select", testSelect);             // GET /api/learn/select?search=Cardio
router.post("/insert", testInsert);            // POST /api/learn/insert  {department_name, description}
router.put("/update/:id", testUpdate);         // PUT /api/learn/update/25
router.delete("/delete/:id", testDelete);      // DELETE /api/learn/delete/25
router.post("/transaction", testTransaction);   // POST /api/learn/transaction {patient_id, doctor_id}

module.exports = router;
