const bcrypt = require("bcrypt");
const pool = require("../config/db");

const applyStaff = async (req, res) => {
  try {
    const { email, password, phone_number, gender } = req.body;

    if (!email || !password || !phone_number || !gender) {
      return res.status(400).json({
        message: "email, password, phone_number এবং gender আবশ্যক।",
      });
    }

    const existingStaff = await pool.query(
      `SELECT staff_id
       FROM staff
       WHERE email = $1`,
      [email]
    );

    if (existingStaff.rows.length > 0) {
      return res.status(409).json({
        message: "এই email দিয়ে আগে থেকেই আবেদন করা হয়েছে।",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profilePic = req.file
      ? `/uploads/staff/${req.file.filename}`
      : null;

    const result = await pool.query(
      `INSERT INTO staff (
        admin_id,
        email,
        password,
        phone_number,
        gender,
        profile_pic
      )
      VALUES (NULL, $1, $2, $3, $4, $5)
      RETURNING
        staff_id,
        email,
        phone_number,
        gender,
        admin_id`,
      [email, hashedPassword, phone_number, gender, profilePic]
    );

    return res.status(201).json({
      message:
        "Staff application successfully submitted. Admin approval-এর জন্য অপেক্ষা করুন।",
      staff: result.rows[0],
    });
  } catch (error) {
    console.error("Staff application error:", error);

    return res.status(500).json({
      message: "Staff application submit করা যায়নি।",
      error: error.message,
    });
  }
};

const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email এবং password আবশ্যক।",
      });
    }

    const result = await pool.query(
      `SELECT
        staff_id,
        admin_id,
        email,
        password,
        phone_number,
        gender,
        profile_pic,
        approval_status
       FROM staff
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const staff = result.rows[0];
if (staff.approval_status === "pending") {
  return res.status(403).json({
    message: "Your account is waiting for admin approval.",
  });
}

if (staff.approval_status === "rejected") {
  return res.status(403).json({
    message: "Your staff application was rejected.",
  });
}

    const isPasswordValid = await bcrypt.compare(password, staff.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    delete staff.password;

    return res.status(200).json({
      message: "Login successful.",
      staff,
    });
  } catch (error) {
    console.error("Staff login error:", error);

    return res.status(500).json({
      message: "Staff login করা যায়নি।",
      error: error.message,
    });
  }
};
const scheduleAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    const {
      hospital_id,
      schedule_id,
    } = req.body;

    if (!hospital_id || !schedule_id) {
      return res.status(400).json({
        message:
          "Hospital ID and Schedule ID are required.",
      });
    }

    const appointmentCheck =
      await pool.query(
        `SELECT appointment_id, appointment_status
         FROM appointment
         WHERE appointment_id = $1`,
        [appointmentId]
      );

    if (
      appointmentCheck.rows.length === 0
    ) {
      return res.status(404).json({
        message: "Appointment not found.",
      });
    }

    const result = await pool.query(
      `UPDATE appointment
       SET
         hospital_id = $1,
         schedule_id = $2,
         appointment_status = 'scheduled'
       WHERE appointment_id = $3
       RETURNING *`,
      [
        hospital_id,
        schedule_id,
        appointmentId,
      ]
    );

    return res.status(200).json({
      message:
        "Appointment scheduled successfully.",
      appointment: result.rows[0],
    });

  } catch (error) {
    console.error(
      "Schedule appointment error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not schedule appointment.",
      error: error.message,
    });
  }
};
module.exports = {
  applyStaff,
  loginStaff,
    scheduleAppointment,
};
