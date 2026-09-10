
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");


// =====================================================
// HELPER - CHECK ACTIVE STAFF
// =====================================================

const getActiveStaff = async (staffId) => {

  const result = await pool.query(
    `SELECT
      staff_id,
      admin_id,
      email,
      phone_number,
      gender,
      profile_pic,
      approval_status,
      suspended_until
     FROM staff
     WHERE staff_id = $1`,
    [staffId]
  );


  if (result.rows.length === 0) {

    return {
      ok: false,
      status: 404,
      message: "Staff account not found.",
    };
  }


  const staff = result.rows[0];


  // Staff must be approved
  if (staff.approval_status !== "approved") {

    return {
      ok: false,
      status: 403,
      message: "Your staff account is not approved.",
    };
  }


  // =============================================
  // CLEAR EXPIRED SUSPENSION
  // =============================================

  if (
    staff.suspended_until &&
    new Date(staff.suspended_until) <= new Date()
  ) {

    await pool.query(
      `UPDATE staff
       SET suspended_until = NULL
       WHERE staff_id = $1`,
      [staffId]
    );

    staff.suspended_until = null;
  }


  // =============================================
  // ACTIVE SUSPENSION
  // =============================================

  if (
    staff.suspended_until &&
    new Date(staff.suspended_until) > new Date()
  ) {

    return {
      ok: false,
      status: 403,

      message:
        "Your account is temporarily suspended. You cannot use Doctoralia until the suspension period ends.",

      suspended_until:
        staff.suspended_until,
    };
  }


  return {
    ok: true,
    staff,
  };
};


// =====================================================
// SEND STAFF ACCESS ERROR
// =====================================================

const sendStaffAccessError = (
  res,
  check
) => {

  return res
    .status(check.status)
    .json({

      message:
        check.message,

      ...(check.suspended_until
        ? {
            suspended_until:
              check.suspended_until,
          }
        : {}),
    });
};


// =====================================================
// STAFF APPLICATION
// =====================================================

const applyStaff = async (req, res) => {

  try {

    const {
      email,
      password,
      phone_number,
      gender,
    } = req.body;


    if (
      !email ||
      !password ||
      !phone_number ||
      !gender
    ) {

      return res.status(400).json({
        message:
          "Email, password, phone number and gender are required.",
      });
    }


    // =============================================
    // SINGLETON GUARD: only one staff allowed
    // =============================================
    const staffCount = await pool.query(
      `SELECT COUNT(*) FROM staff WHERE approval_status IN ('pending','approved')`
    );
    if (Number(staffCount.rows[0].count) >= 1) {
      return res.status(403).json({
        message: "Staff registration is closed. Only one staff is allowed and has already been registered.",
        closed: true,
      });
    }

    // =============================================
    // CHECK EXISTING STAFF
    // =============================================

    const existingStaff =
      await pool.query(
        `SELECT staff_id
         FROM staff
         WHERE email = $1`,
        [email]
      );


    if (
      existingStaff.rows.length > 0
    ) {

      return res.status(409).json({
        message:
          "This email already exists.",
      });
    }


    // =============================================
    // PASSWORD HASH
    // =============================================

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );


    // =============================================
    // PROFILE PICTURE
    // =============================================

    const profilePic =
      req.file

        ? `/uploads/staff/${req.file.filename}`

        : null;


    // =============================================
    // INSERT STAFF
    // =============================================

    const result =
      await pool.query(

        `INSERT INTO staff (
          admin_id,
          email,
          password,
          phone_number,
          gender,
          profile_pic
        )

        VALUES (
          NULL,
          $1,
          $2,
          $3,
          $4,
          $5
        )

        RETURNING
          staff_id,
          email,
          phone_number,
          gender,
          admin_id,
          approval_status`,

        [
          email,
          hashedPassword,
          phone_number,
          gender,
          profilePic,
        ]
      );


    return res.status(201).json({

      message:
        "Staff application successfully submitted. Wait for admin approval.",

      staff:
        result.rows[0],
    });


  } catch (error) {

    console.error(
      "Staff application error:",
      error
    );


    return res.status(500).json({

      message:
        "Staff application could not be submitted.",

      error:
        error.message,
    });
  }
};


// =====================================================
// STAFF LOGIN
// =====================================================

const loginStaff = async (req, res) => {

  try {

    const {
      email,
      password,
    } = req.body;


    if (
      !email ||
      !password
    ) {

      return res.status(400).json({
        message:
          "Email and password are required.",
      });
    }


    // =============================================
    // GET STAFF
    // =============================================

    const result =
      await pool.query(

        `SELECT
          staff_id,
          admin_id,
          email,
          password,
          phone_number,
          gender,
          profile_pic,
          approval_status,
          suspended_until

         FROM staff

         WHERE email = $1`,

        [email]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }


    const staff =
      result.rows[0];


    // =============================================
    // PASSWORD CHECK
    // =============================================

    const isPasswordValid =
      await bcrypt.compare(
        password,
        staff.password
      );


    if (!isPasswordValid) {

      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }


    // =============================================
    // APPROVAL CHECK
    // =============================================

    if (
      staff.approval_status ===
      "pending"
    ) {

      return res.status(403).json({

        message:
          "Your account is waiting for admin approval.",
      });
    }


    if (
      staff.approval_status ===
      "rejected"
    ) {

      return res.status(403).json({

        message:
          "Your staff application was rejected.",
      });
    }


    // =============================================
    // REMOVE EXPIRED SUSPENSION
    // =============================================

    if (
      staff.suspended_until &&
      new Date(
        staff.suspended_until
      ) <= new Date()
    ) {

      await pool.query(

        `UPDATE staff
         SET suspended_until = NULL
         WHERE staff_id = $1`,

        [staff.staff_id]
      );


      staff.suspended_until =
        null;
    }


    // =============================================
    // BLOCK ACTIVE SUSPENSION
    // =============================================

    if (
      staff.suspended_until &&
      new Date(
        staff.suspended_until
      ) > new Date()
    ) {

      return res.status(403).json({

        message:
          "Your account is temporarily suspended. You cannot login for the suspension period.",

        suspended_until:
          staff.suspended_until,
      });
    }


    // =============================================
    // JWT TOKEN
    // =============================================

    const token =
      jwt.sign(

        {
          staff_id:
            staff.staff_id,

          role:
            "staff",
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            "1d",
        }
      );


    delete staff.password;


    return res
      .status(200)
      .json({

        message:
          "Login successful.",

        token,

        staff,
      });


  } catch (error) {

    console.error(
      "Staff login error:",
      error
    );


    return res
      .status(500)
      .json({

        message:
          "Staff login could not be completed.",

        error:
          error.message,
      });
  }
};


// =====================================================
// STAFF PROFILE
// =====================================================

const getStaffProfile =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      return res
        .status(200)
        .json({

          staff:
            access.staff,
        });


    } catch (error) {

      console.error(
        "Get staff profile error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not load staff profile.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// STAFF DASHBOARD STATISTICS
// =====================================================

const getStaffDashboardStats =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      const [
        pending,
        scheduled,
        confirmed,
        complaints,
      ] =
        await Promise.all([


          // Pending appointments
          pool.query(
            `SELECT COUNT(*)
             FROM appointment
             WHERE appointment_status =
             'pending'`
          ),


          // Scheduled appointments
          pool.query(
            `SELECT COUNT(*)
             FROM appointment
             WHERE appointment_status =
             'scheduled'`
          ),


          // Confirmed appointments
          pool.query(
            `SELECT COUNT(*)
             FROM appointment
             WHERE appointment_status =
             'confirmed'`
          ),


          // Staff complaints
          pool.query(
            `SELECT COUNT(*)
             FROM complaint
             WHERE filed_by_staff_id = $1`,
            [staffId]
          ),
        ]);


      return res
        .status(200)
        .json({

          pendingAppointments:
            Number(
              pending.rows[0].count
            ),

          scheduledAppointments:
            Number(
              scheduled.rows[0].count
            ),

          confirmedAppointments:
            Number(
              confirmed.rows[0].count
            ),

          complaints:
            Number(
              complaints.rows[0].count
            ),
        });


    } catch (error) {

      console.error(
        "Staff dashboard stats error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not load dashboard statistics.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// GET APPOINTMENTS FOR STAFF
// =====================================================

const getStaffAppointments =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      const result =
        await pool.query(

          `SELECT

            a.appointment_id,
            a.patient_id,
            a.doctor_id,
            a.hospital_id,
            a.schedule_id,
            a.booking_date,
            a.appointment_status,


            p.full_name
              AS patient_name,

            p.email
              AS patient_email,

            p.phone_number
              AS patient_phone,


            d.full_name
              AS doctor_name,

            d.specification,

            d.qualification,


            dep.department_name,


            h.hospital_name,

            h.city
              AS hospital_city,


            s.available_date,

            s.start_time,

            s.end_time,

            ds.status as slot_status,


            pay.payment_id,

            pay.amount,

            pay.payment_status


           FROM appointment a


           JOIN patient p

             ON a.patient_id =
                p.patient_id


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

           LEFT JOIN doctor_schedule ds
             ON ds.schedule_id = s.schedule_id AND ds.doctor_id = a.doctor_id


           LEFT JOIN payment pay

             ON a.appointment_id =
                pay.appointment_id


           ORDER BY

             CASE

               WHEN
                 a.appointment_status =
                 'pending'
               THEN 0

               WHEN
                 a.appointment_status =
                 'scheduled'
               THEN 1

               WHEN
                 a.appointment_status =
                 'confirmed'
               THEN 2

               ELSE 3

             END,

             a.appointment_id DESC`
        );


      return res
        .status(200)
        .json({

          appointments:
            result.rows,
        });


    } catch (error) {

      console.error(
        "Get staff appointments error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not fetch appointments.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// GET HOSPITALS
// =====================================================

const getHospitals =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      const result =
        await pool.query(

          `SELECT
            hospital_id,
            hospital_name,
            city,
            address,
            phone_number,
            description

           FROM hospital

           ORDER BY
             hospital_name ASC`
        );


      return res
        .status(200)
        .json({

          hospitals:
            result.rows,
        });


    } catch (error) {

      console.error(
        "Get hospitals error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not fetch hospitals.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// STAFF SET HOSPITAL + ASSIGN EXISTING DOCTOR SCHEDULE
// Staff must NOT create/edit/delete doctor schedules.
// Doctor schedules are managed only by doctors (00:01-03:00 window).
// Staff only assigns appointment to an existing available slot.
// =====================================================

const scheduleAppointment =
  async (req, res) => {

    const client =
      await pool.connect();


    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      const appointmentId =
        req.params.id;


      const {

        hospital_id,

        schedule_id,

      } = req.body;


      // =============================================
      // REQUIRED VALUES - staff only assigns existing slot
      // =============================================

      if (
        !hospital_id ||
        !schedule_id
      ) {

        return res
          .status(400)
          .json({

            message:
              "Hospital and schedule (slot) are required. Select an available doctor slot created by the doctor.",
          });
      }


      await client.query(
        "BEGIN"
      );


      // =============================================
      // APPOINTMENT + DOCTOR
      // =============================================

      const appointmentResult =
        await client.query(

          `SELECT

            a.appointment_id,

            a.doctor_id,

            a.schedule_id,

            a.appointment_status,

            d.max_patient_num,

            d.suspended_until


           FROM appointment a


           JOIN doctor d

             ON a.doctor_id =
                d.doctor_id


           WHERE
             a.appointment_id = $1


           FOR UPDATE`,

          [appointmentId]
        );


      if (
        appointmentResult
          .rows.length === 0
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res
          .status(404)
          .json({

            message:
              "Appointment not found.",
          });
      }


      const appointment =
        appointmentResult.rows[0];


      // =============================================
      // ONLY PENDING / SCHEDULED CAN CHANGE
      // =============================================

      if (
        ![
          "pending",
          "scheduled",
        ].includes(
          appointment
            .appointment_status
        )
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res
          .status(400)
          .json({

            message:
              "Only pending or scheduled appointments can be scheduled by staff.",
          });
      }


      // =============================================
      // DOCTOR SUSPENSION CHECK
      // =============================================

      if (
        appointment.suspended_until &&
        new Date(
          appointment
            .suspended_until
        ) > new Date()
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res
          .status(403)
          .json({

            message:
              "This doctor is currently suspended and cannot receive a schedule.",
          });
      }


      // =============================================
      // HOSPITAL CHECK
      // =============================================

      const hospitalResult =
        await client.query(

          `SELECT
             hospital_id

           FROM hospital

           WHERE hospital_id = $1`,

          [hospital_id]
        );


      if (
        hospitalResult
          .rows.length === 0
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res
          .status(404)
          .json({

            message:
              "Hospital not found.",
          });
      }


      // =============================================
      // SCHEDULE VALIDATION - M:N: must exist in doctor_schedule with AVAILABLE
      // =============================================

      const scheduleResultCheck =
        await client.query(
          `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status, ds.doctor_id
           FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
           WHERE s.schedule_id = $1 AND ds.doctor_id=$2 FOR UPDATE`,
          [schedule_id, appointment.doctor_id]
        );

      if (scheduleResultCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Selected schedule slot not found or not owned by this doctor." });
      }

      const slot = scheduleResultCheck.rows[0];

      if (slot.slot_status === "WORKING") {
        const bookedCheck = await client.query(
          `SELECT appointment_id FROM appointment WHERE schedule_id = $1 AND doctor_id=$2 AND appointment_id <> $3 AND appointment_status IN ('scheduled','confirmed') LIMIT 1`,
          [schedule_id, appointment.doctor_id, appointmentId]
        );
        if (bookedCheck.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Selected slot is already booked by another appointment." });
        }
      }

      if (slot.slot_status === "UNAVAILABLE") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Selected slot is marked unavailable by the doctor." });
      }

      // Expired check via date+time (dynamic)
      const now = new Date();
      try {
        const { isSlotExpired } = require("../utils/scheduleWindow");
        if (isSlotExpired(slot.available_date, slot.end_time, now)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Selected slot is expired and cannot be booked." });
        }
      } catch {}
      const slotDateStr = String(slot.available_date).split("T")[0];
      const todayStr = new Date().toISOString().split("T")[0];
      if (slotDateStr < todayStr) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot book a past date slot." });
      }


      // =============================================
      // CHECK SLOT ALREADY BOOKED BY ANOTHER APPOINTMENT
      // =============================================

      const existingBooking = await client.query(
        `SELECT appointment_id FROM appointment WHERE schedule_id = $1 AND appointment_id <> $2 AND appointment_status IN ('scheduled','confirmed') LIMIT 1`,
        [schedule_id, appointmentId]
      );
      if (existingBooking.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "This slot is already assigned to another appointment." });
      }


      // =============================================
      // M:N: Booking does NOT change doctor_schedule.status (keeps AVAILABLE/WORKING)
      // But we ensure slot stays AVAILABLE and appointment links to it.
      // Previous slot freeing is not needed as status stays.
      // =============================================

      let finalSchedule = slot;
      // No status change on booking; keep AVAILABLE for other patients per M:N concept
      // If you want per-doctor booking lock, uncomment: UPDATE doctor_schedule SET status='WORKING'
      // Keeping AVAILABLE allows many patients per same time slot up to max_patient_num if needed


      // =============================================
      // UPDATE APPOINTMENT
      // =============================================

      // Use hospital from slot if staff didn't provide (schedule.hospital_id is source of truth)
      const finalHospitalId = hospital_id || slot.hospital_id;
      if (!finalHospitalId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Slot has no hospital. Contact doctor to set hospital." });
      }
      const updatedAppointment =
        await client.query(

          `UPDATE appointment

           SET

             hospital_id = $1,

             schedule_id = $2,

             appointment_status =
               'scheduled'

           WHERE
             appointment_id = $3

           RETURNING *`,

          [
            finalHospitalId,

            finalSchedule.schedule_id,

            appointmentId,
          ]
        );


      await client.query(
        "COMMIT"
      );


      return res
        .status(200)
        .json({

          message:
            "Hospital and schedule assigned successfully. Patient can now make payment.",

          appointment:
            updatedAppointment
              .rows[0],

          schedule: finalSchedule,
        });


    } catch (error) {

      await client.query(
        "ROLLBACK"
      );


      console.error(
        "Schedule appointment error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not schedule appointment.",

          error:
            error.message,
        });


    } finally {

      client.release();
    }
  };

// =====================================================
// GET AVAILABLE SCHEDULE SLOTS FOR A DOCTOR (Staff read-only)
// Staff can VIEW but NOT modify doctor schedules
// =====================================================

const getAvailableSchedules = async (req, res) => {
  try {
    const staffId = req.user.staff_id;
    const access = await getActiveStaff(staffId);
    if (!access.ok) return sendStaffAccessError(res, access);

    const { doctor_id } = req.query;
    if (!doctor_id) {
      return res.status(400).json({ message: "doctor_id query param is required." });
    }

    const { isSlotExpired } = require("../utils/scheduleWindow");
    const now = new Date();

    const result = await pool.query(
      `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, s.created_at, s.updated_at, ds.status as slot_status, h.hospital_name
       FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
       LEFT JOIN hospital h ON s.hospital_id=h.hospital_id
       WHERE ds.doctor_id=$1 AND ds.status='AVAILABLE'
       ORDER BY s.available_date ASC, s.start_time ASC`,
      [doctor_id]
    );

    // Filter out expired slots dynamically
    const available = result.rows.filter((s) => !isSlotExpired(s.available_date, s.end_time, now));

    return res.status(200).json({ schedules: available });
  } catch (error) {
    console.error("getAvailableSchedules error:", error);
    return res.status(500).json({ message: "Could not load available schedules.", error: error.message });
  }
};


// =====================================================
// PATIENT + DOCTOR LIST FOR COMPLAINT
// =====================================================

const getComplaintTargets =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      const [
        patientsResult,
        doctorsResult,
      ] =
        await Promise.all([


          // PATIENTS
          pool.query(

            `SELECT

              patient_id,

              full_name,

              email,

              phone_number

             FROM patient

             ORDER BY
               full_name ASC`
          ),


          // DOCTORS
          pool.query(

            `SELECT

              d.doctor_id,

              d.full_name,

              d.email,

              d.specification,

              dep.department_name


             FROM doctor d


             LEFT JOIN department dep

               ON d.department_id =
                  dep.department_id


             WHERE

               d.approval_status =
               'approved'


             ORDER BY
               d.full_name ASC`
          ),
        ]);


      return res
        .status(200)
        .json({

          patients:
            patientsResult.rows,

          doctors:
            doctorsResult.rows,
        });


    } catch (error) {

      console.error(
        "Complaint target error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not load complaint targets.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// STAFF COMPLAINT AGAINST PATIENT / DOCTOR
// =====================================================

const createStaffComplaint =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
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


      // =============================================
      // VALIDATION
      // =============================================

      if (
        !against_type ||
        !against_id ||
        !complaint_type ||
        !description
      ) {

        return res
          .status(400)
          .json({

            message:
              "Required complaint information is missing.",
          });
      }


      let againstPatient =
        null;

      let againstDoctor =
        null;


      // =============================================
      // AGAINST PATIENT
      // =============================================

      if (
        against_type ===
        "patient"
      ) {

        const patientResult =
          await pool.query(

            `SELECT
               patient_id

             FROM patient

             WHERE
               patient_id = $1`,

            [against_id]
          );


        if (
          patientResult
            .rows.length === 0
        ) {

          return res
            .status(404)
            .json({

              message:
                "Patient not found.",
            });
        }


        againstPatient =
          against_id;
      }


      // =============================================
      // AGAINST DOCTOR
      // =============================================

      else if (
        against_type ===
        "doctor"
      ) {

        const doctorResult =
          await pool.query(

            `SELECT
               doctor_id

             FROM doctor

             WHERE
               doctor_id = $1`,

            [against_id]
          );


        if (
          doctorResult
            .rows.length === 0
        ) {

          return res
            .status(404)
            .json({

              message:
                "Doctor not found.",
            });
        }


        againstDoctor =
          against_id;
      }


      // =============================================
      // INVALID TYPE
      // =============================================

      else {

        return res
          .status(400)
          .json({

            message:
              "Staff can submit complaints only against a patient or doctor.",
          });
      }


      // =============================================
      // APPOINTMENT CHECK
      // =============================================

      if (
        appointment_id
      ) {

        const appointmentResult =
          await pool.query(

            `SELECT
               appointment_id

             FROM appointment

             WHERE
               appointment_id = $1`,

            [appointment_id]
          );


        if (
          appointmentResult
            .rows.length === 0
        ) {

          return res
            .status(404)
            .json({

              message:
                "Appointment not found.",
            });
        }
      }


      // =============================================
      // INSERT COMPLAINT
      // =============================================

      const result =
        await pool.query(

          `INSERT INTO complaint (

            filed_by_staff_id,

            against_patient_id,

            against_doctor_id,

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
            staffId,

            againstPatient,

            againstDoctor,

            appointment_id ||
              null,

            complaint_type,

            description,
          ]
        );


      return res
        .status(201)
        .json({

          message:
            "Complaint submitted successfully.",

          complaint:
            result.rows[0],
        });


    } catch (error) {

      console.error(
        "Staff complaint error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not submit complaint.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// STAFF COMPLAINT HISTORY
// =====================================================

const getStaffComplaints =
  async (req, res) => {

    try {

      const staffId =
        req.user.staff_id;


      const access =
        await getActiveStaff(
          staffId
        );


      if (!access.ok) {

        return sendStaffAccessError(
          res,
          access
        );
      }


      const result =
        await pool.query(

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


            c.against_doctor_id,

            d.full_name
              AS against_doctor_name,


            c.reviewed_by,

            a.full_name
              AS reviewed_by_name


           FROM complaint c


           LEFT JOIN patient p

             ON c.against_patient_id =
                p.patient_id


           LEFT JOIN doctor d

             ON c.against_doctor_id =
                d.doctor_id


           LEFT JOIN admin a

             ON c.reviewed_by =
                a.admin_id


           WHERE
             c.filed_by_staff_id = $1


           ORDER BY
             c.complaint_id DESC`,

          [staffId]
        );


      return res
        .status(200)
        .json({

          complaints:
            result.rows,
        });


    } catch (error) {

      console.error(
        "Get staff complaints error:",
        error
      );


      return res
        .status(500)
        .json({

          message:
            "Could not fetch complaints.",

          error:
            error.message,
        });
    }
  };


// =====================================================
// STAFF REGISTRATION STATUS (singleton check for UI)
// =====================================================

const getStaffRegistrationStatus = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM staff WHERE approval_status IN ('pending','approved')`
    );
    const count = Number(result.rows[0].count);
    const closed = count >= 1;
    return res.status(200).json({
      closed,
      count,
      message: closed
        ? "Staff registration is closed. Only one staff is allowed and has already been registered."
        : "Staff registration is open.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch staff status.", error: error.message });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {

  applyStaff,

  loginStaff,
  getStaffRegistrationStatus,

  getStaffProfile,

  getStaffDashboardStats,

  getStaffAppointments,

  getHospitals,

  scheduleAppointment,
  getAvailableSchedules,

  getComplaintTargets,

  createStaffComplaint,

  getStaffComplaints,
};