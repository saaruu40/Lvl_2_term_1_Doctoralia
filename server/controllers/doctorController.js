const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const applyDoctor = async (req, res) => {
  try {
    const {
      department_id,
      full_name,
      email,
      password,
      phone_number,
      qualification,
      specification,
      medical_registration_no,
      new_patient_fee,
      followup_fee,
      max_patient_num,
    } = req.body;

    // BACKEND VALIDATION: department must exist (single source of truth)
    if (!department_id) {
      return res.status(400).json({
        message: "Department is required. Please select a department.",
      });
    }
    const deptIdNum = Number(department_id);
    if (!Number.isInteger(deptIdNum) || deptIdNum <= 0) {
      return res.status(400).json({
        message: "Invalid department ID.",
      });
    }
    const deptCheck = await pool.query(
      `SELECT department_id FROM department WHERE department_id = $1`,
      [deptIdNum]
    );
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Selected department does not exist or has been deleted.",
      });
    }

    const existingDoctor = await pool.query(
      `SELECT doctor_id
       FROM doctor
       WHERE email = $1 OR medical_registration_no = $2`,
      [email, medical_registration_no]
    );

    if (existingDoctor.rows.length > 0) {
      return res.status(409).json({
        message:
          "এই email বা medical registration number দিয়ে আগে থেকেই আবেদন করা হয়েছে।",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profilePhoto = req.file
      ? `/uploads/doctors/${req.file.filename}`
      : null;

    const result = await pool.query(
      `INSERT INTO doctor (
        department_id,
        approved_by,
        full_name,
        email,
        password,
        phone_number,
        qualification,
        specification,
        medical_registration_no,
        new_patient_fee,
        followup_fee,
        max_patient_num,
        profile_photo
      )
      VALUES (
        $1, NULL, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      RETURNING
        doctor_id,
        full_name,
        email,
        approved_by`,
      [
        deptIdNum,
        full_name,
        email,
        hashedPassword,
        phone_number,
        qualification,
        specification,
        medical_registration_no,
        new_patient_fee,
        followup_fee,
        max_patient_num,
        profilePhoto,
      ]
    );

    return res.status(201).json({
      message:
        "Doctor application successfully submitted. wait for Admin approval.",
      doctor: result.rows[0],
    });
  } catch (error) {
    console.error("Doctor application error:", error);

    return res.status(500).json({
      message: "Doctor application can't submit",
      error: error.message,
    });
  }
};

// const loginDoctor = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const result = await pool.query(
//       `SELECT doctor_id, full_name, email, password, approved_by,approval_status
//        FROM doctor
//        WHERE email = $1`,
//       [email]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({
//         message: "Invalid email or password.",
//       });
//     }

//     const doctor = result.rows[0];

//     const passwordMatched = await bcrypt.compare(
//       password,
//       doctor.password
//     );

//     if (!passwordMatched) {
//       return res.status(401).json({
//         message: "Invalid email or password.",
//       });
//     }

//     if (doctor.approval_status === 'pending') {
//       return res.status(403).json({
//         message: "Your account is waiting for admin approval.",
//       });
//     }
// if (doctor.approval_status === "rejected") {
//   return res.status(403).json({
//     message: "Your doctor application was rejected.",
//   });
// }
// const token = jwt.sign(
//   {
//     doctor_id: doctor.doctor_id,
//     role: "doctor",
//   },
//   process.env.JWT_SECRET,
//   {
//     expiresIn: "1d",
//   }
// );
//     return res.status(200).json({
//       message: "Doctor login successful.",
//       token:token,
//       doctor: {
//         doctor_id: doctor.doctor_id,
//         full_name: doctor.full_name,
//         email: doctor.email,
//       },
//     });
//   } catch (error) {
//     console.error("Doctor login error:", error);

//     return res.status(500).json({
//       message: "Doctor login failed.",
//       error: error.message,
//     });
//   }
// };
// // module.exports = {
// //   applyDoctor,
// // };
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT
        doctor_id,
        department_id,
        full_name,
        email,
        password,
        phone_number,
        qualification,
        specification,
        medical_registration_no,
        new_patient_fee,
        followup_fee,
        max_patient_num,
        profile_photo,
        approval_status,
        suspended_until
       FROM doctor
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const doctor = result.rows[0];

    const passwordMatched = await bcrypt.compare(
      password,
      doctor.password
    );

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // =====================================
    // ADMIN APPROVAL
    // =====================================

    if (doctor.approval_status === "pending") {
      return res.status(403).json({
        message:
          "Your account is waiting for admin approval.",
      });
    }

    if (doctor.approval_status === "rejected") {
      return res.status(403).json({
        message:
          "Your doctor application was rejected.",
      });
    }

    // =====================================
    // EXPIRED SUSPENSION
    // =====================================

    if (
      doctor.suspended_until &&
      new Date(doctor.suspended_until) <= new Date()
    ) {
      await pool.query(
        `UPDATE doctor
         SET suspended_until = NULL
         WHERE doctor_id = $1`,
        [doctor.doctor_id]
      );

      doctor.suspended_until = null;
    }

    // =====================================
    // ACTIVE SUSPENSION
    // =====================================

    if (
      doctor.suspended_until &&
      new Date(doctor.suspended_until) > new Date()
    ) {
      return res.status(403).json({
        message:
          "Your account is temporarily suspended. You cannot use Doctoralia until the suspension period ends.",

        suspended_until:
          doctor.suspended_until,
      });
    }

    // =====================================
    // JWT
    // =====================================

    const token = jwt.sign(
      {
        doctor_id: doctor.doctor_id,
        role: "doctor",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    delete doctor.password;

    return res.status(200).json({
      message: "Doctor login successful.",
      token,
      doctor,
    });
  } catch (error) {
    console.error(
      "Doctor login error:",
      error
    );

    return res.status(500).json({
      message: "Doctor login failed.",
      error: error.message,
    });
  }
};
const getActiveDoctor = async (doctorId) => {
  const result = await pool.query(
    `SELECT
      doctor_id,
      department_id,
      full_name,
      email,
      phone_number,
      qualification,
      specification,
      medical_registration_no,
      new_patient_fee,
      followup_fee,
      max_patient_num,
      profile_photo,
      approval_status,
      suspended_until
     FROM doctor
     WHERE doctor_id = $1`,
    [doctorId]
  );

  if (result.rows.length === 0) {
    return {
      ok: false,
      status: 404,
      message: "Doctor account not found.",
    };
  }

  const doctor = result.rows[0];

  if (doctor.approval_status !== "approved") {
    return {
      ok: false,
      status: 403,
      message:
        "Your doctor account is not approved.",
    };
  }

  // expired suspension
  if (
    doctor.suspended_until &&
    new Date(doctor.suspended_until) <= new Date()
  ) {
    await pool.query(
      `UPDATE doctor
       SET suspended_until = NULL
       WHERE doctor_id = $1`,
      [doctorId]
    );

    doctor.suspended_until = null;
  }

  // active suspension
  if (
    doctor.suspended_until &&
    new Date(doctor.suspended_until) > new Date()
  ) {
    return {
      ok: false,
      status: 403,
      message:
        "Your account is temporarily suspended.",
      suspended_until:
        doctor.suspended_until,
    };
  }

  return {
    ok: true,
    doctor,
  };
};


const sendDoctorAccessError = (
  res,
  access
) => {
  return res
    .status(access.status)
    .json({
      message:
        access.message,

      ...(access.suspended_until
        ? {
            suspended_until:
              access.suspended_until,
          }
        : {}),
    });
};
// =====================================================
// DOCTOR PROFILE
// =====================================================

const getDoctorProfile = async (req, res) => {
  try {

    // JWT token থেকে doctor id
    const doctorId = req.user.doctor_id;

    // Doctor approved + suspension check
    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }

    const result = await pool.query(
      `SELECT
        d.doctor_id,
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
        d.approval_status,

        dep.department_id,
        dep.department_name

       FROM doctor d

       LEFT JOIN department dep
         ON d.department_id =
            dep.department_id

       WHERE d.doctor_id = $1`,
      [doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Doctor profile not found.",
      });
    }

    return res.status(200).json({
      doctor: result.rows[0],
    });

  } catch (error) {

    console.error(
      "Doctor profile error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not load doctor profile.",
      error: error.message,
    });
  }
};
// =====================================================
// DOCTOR DASHBOARD STATISTICS
// =====================================================

const getDoctorDashboardStats = async (req, res) => {
  try {

    const doctorId = req.user.doctor_id;

    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    // =====================================
    // CONFIRMED APPOINTMENTS
    // =====================================

    const confirmedResult =
      await pool.query(
        `SELECT COUNT(*)
         FROM appointment
         WHERE doctor_id = $1
           AND appointment_status = 'confirmed'`,
        [doctorId]
      );


    // =====================================
    // COMPLETED APPOINTMENTS
    // =====================================

    const completedResult =
      await pool.query(
        `SELECT COUNT(*)
         FROM appointment
         WHERE doctor_id = $1
           AND appointment_status = 'completed'`,
        [doctorId]
      );


    // =====================================
    // TOTAL PRESCRIPTIONS
    // =====================================

    const prescriptionResult =
      await pool.query(
        `SELECT COUNT(*)

         FROM prescription p

         JOIN appointment a
           ON p.appointment_id =
              a.appointment_id

         WHERE a.doctor_id = $1`,
        [doctorId]
      );


    // =====================================
    // REFERRALS RECEIVED
    // =====================================

    const referralResult =
      await pool.query(
        `SELECT COUNT(*)
         FROM referral
         WHERE referred_to = $1`,
        [doctorId]
      );


    return res.status(200).json({

      confirmedAppointments:
        Number(
          confirmedResult.rows[0].count
        ),

      completedAppointments:
        Number(
          completedResult.rows[0].count
        ),

      totalPrescriptions:
        Number(
          prescriptionResult.rows[0].count
        ),

      receivedReferrals:
        Number(
          referralResult.rows[0].count
        ),
    });

  } catch (error) {

    console.error(
      "Doctor dashboard stats error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not load doctor dashboard statistics.",
      error: error.message,
    });
  }
};
// =====================================================
// GET DOCTOR APPOINTMENTS
// =====================================================

const getDoctorAppointments = async (req, res) => {
  try {

    // JWT token থেকে logged-in doctor ID
    const doctorId = req.user.doctor_id;


    // =====================================
    // APPROVAL + SUSPENSION CHECK
    // =====================================

    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    // =====================================
    // GET THIS DOCTOR'S APPOINTMENTS - with optional schedule_id filter
    // =====================================
    const filterScheduleId = req.query.schedule_id ? Number(req.query.schedule_id) : null;
    if (filterScheduleId) {
      // Verify schedule belongs to this doctor
      const ownerCheck = await pool.query(
        `SELECT 1 FROM doctor_schedule WHERE doctor_id=$1 AND schedule_id=$2`,
        [doctorId, filterScheduleId]
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ message: "You are not authorized to view this schedule's appointments." });
      }
    }

    let query = `SELECT
        a.appointment_id,
        a.patient_id,
        a.booking_date,
        a.appointment_status,
        p.full_name AS patient_name,
        p.email AS patient_email,
        p.phone_number AS patient_phone,
        p.gender AS patient_gender,
        p.date_of_birth,
        p.blood_group,
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
        pay.payment_date,
        pr.prescription_id,
        r.referral_id
       FROM appointment a
       JOIN patient p ON a.patient_id = p.patient_id
       LEFT JOIN hospital h ON a.hospital_id = h.hospital_id
       LEFT JOIN schedule s ON a.schedule_id = s.schedule_id
       LEFT JOIN payment pay ON a.appointment_id = pay.appointment_id
       LEFT JOIN prescription pr ON a.appointment_id = pr.appointment_id
       LEFT JOIN referral r ON a.appointment_id = r.appointment_id
       WHERE a.doctor_id = $1`;
    const params = [doctorId];
    if (filterScheduleId) {
      query += ` AND a.schedule_id = $2`;
      params.push(filterScheduleId);
    }
    query += ` ORDER BY
         CASE
           WHEN a.appointment_status = 'confirmed' THEN 0
           WHEN a.appointment_status = 'scheduled' THEN 1
           WHEN a.appointment_status = 'pending' THEN 2
           WHEN a.appointment_status = 'completed' THEN 3
           ELSE 4
         END,
         a.appointment_id DESC`;
    const result = await pool.query(query, params);


    return res.status(200).json({
      appointments: result.rows,
    });


  } catch (error) {

    console.error(
      "Doctor appointments error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not load doctor appointments.",

      error: error.message,
    });
  }
};
// =====================================================
// GET MEDICINES
// =====================================================

const getMedicines = async (req, res) => {
  try {

    const doctorId = req.user.doctor_id;

    // Doctor approved + suspension check
    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const result = await pool.query(
      `SELECT
        medicine_id,
        medicine_name,
        company_name,
        strength,
        medicine_type

       FROM medicine

       ORDER BY medicine_name ASC`
    );


    return res.status(200).json({
      medicines: result.rows,
    });


  } catch (error) {

    console.error(
      "Get medicines error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not load medicines.",

      error: error.message,
    });
  }
};


// =====================================================
// GET TESTS
// =====================================================

const getTests = async (req, res) => {
  try {

    const doctorId = req.user.doctor_id;

    // Doctor approved + suspension check
    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const result = await pool.query(
      `SELECT
        test_id,
        test_name,
        description,
        estimated_cost

       FROM test

       ORDER BY test_name ASC`
    );


    return res.status(200).json({
      tests: result.rows,
    });


  } catch (error) {

    console.error(
      "Get tests error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not load tests.",

      error: error.message,
    });
  }
};
// =====================================================
// CREATE PRESCRIPTION
// =====================================================

const createPrescription = async (req, res) => {

  const client = await pool.connect();

  try {

    // =====================================
    // LOGGED-IN DOCTOR FROM JWT
    // =====================================

    const doctorId = req.user.doctor_id;

    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    // =====================================
    // DATA FROM FRONTEND
    // =====================================

    const {
      appointment_id,
      diagnosis,
      advice,
      medicines = [],
      tests = [],
    } = req.body;


    if (
      !appointment_id ||
      !diagnosis?.trim()
    ) {
      return res.status(400).json({
        message:
          "Appointment ID and diagnosis are required.",
      });
    }


    await client.query("BEGIN");


    // =====================================
    // CHECK APPOINTMENT
    // =====================================

    const appointmentResult =
      await client.query(
        `SELECT
          appointment_id,
          patient_id,
          doctor_id,
          appointment_status

         FROM appointment

         WHERE appointment_id = $1

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


    // =====================================
    // CHECK APPOINTMENT BELONGS TO DOCTOR
    // =====================================

    if (
      Number(appointment.doctor_id) !==
      Number(doctorId)
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message:
          "This appointment does not belong to you.",
      });
    }


    // =====================================
    // ONLY CONFIRMED APPOINTMENT
    // =====================================

    if (
      appointment.appointment_status !==
      "confirmed"
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Prescription can be written only for a confirmed appointment.",
      });
    }


    // =====================================
    // CHECK EXISTING PRESCRIPTION
    // =====================================

    const existingPrescription =
      await client.query(
        `SELECT prescription_id

         FROM prescription

         WHERE appointment_id = $1`,
        [appointment_id]
      );


    if (
      existingPrescription.rows.length > 0
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "A prescription already exists for this appointment.",
      });
    }


    // =====================================
    // CREATE PRESCRIPTION
    // =====================================

    const prescriptionResult =
      await client.query(
        `INSERT INTO prescription (
          appointment_id,
          diagnosis,
          advice,
          created_at
         )

         VALUES (
          $1,
          $2,
          $3,
          CURRENT_TIMESTAMP
         )

         RETURNING *`,
        [
          appointment_id,
          diagnosis.trim(),
          advice?.trim() || null,
        ]
      );


    const prescription =
      prescriptionResult.rows[0];


    // =====================================
    // ADD MEDICINES
    // =====================================

    const usedMedicineIds =
      new Set();


    for (const medicine of medicines) {

      if (!medicine.medicine_id) {
        continue;
      }


      // Same medicine twice prevent
      if (
        usedMedicineIds.has(
          String(medicine.medicine_id)
        )
      ) {
        continue;
      }


      usedMedicineIds.add(
        String(medicine.medicine_id)
      );


      // Check medicine exists
      const medicineCheck =
        await client.query(
          `SELECT medicine_id
           FROM medicine
           WHERE medicine_id = $1`,
          [medicine.medicine_id]
        );


      if (
        medicineCheck.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            `Medicine ID ${medicine.medicine_id} does not exist.`,
        });
      }


      await client.query(
        `INSERT INTO prescription_medicine (
          prescription_id,
          medicine_id,
          dosage,
          frequency,
          duration,
          instruction
         )

         VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
         )`,
        [
          prescription.prescription_id,
          medicine.medicine_id,
          medicine.dosage || null,
          medicine.frequency || null,
          medicine.duration || null,
          medicine.instruction || null,
        ]
      );
    }


    // =====================================
    // ADD TESTS
    // =====================================

    const usedTestIds =
      new Set();


    for (const test of tests) {

      if (!test.test_id) {
        continue;
      }


      // Same test twice prevent
      if (
        usedTestIds.has(
          String(test.test_id)
        )
      ) {
        continue;
      }


      usedTestIds.add(
        String(test.test_id)
      );


      // Check test exists
      const testCheck =
        await client.query(
          `SELECT test_id
           FROM test
           WHERE test_id = $1`,
          [test.test_id]
        );


      if (
        testCheck.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            `Test ID ${test.test_id} does not exist.`,
        });
      }


      await client.query(
        `INSERT INTO prescription_test (
          prescription_id,
          test_id
         )

         VALUES (
          $1,
          $2
         )`,
        [
          prescription.prescription_id,
          test.test_id,
        ]
      );
    }


    // =====================================
    // APPOINTMENT COMPLETED
    // =====================================

    await client.query(
      `UPDATE appointment

       SET appointment_status =
           'completed'

       WHERE appointment_id = $1`,
      [appointment_id]
    );


    await client.query("COMMIT");


    return res.status(201).json({

      message:
        "Prescription created successfully. Appointment completed.",

      prescription,
    });


  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Create prescription error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not create prescription.",

      error:
        error.message,
    });

  } finally {

    client.release();
  }
};
// =====================================================
// GET APPROVED DOCTORS FOR REFERRAL
// =====================================================

const getReferralDoctors = async (req, res) => {
  try {

    const doctorId = req.user.doctor_id;

    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const result = await pool.query(
      `SELECT
        d.doctor_id,
        d.full_name,
        d.qualification,
        d.specification,
        d.profile_photo,

        dep.department_name

       FROM doctor d

       LEFT JOIN department dep
         ON d.department_id =
            dep.department_id

       WHERE
         d.approval_status = 'approved'

         AND d.doctor_id <> $1

         AND (
           d.suspended_until IS NULL
           OR
           d.suspended_until <= CURRENT_TIMESTAMP
         )

       ORDER BY
         d.full_name ASC`,
      [doctorId]
    );


    return res.status(200).json({
      doctors: result.rows,
    });


  } catch (error) {

    console.error(
      "Referral doctors error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not load doctors for referral.",

      error: error.message,
    });
  }
};
// =====================================================
// CREATE REFERRAL
// =====================================================

const createReferral = async (req, res) => {

  const client = await pool.connect();

  try {

    const doctorId =
      req.user.doctor_id;


    const access =
      await getActiveDoctor(
        doctorId
      );


    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const {
      appointment_id,
      referred_to,
      reason,
    } = req.body;


    if (
      !appointment_id ||
      !referred_to ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        message:
          "Appointment, referred doctor and reason are required.",
      });
    }


    // নিজের কাছে refer করা যাবে না

    if (
      Number(referred_to) ===
      Number(doctorId)
    ) {
      return res.status(400).json({
        message:
          "You cannot refer a patient to yourself.",
      });
    }


    await client.query("BEGIN");


    // =====================================
    // CHECK APPOINTMENT
    // =====================================

    const appointmentResult =
      await client.query(
        `SELECT
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.appointment_status,

          p.full_name AS patient_name

         FROM appointment a

         JOIN patient p
           ON a.patient_id =
              p.patient_id

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


    // =====================================
    // APPOINTMENT MUST BELONG TO DOCTOR
    // =====================================

    if (
      Number(appointment.doctor_id) !==
      Number(doctorId)
    ) {

      await client.query("ROLLBACK");

      return res.status(403).json({
        message:
          "This appointment does not belong to you.",
      });
    }


    // =====================================
    // APPOINTMENT STATUS
    // =====================================

    if (
      ![
        "confirmed",
        "completed",
      ].includes(
        appointment.appointment_status
      )
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Patient can be referred only from a confirmed or completed appointment.",
      });
    }


    // =====================================
    // ALREADY REFERRED?
    // =====================================

    const existingReferral =
      await client.query(
        `SELECT referral_id

         FROM referral

         WHERE appointment_id = $1`,
        [appointment_id]
      );


    if (
      existingReferral.rows.length > 0
    ) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "This appointment already has a referral.",
      });
    }


    // =====================================
    // CHECK TARGET DOCTOR
    // =====================================

    const targetDoctorResult =
      await client.query(
        `SELECT
          doctor_id,
          full_name,
          approval_status,
          suspended_until

         FROM doctor

         WHERE doctor_id = $1`,
        [referred_to]
      );


    if (
      targetDoctorResult.rows.length === 0
    ) {

      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Referred doctor not found.",
      });
    }


    const targetDoctor =
      targetDoctorResult.rows[0];


    if (
      targetDoctor.approval_status !==
      "approved"
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Patient can be referred only to an approved doctor.",
      });
    }


    // target doctor suspended?

    if (
      targetDoctor.suspended_until &&
      new Date(
        targetDoctor.suspended_until
      ) > new Date()
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This doctor is currently suspended and cannot receive referrals.",
      });
    }


    // =====================================
    // CREATE REFERRAL
    // =====================================

    const referralResult =
      await client.query(
        `INSERT INTO referral (
          appointment_id,
          referred_by,
          referred_to,
          reason,
          referral_status,
          referral_date
         )

         VALUES (
          $1,
          $2,
          $3,
          $4,
          'pending',
          CURRENT_DATE
         )

         RETURNING *`,
        [
          appointment_id,
          doctorId,
          referred_to,
          reason.trim(),
        ]
      );


    await client.query("COMMIT");


    return res.status(201).json({

      message:
        "Patient referred successfully.",

      referral:
        referralResult.rows[0],
    });


  } catch (error) {

    await client.query("ROLLBACK");


    console.error(
      "Create referral error:",
      error
    );


    return res.status(500).json({

      message:
        "Could not create referral.",

      error:
        error.message,
    });


  } finally {

    client.release();
  }
};
// =====================================================
// GET SENT REFERRALS
// =====================================================

const getSentReferrals = async (req, res) => {
  try {

    const doctorId =
      req.user.doctor_id;


    const access =
      await getActiveDoctor(
        doctorId
      );


    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const result = await pool.query(
      `SELECT

        r.referral_id,
        r.appointment_id,
        r.reason,
        r.referral_status,
        r.referral_date,

        a.patient_id,

        p.full_name
          AS patient_name,

        p.phone_number
          AS patient_phone,

        target.doctor_id
          AS referred_to_id,

        target.full_name
          AS referred_to_name,

        target.specification
          AS referred_to_specialization,

        dep.department_name
          AS referred_to_department

       FROM referral r

       JOIN appointment a
         ON r.appointment_id =
            a.appointment_id

       JOIN patient p
         ON a.patient_id =
            p.patient_id

       JOIN doctor target
         ON r.referred_to =
            target.doctor_id

       LEFT JOIN department dep
         ON target.department_id =
            dep.department_id

       WHERE
         r.referred_by = $1

       ORDER BY
         r.referral_id DESC`,
      [doctorId]
    );


    return res.status(200).json({
      referrals: result.rows,
    });


  } catch (error) {

    console.error(
      "Sent referrals error:",
      error
    );


    return res.status(500).json({
      message:
        "Could not load sent referrals.",

      error: error.message,
    });
  }
};
// =====================================================
// GET RECEIVED REFERRALS
// =====================================================

const getReceivedReferrals = async (req, res) => {
  try {

    const doctorId =
      req.user.doctor_id;


    const access =
      await getActiveDoctor(
        doctorId
      );


    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const result = await pool.query(
      `SELECT

        r.referral_id,
        r.appointment_id,
        r.reason,
        r.referral_status,
        r.referral_date,

        a.patient_id,

        p.full_name
          AS patient_name,

        p.email
          AS patient_email,

        p.phone_number
          AS patient_phone,

        p.gender,

        p.date_of_birth,

        source.doctor_id
          AS referred_by_id,

        source.full_name
          AS referred_by_name,

        source.specification
          AS referred_by_specialization,

        dep.department_name
          AS referred_by_department

       FROM referral r

       JOIN appointment a
         ON r.appointment_id =
            a.appointment_id

       JOIN patient p
         ON a.patient_id =
            p.patient_id

       JOIN doctor source
         ON r.referred_by =
            source.doctor_id

       LEFT JOIN department dep
         ON source.department_id =
            dep.department_id

       WHERE
         r.referred_to = $1

       ORDER BY
         r.referral_id DESC`,
      [doctorId]
    );


    return res.status(200).json({
      referrals: result.rows,
    });


  } catch (error) {

    console.error(
      "Received referrals error:",
      error
    );


    return res.status(500).json({
      message:
        "Could not load received referrals.",

      error: error.message,
    });
  }
};
// =====================================================
// GET DOCTOR COMPLAINT TARGETS
// =====================================================

const getDoctorComplaintTargets = async (req, res) => {
  try {

    const doctorId = req.user.doctor_id;

    const access = await getActiveDoctor(
      doctorId
    );

    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    // =====================================
    // PATIENTS OF THIS DOCTOR
    // =====================================

    const patientsResult = await pool.query(
      `SELECT DISTINCT
        p.patient_id,
        p.full_name,
        p.email,
        p.phone_number

       FROM appointment a

       JOIN patient p
         ON a.patient_id = p.patient_id

       WHERE a.doctor_id = $1

       ORDER BY p.full_name ASC`,
      [doctorId]
    );


    // =====================================
    // APPROVED STAFF
    // =====================================

    const staffResult = await pool.query(
      `SELECT
        staff_id,
        email,
        phone_number,
        gender

       FROM staff

       WHERE approval_status = 'approved'

         AND (
           suspended_until IS NULL
           OR suspended_until <= CURRENT_TIMESTAMP
         )

       ORDER BY staff_id ASC`
    );


    return res.status(200).json({

      patients:
        patientsResult.rows,

      staff:
        staffResult.rows,
    });


  } catch (error) {

    console.error(
      "Doctor complaint targets error:",
      error
    );

    return res.status(500).json({

      message:
        "Could not load complaint targets.",

      error:
        error.message,
    });
  }
};
// =====================================================
// CREATE DOCTOR COMPLAINT
// =====================================================

const createDoctorComplaint = async (req, res) => {
  try {

    // =====================================
    // LOGGED-IN DOCTOR FROM JWT
    // =====================================

    const doctorId =
      req.user.doctor_id;


    const access =
      await getActiveDoctor(
        doctorId
      );


    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const {
      against_type,
      against_id,
      appointment_id,
      complaint_type,
      description,
    } = req.body;


    // =====================================
    // VALIDATION
    // =====================================

    if (
      !against_type ||
      !against_id ||
      !complaint_type?.trim() ||
      !description?.trim()
    ) {

      return res.status(400).json({
        message:
          "Complaint target, type and description are required.",
      });
    }


    let againstPatient = null;
    let againstStaff = null;


    // =====================================
    // AGAINST PATIENT
    // =====================================

    if (against_type === "patient") {

      const patientResult =
        await pool.query(
          `SELECT DISTINCT
            p.patient_id

           FROM patient p

           JOIN appointment a
             ON p.patient_id =
                a.patient_id

           WHERE
             p.patient_id = $1

             AND
             a.doctor_id = $2`,
          [
            against_id,
            doctorId,
          ]
        );


      if (
        patientResult.rows.length === 0
      ) {

        return res.status(404).json({
          message:
            "This patient is not associated with your appointments.",
        });
      }


      againstPatient =
        against_id;
    }


    // =====================================
    // AGAINST STAFF
    // =====================================

    else if (
      against_type === "staff"
    ) {

      const staffResult =
        await pool.query(
          `SELECT staff_id

           FROM staff

           WHERE staff_id = $1
             AND approval_status =
                 'approved'`,
          [against_id]
        );


      if (
        staffResult.rows.length === 0
      ) {

        return res.status(404).json({
          message:
            "Approved staff not found.",
        });
      }


      againstStaff =
        against_id;
    }


    // =====================================
    // INVALID TARGET
    // =====================================

    else {

      return res.status(400).json({
        message:
          "Doctor can submit complaints only against a patient or staff member.",
      });
    }


    // =====================================
    // OPTIONAL APPOINTMENT CHECK
    // =====================================

    if (appointment_id) {

      const appointmentResult =
        await pool.query(
          `SELECT
            appointment_id,
            patient_id,
            doctor_id

           FROM appointment

           WHERE appointment_id = $1`,
          [appointment_id]
        );


      if (
        appointmentResult.rows.length === 0
      ) {

        return res.status(404).json({
          message:
            "Appointment not found.",
        });
      }


      const appointment =
        appointmentResult.rows[0];


      // appointment অবশ্যই logged-in doctor-এর
      if (
        Number(appointment.doctor_id) !==
        Number(doctorId)
      ) {

        return res.status(403).json({
          message:
            "This appointment does not belong to you.",
        });
      }


      // Patient-এর বিরুদ্ধে complaint হলে
      // appointment-এর patient একই হতে হবে

      if (
        against_type === "patient" &&
        Number(appointment.patient_id) !==
        Number(against_id)
      ) {

        return res.status(400).json({
          message:
            "The selected appointment does not belong to this patient.",
        });
      }
    }


    // =====================================
    // INSERT COMPLAINT
    // =====================================

    const result = await pool.query(
      `INSERT INTO complaint (

        filed_by_doctor_id,

        against_patient_id,
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
        doctorId,
        againstPatient,
        againstStaff,
        appointment_id || null,
        complaint_type.trim(),
        description.trim(),
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
      "Doctor complaint error:",
      error
    );


    return res.status(500).json({

      message:
        "Could not submit complaint.",

      error:
        error.message,
    });
  }
};
// =====================================================
// GET DOCTOR COMPLAINT HISTORY
// =====================================================

const getDoctorComplaints = async (req, res) => {
  try {

    const doctorId =
      req.user.doctor_id;


    const access =
      await getActiveDoctor(
        doctorId
      );


    if (!access.ok) {
      return sendDoctorAccessError(
        res,
        access
      );
    }


    const result = await pool.query(
      `SELECT

        c.complaint_id,
        c.appointment_id,

        c.complaint_type,
        c.description,

        c.complaint_date,
        c.complaint_status,
        c.admin_action,


        c.against_patient_id,

        p.full_name
          AS against_patient_name,


        c.against_staff_id,

        s.email
          AS against_staff_email,


        c.reviewed_by,

        a.full_name
          AS reviewed_by_name


       FROM complaint c


       LEFT JOIN patient p

         ON c.against_patient_id =
            p.patient_id


       LEFT JOIN staff s

         ON c.against_staff_id =
            s.staff_id


       LEFT JOIN admin a

         ON c.reviewed_by =
            a.admin_id


       WHERE
         c.filed_by_doctor_id = $1


       ORDER BY
         c.complaint_id DESC`,
      [doctorId]
    );


    return res.status(200).json({

      complaints:
        result.rows,
    });


  } catch (error) {

    console.error(
      "Doctor complaint history error:",
      error
    );


    return res.status(500).json({

      message:
        "Could not load complaint history.",

      error:
        error.message,
    });
  }
};
// module.exports = {
//   applyDoctor,
//   loginDoctor,
// };
// =====================================================
// STAFF ASSIGNMENT HELPERS
// =====================================================
const cleanupExpiredSuspensionAndAssignments = async () => {
  try {
    await pool.query(`UPDATE staff SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
  } catch (_) {}
  try {
    await pool.query(`UPDATE staff_assignment SET status='ENDED' WHERE status='ACTIVE' AND end_date IS NOT NULL AND end_date <= NOW()`);
  } catch (_) {}
};

// =====================================================
// GET MY STAFF (Primary + Temporary) for Doctor Dashboard
// =====================================================
const getMyStaff = async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    await cleanupExpiredSuspensionAndAssignments();

    const primaryRes = await pool.query(
      `SELECT sa.assignment_id, sa.staff_id, sa.assignment_type, sa.start_date, sa.end_date, sa.status,
              s.email, s.phone_number, s.gender, s.profile_pic, s.suspended_until, s.approval_status,
              CASE WHEN s.suspended_until IS NOT NULL AND s.suspended_until > NOW() THEN true ELSE false END as is_suspended
       FROM staff_assignment sa
       JOIN staff s ON sa.staff_id = s.staff_id
       WHERE sa.doctor_id=$1 AND sa.assignment_type='PRIMARY' AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
       LIMIT 1`,
      [doctorId]
    );

    const tempRes = await pool.query(
      `SELECT sa.assignment_id, sa.staff_id, sa.assignment_type, sa.start_date, sa.end_date, sa.status,
              s.email, s.phone_number, s.gender, s.profile_pic, s.suspended_until, s.approval_status,
              CASE WHEN s.suspended_until IS NOT NULL AND s.suspended_until > NOW() THEN true ELSE false END as is_suspended
       FROM staff_assignment sa
       JOIN staff s ON sa.staff_id = s.staff_id
       WHERE sa.doctor_id=$1 AND sa.assignment_type='TEMPORARY' AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
       LIMIT 1`,
      [doctorId]
    );

    // Derive primary live status from suspended_until as well
    let primary = primaryRes.rows[0] || null;
    let temporary = tempRes.rows[0] || null;

    // If primary's suspension has ended, temporary should have been auto-ended already, but ensure
    if (primary && primary.suspended_until && new Date(primary.suspended_until) <= new Date() && temporary) {
      // suspension ended but temp still active due to race - re-cleanup
      await pool.query(`UPDATE staff_assignment SET status='ENDED' WHERE assignment_id=$1`, [temporary.assignment_id]);
      temporary = null;
    }

    return res.status(200).json({
      primary,
      temporary,
      hasPrimary: !!primary,
      hasTemporary: !!temporary,
    });
  } catch (error) {
    console.error("getMyStaff error:", error);
    return res.status(500).json({ message: "Could not load staff info.", error: error.message });
  }
};

// =====================================================
// GET AVAILABLE STAFF FOR DOCTOR (Req 4)
// =====================================================
const getAvailableStaff = async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    await cleanupExpiredSuspensionAndAssignments();

    const result = await pool.query(
      `SELECT s.staff_id, s.email, s.phone_number, s.gender, s.profile_pic, s.approval_status, s.suspended_until
       FROM staff s
       WHERE s.approval_status='approved'
         AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
         AND NOT EXISTS (
           SELECT 1 FROM staff_assignment sa
           WHERE sa.staff_id = s.staff_id AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
         )
       ORDER BY s.staff_id ASC`
    );

    return res.status(200).json({ staff: result.rows });
  } catch (error) {
    console.error("getAvailableStaff error:", error);
    return res.status(500).json({ message: "Could not fetch available staff.", error: error.message });
  }
};

// =====================================================
// ASSIGN STAFF (PRIMARY or TEMPORARY) - transaction + locking
// =====================================================
const assignStaff = async (req, res) => {
  const client = await pool.connect();
  try {
    const doctorId = req.user.doctor_id;
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    const { staff_id } = req.body;
    if (!staff_id) return res.status(400).json({ message: "staff_id is required." });

    await client.query("BEGIN");
    await client.query(`UPDATE staff SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
    await client.query(`UPDATE staff_assignment SET status='ENDED' WHERE status='ACTIVE' AND end_date IS NOT NULL AND end_date <= NOW()`);

    // Lock staff row
    const staffRes = await client.query(`SELECT staff_id, approval_status, suspended_until FROM staff WHERE staff_id=$1 FOR UPDATE`, [staff_id]);
    if (staffRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Staff not found." });
    }
    const staff = staffRes.rows[0];
    if (staff.approval_status !== 'approved') {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Staff is not approved." });
    }
    if (staff.suspended_until && new Date(staff.suspended_until) > new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot assign suspended staff." });
    }
    // Already actively assigned?
    const activeAssign = await client.query(
      `SELECT assignment_id FROM staff_assignment WHERE staff_id=$1 AND status='ACTIVE' AND (end_date IS NULL OR end_date > NOW()) FOR UPDATE`,
      [staff_id]
    );
    if (activeAssign.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "This staff is already actively assigned to another Doctor." });
    }
    // Check current primary for this doctor
    const primaryRes = await client.query(
      `SELECT sa.assignment_id, sa.staff_id, s.suspended_until
       FROM staff_assignment sa JOIN staff s ON sa.staff_id=s.staff_id
       WHERE sa.doctor_id=$1 AND sa.assignment_type='PRIMARY' AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
       FOR UPDATE`,
      [doctorId]
    );

    const tempRes = await client.query(
      `SELECT assignment_id FROM staff_assignment WHERE doctor_id=$1 AND assignment_type='TEMPORARY' AND status='ACTIVE' AND (end_date IS NULL OR end_date > NOW()) FOR UPDATE`,
      [doctorId]
    );

    let assignmentType;
    let endDate = null;

    if (primaryRes.rows.length === 0) {
      // No primary -> assign PRIMARY
      if (tempRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Doctor already has a temporary assignment without primary. Contact admin." });
      }
      assignmentType = 'PRIMARY';
      endDate = null;
    } else {
      // Has primary, check if suspended
      const primary = primaryRes.rows[0];
      const isSuspended = primary.suspended_until && new Date(primary.suspended_until) > new Date();
      if (!isSuspended) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Doctor already has an active Primary Staff. Cannot assign another primary." });
      }
      // Primary is suspended -> allow TEMPORARY if no temp exists
      if (tempRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Doctor already has an active Temporary Replacement Staff." });
      }
      assignmentType = 'TEMPORARY';
      endDate = primary.suspended_until; // same period as suspension
    }

    // Insert with unique constraint protection
    let insertRes;
    try {
      insertRes = await client.query(
        `INSERT INTO staff_assignment (staff_id, doctor_id, assignment_type, start_date, end_date, status)
         VALUES ($1,$2,$3, NOW(), $4, 'ACTIVE') RETURNING *`,
        [staff_id, doctorId, assignmentType, endDate]
      );
    } catch (e) {
      await client.query("ROLLBACK");
      if (e.code === '23505') {
        return res.status(409).json({ message: "Assignment conflict: staff or doctor already has active assignment. Try refreshed list." });
      }
      throw e;
    }

    await client.query("COMMIT");
    return res.status(201).json({
      message: assignmentType === 'PRIMARY' ? "Primary Staff assigned successfully." : "Temporary Replacement Staff assigned successfully.",
      assignment: insertRes.rows[0],
    });

  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("assignStaff error:", error);
    return res.status(500).json({ message: "Could not assign staff.", error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  applyDoctor,
  loginDoctor,
  getDoctorProfile,
  getDoctorDashboardStats,
   getDoctorAppointments,
    getMedicines,
  getTests,
    createPrescription,
     getReferralDoctors,
  createReferral,
  getSentReferrals,
  getReceivedReferrals,
    getDoctorComplaintTargets,
  createDoctorComplaint,
  getDoctorComplaints,
  getMyStaff,
  getAvailableStaff,
  assignStaff,
};