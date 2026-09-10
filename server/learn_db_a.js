// TRACK A: DB + pool.query for Beginner (you know INSERT)
// Run: node learn_db_a.js  (need Node in PATH + Postgres running)
// If node not found, add C:\Program Files\nodejs to PATH or reinstall Node 18+

require("dotenv").config();
const pool = require("./config/db");

async function demo() {
  console.log("=== Doctoralia DB Demo: Same SQL you know, via Node ===");
  console.log("ENV:", process.env.DB_NAME, "@", process.env.DB_HOST);

  try {
    // 1. SELECT like you do in pgAdmin
    console.log("\n1) SELECT COUNT(*) FROM department");
    const c = await pool.query("SELECT COUNT(*) FROM department");
    console.log("count =", c.rows[0].count, " rows =", c.rows);

    // 2. SELECT with $1 placeholder (prevents SQL injection)
    console.log("\n2) SELECT with $1 placeholder");
    const deptId = 1;
    const dept = await pool.query("SELECT department_id, department_name FROM department WHERE department_id = $1", [deptId]);
    console.log("deptId=1 =>", dept.rows[0] || "not found");

    // 3. INSERT with RETURNING (like INSERT + get generated id)
    console.log("\n3) INSERT INTO department ... RETURNING");
    const testName = "TestDept_" + Date.now();
    const ins = await pool.query(
      "INSERT INTO department (department_name, description) VALUES ($1,$2) RETURNING department_id, department_name",
      [testName, "demo for learning"]
    );
    console.log("inserted =>", ins.rows[0]);
    const newId = ins.rows[0].department_id;

    // 4. Dynamic WHERE (like search)
    console.log("\n4) Dynamic WHERE with LIKE");
    const search = "Cardio";
    const s = await pool.query("SELECT department_id, department_name FROM department WHERE LOWER(department_name) LIKE LOWER($1)", [`%${search}%`]);
    console.log("search Cardio =>", s.rows);

    // 5. UPDATE
    console.log("\n5) UPDATE ... RETURNING");
    const upd = await pool.query("UPDATE department SET description=$1 WHERE department_id=$2 RETURNING *", ["updated via Node demo", newId]);
    console.log("updated =>", upd.rows[0]);

    // 6. DELETE + verify
    console.log("\n6) DELETE ... RETURNING");
    const del = await pool.query("DELETE FROM department WHERE department_id=$1 RETURNING department_id", [newId]);
    console.log("deleted =>", del.rows[0], "rowCount", del.rowCount);

    // 7. JOIN example (what controllers do: patientController getApprovedDoctors)
    console.log("\n7) JOIN doctor + department (like getApprovedDoctors)");
    const j = await pool.query(`
      SELECT d.doctor_id, d.full_name, dep.department_name
      FROM doctor d LEFT JOIN department dep ON d.department_id=dep.department_id
      WHERE d.approval_status='approved' ORDER BY d.full_name LIMIT 3
    `);
    console.log("joined rows =", j.rows);

    // 8. M:N example (schedule + doctor_schedule)
    console.log("\n8) M:N JOIN schedule + doctor_schedule");
    const mn = await pool.query(`
      SELECT s.schedule_id, s.available_date, s.start_time, ds.status
      FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
      LIMIT 3
    `);
    console.log("m:n rows =", mn.rows);

    console.log("\n=== DONE - This is exactly what pool.query does in controllers ===");
    console.log("Try next: change $1 values, run INSERT on patient, or copy pattern to your own route.");
  } catch (e) {
    console.error("ERROR:", e.message);
    console.error("Hint: Is Postgres running? Check services.msc -> postgresql, and DB_NAME=doctoralia_moriom exists. Run psql -U postgres -c '\\l'");
  } finally {
    await pool.end();
  }
}

demo();
