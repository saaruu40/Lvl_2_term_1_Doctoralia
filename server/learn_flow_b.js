// TRACK B: Full lifecycle via Node pool.query (mirrors controllers, but without JWT/bcrypt)
// Run: node learn_flow_b.js
// Needs Postgres running + learn_db_a.js working first. This uses same pool as server.
require("dotenv").config();
const pool = require("./config/db");

async function flow() {
  const client = await pool.connect();
  try {
    console.log("=== Flow B: pending -> scheduled -> confirmed -> completed ===");

    // 1) Find ids (like getApprovedDoctors, getPatient)
    const pat = await client.query("SELECT patient_id FROM patient LIMIT 1");
    const doc = await client.query("SELECT doctor_id FROM doctor WHERE approval_status='approved' LIMIT 1");
    const hosp = await client.query("SELECT hospital_id FROM hospital LIMIT 1");
    if (!pat.rows[0] || !doc.rows[0] || !hosp.rows[0]) {
      console.log("Need at least 1 patient, 1 approved doctor, 1 hospital. Seed: psql -f database/seed.sql and register via API.");
      return;
    }
    const patient_id = pat.rows[0].patient_id;
    const doctor_id = doc.rows[0].doctor_id;
    const hospital_id = hosp.rows[0].hospital_id;
    console.log(`Using patient=${patient_id} doctor=${doctor_id} hospital=${hospital_id}`);

    // 2) PATIENT: INSERT pending (patientController.js:435)
    console.log("\n1) INSERT appointment pending");
    const ap = await client.query(
      "INSERT INTO appointment (patient_id, doctor_id, appointment_status) VALUES ($1,$2,'pending') RETURNING appointment_id, appointment_status",
      [patient_id, doctor_id]
    );
    const appointment_id = ap.rows[0].appointment_id;
    console.log("created appointment", ap.rows[0]);

    // 3) DOCTOR: create/find schedule for tomorrow 10:00-11:00 (doctorScheduleController.js:118 findOrCreateSchedule)
    console.log("\n2) Doctor schedule for tomorrow");
    await client.query("BEGIN");
    let schedule_id;
    const existing = await client.query(
      "SELECT schedule_id FROM schedule WHERE available_date = CURRENT_DATE + 1 AND start_time='10:00'::time AND end_time='11:00'::time AND hospital_id=$1 LIMIT 1",
      [hospital_id]
    );
    if (existing.rows[0]) {
      schedule_id = existing.rows[0].schedule_id;
      console.log("reuse schedule", schedule_id);
    } else {
      const ins = await client.query(
        "INSERT INTO schedule (available_date, start_time, end_time, hospital_id) VALUES (CURRENT_DATE+1,'10:00','11:00',$1) RETURNING schedule_id",
        [hospital_id]
      );
      schedule_id = ins.rows[0].schedule_id;
      console.log("new schedule", schedule_id);
    }
    await client.query("INSERT INTO doctor_schedule (doctor_id, schedule_id, status) VALUES ($1,$2,'AVAILABLE') ON CONFLICT DO NOTHING", [doctor_id, schedule_id]);
    await client.query("COMMIT");

    // Verify M:N available (staffController.js:1381)
    const avail = await client.query(
      "SELECT s.schedule_id, s.available_date, ds.status FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE ds.doctor_id=$1 AND ds.status='AVAILABLE' LIMIT 3",
      [doctor_id]
    );
    console.log("available slots", avail.rows);

    // 4) STAFF: UPDATE to scheduled (staffController.js:1280)
    console.log("\n3) Staff UPDATE appointment -> scheduled");
    await client.query("BEGIN");
    const staffUpd = await client.query(
      "UPDATE appointment SET hospital_id=$1, schedule_id=$2, appointment_status='scheduled' WHERE appointment_id=$3 RETURNING *",
      [hospital_id, schedule_id, appointment_id]
    );
    console.log("scheduled", staffUpd.rows[0]);
    await client.query("COMMIT");

    // 5) PATIENT: PAY -> confirmed (patientController.js:790 + 815) transaction
    console.log("\n4) Patient PAY transaction");
    await client.query("BEGIN");
    const pay = await client.query(
      "INSERT INTO payment (appointment_id, amount, payment_method, payment_status) VALUES ($1, 500, 'cash', 'paid') RETURNING payment_id, amount",
      [appointment_id]
    );
    console.log("payment", pay.rows[0]);
    await client.query("UPDATE appointment SET appointment_status='confirmed' WHERE appointment_id=$1", [appointment_id]);
    await client.query("COMMIT");
    console.log("appointment now confirmed");

    // 6) DOCTOR: prescription -> completed (doctorController.js:1016)
    console.log("\n5) Doctor prescription -> completed");
    await client.query("BEGIN");
    const pres = await client.query(
      "INSERT INTO prescription (appointment_id, diagnosis, advice, created_at) VALUES ($1,'Demo Fever','Rest', CURRENT_TIMESTAMP) RETURNING prescription_id",
      [appointment_id]
    );
    console.log("prescription", pres.rows[0]);
    await client.query("UPDATE appointment SET appointment_status='completed' WHERE appointment_id=$1", [appointment_id]);
    await client.query("COMMIT");
    console.log("appointment now completed");

    // 7) Read final state
    const final = await client.query(
      "SELECT a.appointment_id, a.appointment_status, p.full_name as patient, d.full_name as doctor, s.available_date FROM appointment a LEFT JOIN patient p ON a.patient_id=p.patient_id LEFT JOIN doctor d ON a.doctor_id=d.doctor_id LEFT JOIN schedule s ON a.schedule_id=s.schedule_id WHERE a.appointment_id=$1",
      [appointment_id]
    );
    console.log("\nFinal:", final.rows[0]);
    console.log("\n=== Flow done. This is exactly what controllers do, but via pool.query ===");
    console.log("Cleanup: DELETE FROM prescription WHERE appointment_id=$1; DELETE FROM payment WHERE appointment_id=$1; DELETE FROM appointment WHERE appointment_id=$1;");
    console.log(`Example: DELETE FROM appointment WHERE appointment_id=${appointment_id}; (only pending deletable via API, but SQL allows)`);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("FLOW ERROR:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
flow();
