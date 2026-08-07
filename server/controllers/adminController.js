const bcrypt = require("bcrypt");
const pool = require("../config/db");


// ===============================
// ADMIN REGISTRATION
// ===============================
const registerAdmin = async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      phone_number,
    } = req.body;

    // Check required fields
    if (!full_name || !email || !password || !phone_number) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    // Check existing admin
    const existingAdmin = await pool.query(
      `SELECT admin_id
       FROM admin
       WHERE email = $1`,
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({
        message: "Admin already exists with this email.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin
    const result = await pool.query(
      `INSERT INTO admin (
        full_name,
        email,
        password,
        phone_number
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        admin_id,
        full_name,
        email,
        phone_number`,
      [
        full_name,
        email,
        hashedPassword,
        phone_number,
      ]
    );

    return res.status(201).json({
      message: "Admin registration successful.",
      admin: result.rows[0],
    });

  } catch (error) {
    console.error("Admin registration error:", error);

    return res.status(500).json({
      message: "Admin registration failed.",
      error: error.message,
    });
  }
};


// ===============================
// ADMIN LOGIN
// ===============================
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM admin
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const admin = result.rows[0];

    const passwordMatched = await bcrypt.compare(
      password,
      admin.password
    );

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return res.status(200).json({
      message: "Admin login successful.",
      admin: {
        admin_id: admin.admin_id,
        full_name: admin.full_name,
        email: admin.email,
        phone_number: admin.phone_number,
      },
    });

  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      message: "Admin login failed.",
      error: error.message,
    });
  }
};


// ===============================
// GET PENDING DOCTORS
// ===============================
const getPendingDoctors = async (req, res) => {
  try {
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
        approved_by
       FROM doctor
       WHERE approved_by IS NULL
       ORDER BY doctor_id DESC`
    );

    return res.status(200).json({
      message: "Pending doctors fetched successfully.",
      doctors: result.rows,
    });

  } catch (error) {
    console.error("Pending doctors error:", error);

    return res.status(500).json({
      message: "Could not fetch pending doctors.",
      error: error.message,
    });
  }
};


// ===============================
// APPROVE DOCTOR
// ===============================
const approveDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({
        message: "admin_id is required.",
      });
    }

    // Check admin exists
    const adminCheck = await pool.query(
      `SELECT admin_id
       FROM admin
       WHERE admin_id = $1`,
      [admin_id]
    );

    if (adminCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Admin not found.",
      });
    }

    // Check doctor exists
    const doctorCheck = await pool.query(
      `SELECT doctor_id, approved_by
       FROM doctor
       WHERE doctor_id = $1`,
      [doctorId]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Doctor not found.",
      });
    }

    if (doctorCheck.rows[0].approved_by !== null) {
      return res.status(400).json({
        message: "Doctor is already approved.",
      });
    }

    const result = await pool.query(
      `UPDATE doctor
       SET approved_by = $1
       WHERE doctor_id = $2
       RETURNING
         doctor_id,
         full_name,
         email,
         approved_by`,
      [admin_id, doctorId]
    );

    return res.status(200).json({
      message: "Doctor approved successfully.",
      doctor: result.rows[0],
    });

  } catch (error) {
    console.error("Doctor approval error:", error);

    return res.status(500).json({
      message: "Doctor approval failed.",
      error: error.message,
    });
  }
};


module.exports = {
  registerAdmin,
  loginAdmin,
  getPendingDoctors,
  approveDoctor,
};