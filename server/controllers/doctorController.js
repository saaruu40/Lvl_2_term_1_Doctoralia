const bcrypt = require("bcrypt");
const pool = require("../config/db");

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
        department_id || null,
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
        "Doctor application successfully submitted. Admin approval-এর জন্য অপেক্ষা করুন।",
      doctor: result.rows[0],
    });
  } catch (error) {
    console.error("Doctor application error:", error);

    return res.status(500).json({
      message: "Doctor application submit করা যায়নি।",
      error: error.message,
    });
  }
};

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT doctor_id, full_name, email, password, approved_by
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

    if (doctor.approved_by === null) {
      return res.status(403).json({
        message: "Your account is waiting for admin approval.",
      });
    }

    return res.status(200).json({
      message: "Doctor login successful.",
      doctor: {
        doctor_id: doctor.doctor_id,
        full_name: doctor.full_name,
        email: doctor.email,
      },
    });
  } catch (error) {
    console.error("Doctor login error:", error);

    return res.status(500).json({
      message: "Doctor login failed.",
      error: error.message,
    });
  }
};
// module.exports = {
//   applyDoctor,
// };
module.exports = {
  applyDoctor,
  loginDoctor,
};