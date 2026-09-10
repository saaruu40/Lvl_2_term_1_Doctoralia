// learnController.js - Track C: Minimal Node.js API examples for beginner
// Each function is one pattern you already know as INSERT/SELECT, but via Express + pool.query
const pool = require("../config/db");

// 1) Health - no DB, just res.json
const health = (req, res) => {
  res.json({ message: "Learn API is running", time: new Date().toISOString(), env: process.env.DB_NAME });
};

// 2) SELECT - like you do in psql, but via pool.query with $1
const testSelect = async (req, res) => {
  try {
    // Query param ?search=Cardio (like departmentController.js:4)
    const search = req.query.search || "";
    let query = "SELECT department_id, department_name, description FROM department";
    const values = [];
    if (search) {
      query += " WHERE LOWER(department_name) LIKE LOWER($1)";
      values.push(`%${search}%`);
    }
    query += " ORDER BY department_id ASC LIMIT 5";
    const result = await pool.query(query, values); // $1 placeholder prevents injection
    res.json({ count: result.rowCount, departments: result.rows });
  } catch (e) {
    res.status(500).json({ message: "SELECT failed", error: e.message });
  }
};

// 3) INSERT - takes JSON body, inserts, returns new row (like patientController.js:48)
const testInsert = async (req, res) => {
  try {
    const { department_name, description } = req.body;
    if (!department_name) return res.status(400).json({ message: "department_name is required" });
    // Check duplicate like adminController.js:663
    const dup = await pool.query("SELECT department_id FROM department WHERE LOWER(department_name)=LOWER($1)", [department_name]);
    if (dup.rows.length > 0) return res.status(409).json({ message: "Department already exists", existing: dup.rows[0] });
    const result = await pool.query(
      "INSERT INTO department (department_name, description) VALUES ($1,$2) RETURNING department_id, department_name, description",
      [department_name, description || "learn demo"]
    );
    res.status(201).json({ message: "INSERT successful (like you know)", department: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: "INSERT failed", error: e.message });
  }
};

// 4) UPDATE + DELETE - path param :id
const testUpdate = async (req, res) => {
  try {
    const id = req.params.id;
    const { department_name, description } = req.body;
    const result = await pool.query(
      "UPDATE department SET department_name=COALESCE($1,department_name), description=COALESCE($2,description) WHERE department_id=$3 RETURNING *",
      [department_name, description, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "UPDATE successful", department: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: "UPDATE failed", error: e.message });
  }
};

const testDelete = async (req, res) => {
  try {
    const id = req.params.id;
    // Guard like departmentController.js:161 check doctors before delete
    const used = await pool.query("SELECT COUNT(*) FROM doctor WHERE department_id=$1", [id]);
    if (Number(used.rows[0].count) > 0) return res.status(409).json({ message: "Cannot delete, doctors use this department" });
    const result = await pool.query("DELETE FROM department WHERE department_id=$1 RETURNING department_id", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "DELETE successful", deleted: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: "DELETE failed", error: e.message });
  }
};

// 5) TRANSACTION - BEGIN/COMMIT/ROLLBACK (like makePayment:590, createPrescription:863)
const testTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const { patient_id, doctor_id } = req.body;
    if (!patient_id || !doctor_id) return res.status(400).json({ message: "patient_id and doctor_id required" });
    await client.query("BEGIN");
    const app = await client.query("INSERT INTO appointment (patient_id, doctor_id, appointment_status) VALUES ($1,$2,'pending') RETURNING appointment_id", [patient_id, doctor_id]);
    const aid = app.rows[0].appointment_id;
    // Simulate staff step: leave as pending, just show atomicity
    await client.query("COMMIT");
    res.status(201).json({ message: "Transaction ok: appointment created atomically", appointment_id: aid });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Transaction rolled back", error: e.message });
  } finally {
    client.release();
  }
};

module.exports = { health, testSelect, testInsert, testUpdate, testDelete, testTransaction };
