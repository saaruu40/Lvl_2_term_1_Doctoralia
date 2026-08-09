const pool = require("../config/db");

const createComplaint = async (req, res) => {
  try {
    const {
      filed_by_type,
      filed_by_id,
      against_type,
      against_id,
      appointment_id,
      complaint_type,
      description,
    } = req.body;

    if (
      !filed_by_type ||
      !filed_by_id ||
      !against_type ||
      !against_id ||
      !complaint_type ||
      !description
    ) {
      return res.status(400).json({
        message: "All complaint fields are required.",
      });
    }

    const validTypes = ["patient", "doctor", "staff"];

    if (
      !validTypes.includes(filed_by_type) ||
      !validTypes.includes(against_type)
    ) {
      return res.status(400).json({
        message: "Invalid user type.",
      });
    }

    let filedByPatient = null;
    let filedByDoctor = null;
    let filedByStaff = null;

    let againstPatient = null;
    let againstDoctor = null;
    let againstStaff = null;

    // =========================
    // FILED BY
    // =========================

    if (filed_by_type === "patient") {
      filedByPatient = filed_by_id;
    }

    if (filed_by_type === "doctor") {
      filedByDoctor = filed_by_id;
    }

    if (filed_by_type === "staff") {
      filedByStaff = filed_by_id;
    }

    // =========================
    // AGAINST
    // =========================

    if (against_type === "patient") {
      againstPatient = against_id;
    }

    if (against_type === "doctor") {
      againstDoctor = against_id;
    }

    if (against_type === "staff") {
      againstStaff = against_id;
    }

    const result = await pool.query(
      `INSERT INTO complaint (
        filed_by_patient_id,
        filed_by_doctor_id,
        filed_by_staff_id,

        against_patient_id,
        against_doctor_id,
        against_staff_id,

        appointment_id,

        complaint_type,
        description,

        complaint_status
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7,
        $8, $9,
        'pending'
      )
      RETURNING *`,
      [
        filedByPatient,
        filedByDoctor,
        filedByStaff,

        againstPatient,
        againstDoctor,
        againstStaff,

        appointment_id || null,

        complaint_type,
        description,
      ]
    );

    return res.status(201).json({
      message: "Complaint submitted successfully.",
      complaint: result.rows[0],
    });

  } catch (error) {
    console.error("Create complaint error:", error);

    return res.status(500).json({
      message: "Could not create complaint.",
      error: error.message,
    });
  }
};

module.exports = {
  createComplaint,
};