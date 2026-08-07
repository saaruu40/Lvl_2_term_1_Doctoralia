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
        message: "email এবং password আবশ্যক।",
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
        address
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
    const isPasswordValid = await bcrypt.compare(password, patient.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    delete patient.password;

    return res.status(200).json({
      message: "Login successful.",
      patient,
    });
  } catch (error) {
    console.error("Patient login error:", error);

    return res.status(500).json({
      message: "Patient login করা যায়নি।",
      error: error.message,
    });
  }
};

module.exports = {
  registerPatient,
  loginPatient,
};
