const bcrypt = require("bcrypt");
const pool = require("../config/db");

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
        message: "সবগুলো field পূরণ করা আবশ্যক।",
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
        message: "এই email দিয়ে আগে থেকেই account আছে।",
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
      message: "Patient registration successful. এখন login করতে পারেন।",
      patient: result.rows[0],
    });
  } catch (error) {
    console.error("Patient registration error:", error);

    return res.status(500).json({
      message: "Patient registration করা যায়নি।",
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
  

    delete patient.password;

    return res.status(200).json({
      message: "Login successful.",
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
const createAppointment = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
    } = req.body;

    if (!patient_id || !doctor_id) {
      return res.status(400).json({
        message:
          "Patient ID and Doctor ID are required.",
      });
    }

    // Patient check
    const patientResult = await pool.query(
      `SELECT
        patient_id,
        suspended_until
       FROM patient
       WHERE patient_id = $1`,
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    const patient = patientResult.rows[0];

    // Suspension check
    if (
      patient.suspended_until &&
      new Date(patient.suspended_until) >
        new Date()
    ) {
      return res.status(403).json({
        message:
          "Your account is temporarily suspended.",
        suspended_until:
          patient.suspended_until,
      });
    }

    // Doctor check
    const doctorResult = await pool.query(
      `SELECT doctor_id
       FROM doctor
       WHERE doctor_id = $1
         AND approval_status = 'approved'
         AND (
           suspended_until IS NULL
           OR suspended_until <= CURRENT_TIMESTAMP
         )`,
      [doctor_id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "Approved doctor not found.",
      });
    }

    // Check today's availability - booking only if AVAILABLE
    const { getDhakaNow, formatPgDate, computeAvailabilityStatus } = require("../utils/time");
    const nowDhaka = getDhakaNow();
    const y = nowDhaka.getFullYear();
    const m = String(nowDhaka.getMonth() + 1).padStart(2, "0");
    const d = String(nowDhaka.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const todaySchedule = await pool.query(
      `SELECT s.available_date, s.start_time, s.end_time
       FROM schedule s
       JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       WHERE ds.doctor_id=$1 AND s.available_date=$2
       ORDER BY s.start_time ASC LIMIT 1`,
      [doctor_id, todayStr]
    );

    let status = "UNAVAILABLE";
    if (todaySchedule.rows.length > 0) {
      const r = todaySchedule.rows[0];
      const dateStr = formatPgDate(r.available_date);
      status = computeAvailabilityStatus(dateStr, r.start_time, r.end_time, nowDhaka);
    }

    if (status === "WORKING") {
      return res.status(403).json({ message: "Cannot book an appointment for today." });
    }
    if (status === "UNAVAILABLE" && todaySchedule.rows.length > 0) {
      const r = todaySchedule.rows[0];
      const nowM = nowDhaka.getHours() * 60 + nowDhaka.getMinutes();
      const endM = String(r.end_time).split(":").reduce((a,c,i)=> i===0? Number(c)*60 : a+Number(c),0);
      if (nowM >= endM) {
        return res.status(403).json({ message: "Doctor is unavailable for today." });
      }
    }
    // If today has schedule and not AVAILABLE, block; if no schedule but we still allow pending for future? Spec: no schedule => UNAVAILABLE
    // For today's booking, require AVAILABLE. Future booking via staff assignment remains separate.
    // Enforce: if today has a schedule and status !== AVAILABLE then block direct booking for today
    if (todaySchedule.rows.length > 0 && status !== "AVAILABLE") {
      return res.status(403).json({ message: status === "WORKING" ? "Cannot book an appointment for today." : "Doctor is unavailable for today." });
    }

    // If no today's schedule, it is UNAVAILABLE for today but patient intent might be for today - block if they have no available slot today
    // Do not block future discovery bookings that use schedule_id (not implemented here) - this endpoint is for today's generic request, so treat as today
    // For now, if no today's schedule, allow? Spec says UNAVAILABLE if not fixed during window => should block today's booking.
    // Decide: if no today's schedule, block booking for today
    if (todaySchedule.rows.length === 0) {
      return res.status(403).json({ message: "Doctor is unavailable for today." });
    }

    // Create appointment request
    const result = await pool.query(
      `INSERT INTO appointment (
        patient_id,
        doctor_id,
        appointment_status
       )
       VALUES (
        $1,
        $2,
        'pending'
       )
       RETURNING *`,
      [
        patient_id,
        doctor_id,
      ]
    );

    return res.status(201).json({
      message:
        "Appointment request submitted successfully.",

      appointment:
        result.rows[0],
    });

  } catch (error) {
    console.error(
      "Create appointment error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not create appointment.",
      error: error.message,
    });
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

    // Appointment
    const appointmentResult =
      await client.query(
        `SELECT
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.appointment_status,

          d.new_patient_fee,
          d.followup_fee

         FROM appointment a

         JOIN doctor d
           ON a.doctor_id =
              d.doctor_id

         WHERE a.appointment_id = $1

         FOR UPDATE`,
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
module.exports = {
  registerPatient,
  loginPatient,
    getApprovedDoctors,
  getPatientDepartments,
  getDoctorDetails,
  getAvailableStaff,

  createAppointment,
  getPatientAppointments,
  deleteAppointment,

  makePayment,

  getPatientProfile,
  updatePatientProfile,

  createPatientComplaint,
  getPatientComplaints,
};
