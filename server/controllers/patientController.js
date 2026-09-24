const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const registerPatient = async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      phone_number,
      gender,
      date_of_birth,
      blood_group,
      address,
    } = req.body;

    if (
      !full_name ||
      !email ||
      !password ||
      !phone_number ||
      !gender ||
      !date_of_birth ||
      !blood_group ||
      !address
    ) {
      return res.status(400).json({
        message: "Have to fill all blanks",
      });
    }

    const existingPatient = await pool.query(
      `SELECT patient_id
       FROM patient
       WHERE email = $1`,
      [email]
    );

    if (existingPatient.rows.length > 0) {
      return res.status(409).json({
        message: "This email is already exist",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO patient (
        full_name,
        email,
        password,
        phone_number,
        gender,
        date_of_birth,
        blood_group,
        address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        patient_id,
        full_name,
        email,
        phone_number,
        gender,
        date_of_birth,
        blood_group,
        address`,
      [
        full_name,
        email,
        hashedPassword,
        phone_number,
        gender,
        date_of_birth,
        blood_group,
        address,
      ]
    );

    return res.status(201).json({
      message: "Patient registration successful.",
      patient: result.rows[0],
    });
  } catch (error) {
    console.error("Patient registration error:", error);

    return res.status(500).json({
      message: "Patient registration not done ",
      error: error.message,
    });
  }
};


const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT
        patient_id,
        full_name,
        email,
        password,
        phone_number,
        gender,
        date_of_birth,
        blood_group,
        address,
        suspended_until
       FROM patient
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const patient = result.rows[0];

    const isPasswordValid = await bcrypt.compare(
      password,
      patient.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }
   
    // =====================================================
    // EXPIRED SUSPENSION
    // =====================================================

    if (
      patient.suspended_until &&
      new Date(patient.suspended_until) <= new Date()
    ) {
      await pool.query(
        `UPDATE patient
         SET suspended_until = NULL
         WHERE patient_id = $1`,
        [patient.patient_id]
      );

      patient.suspended_until = null;
    }

    // =====================================================
    // CURRENTLY SUSPENDED
    // =====================================================

    if (
      patient.suspended_until &&
      new Date(patient.suspended_until) > new Date()
    ) {
      return res.status(403).json({
        message:
          "Your account is temporarily suspended. You cannot use Doctoralia until the suspension period ends.",

        suspended_until:
          patient.suspended_until,
      });
    }
    const token = jwt.sign(
  {
    patient_id: patient.patient_id,
    role: "patient",
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "1d",
  }
);
  

    delete patient.password;

    return res.status(200).json({
      message: "Login successful.",
      token:token,
      patient,
    });

  } catch (error) {
    console.error(
      "Patient login error:",
      error
    );

    return res.status(500).json({
      message:
        "Patient login failed.",
      error: error.message,
    });
  }
};
const getApprovedDoctors = async (req, res) => {
  try {
    const { department_id, search } = req.query;

    let query = `
      SELECT
        d.doctor_id,
        d.department_id,
        d.full_name,
        d.email,
        d.phone_number,
        d.qualification,
        d.specification,
        d.medical_registration_no,
        d.new_patient_fee,
        d.followup_fee,
        d.max_patient_num,
        d.profile_photo,
        dep.department_name
      FROM doctor d
      LEFT JOIN department dep
        ON d.department_id = dep.department_id
      WHERE d.approval_status = 'approved'
        AND (
          d.suspended_until IS NULL
          OR d.suspended_until <= CURRENT_TIMESTAMP
        )
    `;

    const values = [];
    let index = 1;

    if (department_id) {
      query += ` AND d.department_id = $${index}`;
      values.push(department_id);
      index++;
    }

    if (search) {
      query += `
        AND LOWER(d.full_name)
        LIKE LOWER($${index})
      `;

      values.push(`%${search}%`);
      index++;
    }

    query += ` ORDER BY d.full_name ASC`;

    const result = await pool.query(
      query,
      values
    );

    return res.status(200).json({
      doctors: result.rows,
    });

  } catch (error) {
    console.error("Get doctors error:", error);

    return res.status(500).json({
      message: "Could not fetch doctors.",
      error: error.message,
    });
  }
};
const getPatientDepartments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        department_id,
        department_name,
        description
       FROM department
       WHERE (status = 'active' OR status IS NULL)
       ORDER BY department_name ASC`
    );

    return res.status(200).json({
      departments: result.rows,
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not fetch departments.",
      error: error.message,
    });
  }
};
const getDoctorAvailableSchedules = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { isSlotExpired } = require("../utils/scheduleWindow");
    const now = new Date();
    const result = await pool.query(
      `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status, h.hospital_name
       FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id LEFT JOIN hospital h ON s.hospital_id=h.hospital_id
       WHERE ds.doctor_id=$1 AND ds.status='AVAILABLE' ORDER BY s.available_date ASC, s.start_time ASC`,
      [doctorId]
    );
    const available = result.rows.filter((s) => !isSlotExpired(s.available_date, s.end_time, now));
    return res.status(200).json({ schedules: available });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch doctor schedules.", error: error.message });
  }
};

const getDoctorDetails = async (req, res) => {
  try {
    const doctorId = req.params.id;

    const result = await pool.query(
      `SELECT
        d.doctor_id,
        d.department_id,
        d.full_name,
        d.email,
        d.phone_number,
        d.qualification,
        d.specification,
        d.medical_registration_no,
        d.new_patient_fee,
        d.followup_fee,
        d.max_patient_num,
        d.profile_photo,
        dep.department_name
       FROM doctor d
       LEFT JOIN department dep
         ON d.department_id = dep.department_id
       WHERE d.doctor_id = $1
         AND d.approval_status = 'approved'
         AND (
           d.suspended_until IS NULL
           OR d.suspended_until <= CURRENT_TIMESTAMP
         )`,
      [doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Approved doctor not found.",
      });
    }

    return res.status(200).json({
      doctor: result.rows[0],
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not fetch doctor details.",
      error: error.message,
    });
  }
};
// =====================================================
// AVAILABLE DOCTORS FOR A DATE (Req 12) - backend determines
// =====================================================
const getAvailableDoctorsByDate = async (req, res) => {
  try {
    const { date, department_id } = req.query;
    if (!date) return res.status(400).json({ message: "date query param (YYYY-MM-DD) is required." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });

    const { isSlotExpired } = require("../utils/scheduleWindow");
    const now = new Date();

    let query = `
      SELECT DISTINCT
        d.doctor_id,
        d.department_id,
        d.full_name,
        d.email,
        d.phone_number,
        d.qualification,
        d.specification,
        d.medical_registration_no,
        d.new_patient_fee,
        d.followup_fee,
        d.max_patient_num,
        d.profile_photo,
        dep.department_name
      FROM doctor d
      LEFT JOIN department dep ON d.department_id = dep.department_id
      JOIN doctor_schedule ds ON ds.doctor_id = d.doctor_id
      JOIN schedule s ON s.schedule_id = ds.schedule_id
      WHERE d.approval_status='approved'
        AND (d.suspended_until IS NULL OR d.suspended_until <= NOW())
        AND ds.status='AVAILABLE'
        AND s.available_date = $1
    `;
    const values = [date];
    let idx = 2;
    if (department_id) {
      query += ` AND d.department_id = $${idx}`;
      values.push(department_id);
      idx++;
    }
    query += ` ORDER BY d.full_name ASC`;

    const result = await pool.query(query, values);

    // Filter out expired slots per doctor (if all slots expired for that date, doctor should not appear)
    // Need to check each doctor has at least one non-expired slot
    const filtered = [];
    for (const doc of result.rows) {
      const slots = await pool.query(
        `SELECT s.available_date, s.end_time FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE ds.doctor_id=$1 AND ds.status='AVAILABLE' AND s.available_date=$2`,
        [doc.doctor_id, date]
      );
      const hasAvailable = slots.rows.length > 0;
      //const hasAvailable = slots.rows.some(s => !isSlotExpired(s.available_date, s.end_time, now));
      if (hasAvailable) filtered.push(doc);
    }

    return res.status(200).json({ doctors: filtered, date });
  } catch (error) {
    console.error("getAvailableDoctorsByDate error:", error);
    return res.status(500).json({ message: "Could not fetch available doctors.", error: error.message });
  }
};

// =====================================================
// AVAILABLE SCHEDULES FOR A DOCTOR ON A DATE (Req 13)
// =====================================================
const getAvailableSchedulesByDate = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date query param is required." });

    const { isSlotExpired } = require("../utils/scheduleWindow");
    const now = new Date();

    const result = await pool.query(
      `SELECT s.schedule_id, TO_CHAR(s.available_date,'YYYY-MM-DD') AS available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status, h.hospital_name, h.city
       FROM schedule s
       JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
       LEFT JOIN hospital h ON s.hospital_id=h.hospital_id
       WHERE ds.doctor_id=$1 AND ds.status='AVAILABLE' AND s.available_date=$2
       ORDER BY s.start_time ASC`,
      [doctorId, date]
    );
   
    const available = result.rows;
    //const available = result.rows.filter(s => !isSlotExpired(s.available_date, s.end_time, now));
    return res.status(200).json({ schedules: available, date, doctor_id: Number(doctorId) });
  } catch (error) {
    console.error("getAvailableSchedulesByDate error:", error);
    return res.status(500).json({ message: "Could not fetch schedules.", error: error.message });
  }
};

const createAppointment = async (req, res) => {
  const client = await pool.connect();
  try {
    // patient_id MUST come from verified JWT, not body (spec)
    const patient_id = req.user && req.user.patient_id;
    if (!patient_id) {
      return res.status(401).json({ message: "Unauthorized. Please login as patient." });
    }
    const { doctor_id, schedule_id, hospital_id } = req.body;

    if (!doctor_id) {
      return res.status(400).json({ message: "Doctor ID is required." });
    }
    if (!schedule_id) {
      return res.status(400).json({ message: "schedule_id is required. Select an available schedule for the chosen date." });
    }

    await client.query("BEGIN");

    // Patient check + lock
    const patientResult = await client.query(
      `SELECT patient_id, suspended_until FROM patient WHERE patient_id = $1 FOR UPDATE`,
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Patient not found." });
    }

    const patient = patientResult.rows[0];

    if (
      patient.suspended_until &&
      new Date(patient.suspended_until) > new Date()
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Your account is temporarily suspended.",
        suspended_until: patient.suspended_until,
      });
    }

    // Doctor check with lock
    const doctorResult = await client.query(
      `SELECT doctor_id, max_patient_num FROM doctor WHERE doctor_id = $1 AND approval_status = 'approved' AND (suspended_until IS NULL OR suspended_until <= CURRENT_TIMESTAMP) FOR UPDATE`,
      [doctor_id]
    );

    if (doctorResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Approved doctor not found." });
    }

    const doctor = doctorResult.rows[0];

    // Validate schedule belongs to doctor and is AVAILABLE and not expired - lock row
    const slotRes = await client.query(
      `SELECT s.schedule_id,TO_CHAR(s.available_date,'YYYY-MM-DD') AS available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status
       FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
       WHERE s.schedule_id=$1 AND ds.doctor_id=$2 FOR UPDATE`,
      [schedule_id, doctor_id]
    );
    if (slotRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Selected schedule not found or not owned by this doctor." });
    }
    const slot = slotRes.rows[0];
    if (slot.slot_status !== 'AVAILABLE') {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Selected slot is not available." });
    }
    try {
      const { isSlotExpired } = require("../utils/scheduleWindow");
      if (isSlotExpired(slot.available_date, slot.end_time, new Date())) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Selected slot is expired." });
      }
    } catch (_) {}

    // Hospital validation if provided
    const finalHospitalId = hospital_id || slot.hospital_id;
    if (finalHospitalId) {
      const hospCheck = await client.query(`SELECT hospital_id FROM hospital WHERE hospital_id=$1`, [finalHospitalId]);
      if (hospCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Hospital not found." });
      }
    }

    // Duplicate check: same patient same schedule already pending/scheduled
    const dupCheck = await client.query(
      `SELECT appointment_id FROM appointment WHERE patient_id=$1 AND doctor_id=$2 AND schedule_id=$3 AND appointment_status IN ('pending','scheduled','confirmed') LIMIT 1`,
      [patient_id, doctor_id, schedule_id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "You already have an appointment request for this schedule." });
    }

    // Capacity check: count already scheduled+confirmed for this schedule
    if (doctor.max_patient_num) {
      const maxNum = Number(doctor.max_patient_num);
      const countRes = await client.query(
        `SELECT COUNT(*) FROM appointment WHERE doctor_id=$1 AND schedule_id=$2 AND appointment_status IN ('scheduled','confirmed')`,
        [doctor_id, schedule_id]
      );
      const currentCount = Number(countRes.rows[0].count);
      if (currentCount >= maxNum) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: `This schedule has reached max capacity (${maxNum}). Please select another schedule.` });
      }
    }

    // Create appointment request with schedule_id
    const result = await client.query(
      `INSERT INTO appointment (patient_id, doctor_id, schedule_id, hospital_id, booking_date, appointment_status)
       VALUES ($1,$2,$3,$4,NOW(),'pending') RETURNING *`,
      [patient_id, doctor_id, schedule_id, finalHospitalId]
    );

    // Fee via calculate_appointment_fee function (uses existing fee columns)
    let fee = null;
    try {
      const feeRes = await client.query(`SELECT calculate_appointment_fee($1,$2) AS fee`, [patient_id, doctor_id]);
      fee = feeRes.rows[0] ? Number(feeRes.rows[0].fee) : null;
    } catch (e) {
      // function not yet migrated or error — ignore, keep appointment success
      fee = null;
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Appointment request submitted successfully.",
      appointment: result.rows[0],
      fee,
    });

  } catch (error) {
    try { await client.query("ROLLBACK"); } catch(_){}
    console.error("Create appointment error:", error);
    const msg = error.message || "";
    // Database trigger check_department_active_on_appointment is the sole source of truth.
    // Backend does NOT re-implement the rule; it only forwards the PostgreSQL error.
    if (msg.includes("This department is currently unavailable") || (error.code === "P0001" && msg.toLowerCase().includes("unavailable"))) {
      return res.status(400).json({ message: "This department is currently unavailable. New appointments cannot be booked for this department.", error: msg });
    }
    return res.status(500).json({ message: "Could not create appointment.", error: msg });
  } finally {
    client.release();
  }
};
const getPatientAppointments = async (
  req,
  res
) => {
  try {
    const patientId =
      req.params.patientId;

    const result = await pool.query(
      `SELECT
        a.appointment_id,
        a.patient_id,
        a.booking_date,
        a.appointment_status,

        d.doctor_id,
        d.full_name AS doctor_name,
        d.qualification,
        d.specification,
        d.new_patient_fee,
        d.followup_fee,

        dep.department_name,

        h.hospital_id,
        h.hospital_name,
        h.city,
        h.address AS hospital_address,

        s.schedule_id,
        s.available_date,
        s.start_time,
        s.end_time,

        pay.payment_id,
        pay.amount,
        pay.payment_method,
        pay.payment_status,
        pay.payment_date

       FROM appointment a

       JOIN doctor d
         ON a.doctor_id =
            d.doctor_id

       LEFT JOIN department dep
         ON d.department_id =
            dep.department_id

       LEFT JOIN hospital h
         ON a.hospital_id =
            h.hospital_id

       LEFT JOIN schedule s
         ON a.schedule_id =
            s.schedule_id

       LEFT JOIN payment pay
         ON a.appointment_id =
            pay.appointment_id

       WHERE a.patient_id = $1

       ORDER BY
         a.appointment_id DESC`,
      [patientId]
    );

    return res.status(200).json({
      appointments: result.rows,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message:
        "Could not fetch appointments.",
      error: error.message,
    });
  }
};
const deleteAppointment = async (req, res) => {
  try {
    const appointmentId =
      req.params.id;

    const result = await pool.query(
      `DELETE FROM appointment
       WHERE appointment_id = $1
         AND appointment_status = 'pending'
       RETURNING appointment_id`,
      [appointmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Pending appointment not found.",
      });
    }

    return res.status(200).json({
      message:
        "Appointment request cancelled successfully.",
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not cancel appointment.",
      error: error.message,
    });
  }
};
const makePayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      patient_id,
      appointment_id,
      payment_method,
    } = req.body;

    if (
      !patient_id ||
      !appointment_id ||
      !payment_method
    ) {
      return res.status(400).json({
        message:
          "Patient ID, appointment ID and payment method are required.",
      });
    }

    await client.query("BEGIN");

    // Patient check
    const patientResult =
      await client.query(
        `SELECT suspended_until
         FROM patient
         WHERE patient_id = $1`,
        [patient_id]
      );

    if (
      patientResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    const patient =
      patientResult.rows[0];

    if (
      patient.suspended_until &&
      new Date(patient.suspended_until) >
        new Date()
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message:
          "Suspended patient cannot make payment.",
      });
    }

     // Appointment + schedule expired guard (M:N)
    const appointmentResult =
      await client.query(
        `SELECT
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.schedule_id,
          a.appointment_status,

          d.new_patient_fee,
          d.followup_fee,

          TO_CHAR(s.available_date,'YYYY-MM-DD') AS available_date,
          s.end_time,
          ds.status as slot_status

         FROM appointment a

         JOIN doctor d
           ON a.doctor_id =
              d.doctor_id

         LEFT JOIN schedule s
           ON a.schedule_id = s.schedule_id
         LEFT JOIN doctor_schedule ds
           ON ds.schedule_id = s.schedule_id AND ds.doctor_id = a.doctor_id

         WHERE a.appointment_id = $1

      FOR UPDATE OF a`,
         [appointment_id]
      );

    if (
      appointmentResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Appointment not found.",
      });
    }

    const appointment =
      appointmentResult.rows[0];

    if (
      Number(appointment.patient_id) !==
      Number(patient_id)
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message:
          "This appointment does not belong to this patient.",
      });
    }

    if (
      appointment.appointment_status !==
      "scheduled"
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Staff must assign hospital and schedule before payment.",
      });
    }

    // === Expired slot guard (backend authority) M:N ===
    if (appointment.schedule_id) {
      if (appointment.slot_status === "UNAVAILABLE") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "This slot is marked unavailable by the doctor." });
      }
      if (appointment.available_date && appointment.end_time) {
        try {
          const { isSlotExpired } = require("../utils/scheduleWindow");
          if (isSlotExpired(appointment.available_date, appointment.end_time, new Date())) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "This schedule slot is expired and cannot be paid/booked." });
          }
        } catch {}
      }
    }

    // Already paid?
    const paidResult =
      await client.query(
        `SELECT payment_id
         FROM payment
         WHERE appointment_id = $1
           AND payment_status = 'paid'`,
        [appointment_id]
      );

    if (paidResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "This appointment is already paid.",
      });
    }

    // Previous completed appointment?
    const previousVisit =
      await client.query(
        `SELECT EXISTS (
          SELECT 1
          FROM appointment
          WHERE patient_id = $1
            AND doctor_id = $2
            AND appointment_status =
                'completed'
            AND appointment_id <> $3
        ) AS has_previous_visit`,
        [
          patient_id,
          appointment.doctor_id,
          appointment_id,
        ]
      );

    const isFollowup =
      previousVisit.rows[0]
        .has_previous_visit;

    const amount =
      isFollowup
        ? appointment.followup_fee
        : appointment.new_patient_fee;

    const feeType =
      isFollowup
        ? "followup"
        : "new_patient";

    // Payment
    const paymentResult =
      await client.query(
        `INSERT INTO payment (
          appointment_id,
          amount,
          payment_method,
          payment_status,
          payment_date
         )
         VALUES (
          $1,
          $2,
          $3,
          'paid',
          CURRENT_TIMESTAMP
         )
         RETURNING *`,
        [
          appointment_id,
          amount,
          payment_method,
        ]
      );

    // Appointment confirm
    await client.query(
      `UPDATE appointment
       SET appointment_status =
           'confirmed'
       WHERE appointment_id = $1`,
      [appointment_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message:
        "Payment successful. Appointment confirmed.",

      fee_type: feeType,
      amount,

      payment:
        paymentResult.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Payment error:",
      error
    );

    return res.status(500).json({
      message: "Payment failed.",
      error: error.message,
    });

  } finally {
    client.release();
  }
};
const getPatientProfile = async (
  req,
  res
) => {
  try {
    const patientId = req.params.id;

    const result = await pool.query(
      `SELECT
        patient_id,
        full_name,
        email,
        phone_number,
        gender,
        date_of_birth,
        blood_group,
        address,
        suspended_until
       FROM patient
       WHERE patient_id = $1`,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      patient: result.rows[0],
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not fetch patient profile.",
      error: error.message,
    });
  }
};
const updatePatientProfile = async (
  req,
  res
) => {
  try {
    const patientId = req.params.id;

    const {
      full_name,
      phone_number,
      gender,
      date_of_birth,
      blood_group,
      address,
    } = req.body;

    const result = await pool.query(
      `UPDATE patient
       SET
         full_name = $1,
         phone_number = $2,
         gender = $3,
         date_of_birth = $4,
         blood_group = $5,
         address = $6
       WHERE patient_id = $7
       RETURNING
         patient_id,
         full_name,
         email,
         phone_number,
         gender,
         date_of_birth,
         blood_group,
         address`,
      [
        full_name,
        phone_number,
        gender,
        date_of_birth,
        blood_group,
        address,
        patientId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      message:
        "Profile updated successfully.",

      patient:
        result.rows[0],
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not update profile.",
      error: error.message,
    });
  }
};
const getAvailableStaff = async (
  req,
  res
) => {
  try {
    const result = await pool.query(
      `SELECT
        staff_id,
        email,
        phone_number,
        gender,
        profile_pic
       FROM staff
       WHERE approval_status = 'approved'
         AND (
           suspended_until IS NULL
           OR suspended_until <= CURRENT_TIMESTAMP
         )
       ORDER BY staff_id`
    );

    return res.status(200).json({
      staff: result.rows,
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not fetch staff.",
      error: error.message,
    });
  }
};

// Public: doctors needing staff — uses get_doctors_needing_staff() (needs_staff flag + NOT EXISTS)
const getDoctorsWithoutStaff = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM get_doctors_needing_staff()`);
    return res.status(200).json({ doctors: result.rows });
  } catch (error) {
    // fallback to old function if new not yet migrated
    try {
      const fb = await pool.query(`SELECT * FROM get_doctors_without_staff()`);
      return res.status(200).json({ doctors: fb.rows });
    } catch (_) {
      return res.status(500).json({ message: "Could not fetch doctors looking for staff.", error: error.message });
    }
  }
};

// Public: generic staff-required boolean for Home — no doctor details (global available check: shobi unavailable holei true)
const getStaffRequiredStatus = async (req, res) => {
  try {
    const result = await pool.query(`SELECT is_staff_required() AS staff_required`);
    return res.status(200).json({ staff_required: !!result.rows[0].staff_required });
  } catch (error) {
    // fallback: live query with global check if function not yet migrated
    try {
      const fb = await pool.query(`
        SELECT (
          NOT EXISTS (
            SELECT 1 FROM staff s
            WHERE s.approval_status = 'approved'
              AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
              AND NOT EXISTS (SELECT 1 FROM staff_assignment sa2 WHERE sa2.staff_id = s.staff_id AND sa2.status = 'ACTIVE' AND (sa2.end_date IS NULL OR sa2.end_date > NOW()))
          )
          AND EXISTS (
            SELECT 1 FROM doctor d
            LEFT JOIN department dep ON dep.department_id = d.department_id
            WHERE d.approval_status = 'approved'
              AND (d.suspended_until IS NULL OR d.suspended_until <= NOW())
              AND (dep.status IS NULL OR dep.status = 'active')
              AND NOT EXISTS (
                SELECT 1 FROM staff_assignment sa
                WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
              )
          )
        ) AS staff_required
      `);
      return res.status(200).json({ staff_required: !!fb.rows[0].staff_required });
    } catch (_) {
      return res.status(500).json({ message: "Could not fetch staff required status.", error: error.message });
    }
  }
};
const createPatientComplaint = async (
  req,
  res
) => {
  try {
    const {
      patient_id,
      against_type,
      against_id,
      appointment_id,
      complaint_type,
      description,
    } = req.body;

    if (
      !patient_id ||
      !against_type ||
      !against_id ||
      !complaint_type ||
      !description
    ) {
      return res.status(400).json({
        message:
          "Required complaint information is missing.",
      });
    }

    const patientResult =
      await pool.query(
        `SELECT suspended_until
         FROM patient
         WHERE patient_id = $1`,
        [patient_id]
      );

    if (
      patientResult.rows.length === 0
    ) {
      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    const patient =
      patientResult.rows[0];

    if (
      patient.suspended_until &&
      new Date(patient.suspended_until) >
        new Date()
    ) {
      return res.status(403).json({
        message:
          "Suspended patient cannot submit complaints.",
      });
    }

    let againstDoctor = null;
    let againstStaff = null;

    if (against_type === "doctor") {
      againstDoctor = against_id;

    } else if (
      against_type === "staff"
    ) {
      againstStaff = against_id;

    } else {
      return res.status(400).json({
        message:
          "Patient can complain only against doctor or staff.",
      });
    }

    const result = await pool.query(
      `INSERT INTO complaint (
        filed_by_patient_id,

        against_doctor_id,
        against_staff_id,

        appointment_id,

        complaint_type,
        description,

        complaint_status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'pending'
      )
      RETURNING *`,
      [
        patient_id,
        againstDoctor,
        againstStaff,
        appointment_id || null,
        complaint_type,
        description,
      ]
    );

    return res.status(201).json({
      message:
        "Complaint submitted successfully.",

      complaint:
        result.rows[0],
    });

  } catch (error) {
    console.error(
      "Complaint error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not submit complaint.",
      error: error.message,
    });
  }
};
const getPatientComplaints = async (
  req,
  res
) => {
  try {
    const patientId =
      req.params.patientId;

    const result = await pool.query(
      `SELECT
        c.complaint_id,
        c.appointment_id,
        c.complaint_type,
        c.description,
        c.complaint_date,
        c.complaint_status,
        c.admin_action,

        c.against_doctor_id,
        d.full_name
          AS against_doctor_name,

        c.against_staff_id,
        s.email
          AS against_staff_email,

        c.reviewed_by,
        a.full_name
          AS reviewed_by_name

       FROM complaint c

       LEFT JOIN doctor d
         ON c.against_doctor_id =
            d.doctor_id

       LEFT JOIN staff s
         ON c.against_staff_id =
            s.staff_id

       LEFT JOIN admin a
         ON c.reviewed_by =
            a.admin_id

       WHERE
         c.filed_by_patient_id = $1

       ORDER BY
         c.complaint_id DESC`,
      [patientId]
    );

    return res.status(200).json({
      complaints: result.rows,
    });

  } catch (error) {
    return res.status(500).json({
      message:
        "Could not fetch complaints.",
      error: error.message,
    });
  }
};
// =====================================================
// GET LOGGED-IN PATIENT PRESCRIPTIONS
// =====================================================

const getPatientPrescriptions = async (req, res) => {
  try {

    // JWT token থেকে patient ID
    const patientId = req.user.patient_id;


    const result = await pool.query(
      `SELECT

        pr.prescription_id,
        pr.appointment_id,
        pr.diagnosis,
        pr.advice,
        pr.created_at,

        a.appointment_status,

        d.doctor_id,
        d.full_name AS doctor_name,
        d.qualification,
        d.specification,

        dep.department_name,

        h.hospital_name,

        s.available_date,
        s.start_time,
        s.end_time,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'medicine_id',
                  m.medicine_id,

                'medicine_name',
                  m.medicine_name,

                'company_name',
                  m.company_name,

                'strength',
                  m.strength,

                'medicine_type',
                  m.medicine_type,

                'dosage',
                  pm.dosage,

                'frequency',
                  pm.frequency,

                'duration',
                  pm.duration,

                'instruction',
                  pm.instruction
              )
            )

            FROM prescription_medicine pm

            JOIN medicine m
              ON pm.medicine_id =
                 m.medicine_id

            WHERE
              pm.prescription_id =
              pr.prescription_id
          ),
          '[]'::json
        ) AS medicines,


        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'test_id',
                  t.test_id,

                'test_name',
                  t.test_name,

                'description',
                  t.description,

                'estimated_cost',
                  t.estimated_cost
              )
            )

            FROM prescription_test pt

            JOIN test t
              ON pt.test_id =
                 t.test_id

            WHERE
              pt.prescription_id =
              pr.prescription_id
          ),
          '[]'::json
        ) AS tests


       FROM prescription pr


       JOIN appointment a
         ON pr.appointment_id =
            a.appointment_id


       JOIN doctor d
         ON a.doctor_id =
            d.doctor_id


       LEFT JOIN department dep
         ON d.department_id =
            dep.department_id


       LEFT JOIN hospital h
         ON a.hospital_id =
            h.hospital_id


       LEFT JOIN schedule s
         ON a.schedule_id =
            s.schedule_id


       WHERE
         a.patient_id = $1


       ORDER BY
         pr.created_at DESC`,
      [patientId]
    );


    return res.status(200).json({
      prescriptions:
        result.rows,
    });


  } catch (error) {

    console.error(
      "Patient prescriptions error:",
      error
    );


    return res.status(500).json({
      message:
        "Could not load prescriptions.",

      error:
        error.message,
    });
  }
};
// =====================================================
// GET LOGGED-IN PATIENT REFERRALS
// =====================================================

const getPatientReferrals = async (req, res) => {
  try {

    const patientId =
      req.user.patient_id;


    const result = await pool.query(
      `SELECT

        r.referral_id,
        r.appointment_id,
        r.reason,
        r.referral_status,
        r.referral_date,

        source.doctor_id
          AS referred_by_id,

        source.full_name
          AS referred_by_name,

        source.specification
          AS referred_by_specialization,

        source_dep.department_name
          AS referred_by_department,


        target.doctor_id
          AS referred_to_id,

        target.full_name
          AS referred_to_name,

        target.specification
          AS referred_to_specialization,

        target_dep.department_name
          AS referred_to_department


       FROM referral r


       JOIN appointment a
         ON r.appointment_id =
            a.appointment_id


       JOIN doctor source
         ON r.referred_by =
            source.doctor_id


       JOIN doctor target
         ON r.referred_to =
            target.doctor_id


       LEFT JOIN department source_dep
         ON source.department_id =
            source_dep.department_id


       LEFT JOIN department target_dep
         ON target.department_id =
            target_dep.department_id


       WHERE
         a.patient_id = $1


       ORDER BY
         r.referral_id DESC`,
      [patientId]
    );


    return res.status(200).json({
      referrals:
        result.rows,
    });


  } catch (error) {

    console.error(
      "Patient referrals error:",
      error
    );


    return res.status(500).json({
      message:
        "Could not load referrals.",

      error:
        error.message,
    });
  }
};
module.exports = {
  registerPatient,
  loginPatient,
    getApprovedDoctors,
  getAvailableDoctorsByDate,
  getAvailableSchedulesByDate,
  getPatientDepartments,
  getDoctorDetails,
  getDoctorAvailableSchedules,
  getAvailableStaff,
  getDoctorsWithoutStaff,
  getStaffRequiredStatus,

  createAppointment,
  getPatientAppointments,
  deleteAppointment,

  makePayment,

  getPatientProfile,
  updatePatientProfile,

  createPatientComplaint,
  getPatientComplaints,
    getPatientPrescriptions,
  getPatientReferrals
};
