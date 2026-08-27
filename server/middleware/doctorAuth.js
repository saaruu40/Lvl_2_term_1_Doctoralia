const pool = require("../config/db");

const doctorAuth = async (req, res, next) => {
  try {
    const doctorId =
      req.headers["x-doctor-id"] ||
      req.body.doctor_id ||
      req.query.doctor_id ||
      req.params.doctorId;

    if (!doctorId) {
      return res.status(401).json({ message: "Doctor authentication required. Missing doctor_id." });
    }

    const result = await pool.query(
      `SELECT doctor_id, full_name, email, approval_status, suspended_until, department_id
       FROM doctor WHERE doctor_id = $1`,
      [doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid doctor." });
    }

    const doctor = result.rows[0];

    if (doctor.approval_status !== "approved") {
      return res.status(403).json({ message: "Doctor not approved." });
    }

    if (doctor.suspended_until && new Date(doctor.suspended_until) > new Date()) {
      return res.status(403).json({
        message: "Doctor account is temporarily suspended.",
        suspended_until: doctor.suspended_until,
      });
    }

    if (doctor.suspended_until && new Date(doctor.suspended_until) <= new Date()) {
      await pool.query(`UPDATE doctor SET suspended_until=NULL WHERE doctor_id=$1`, [doctor.doctor_id]);
      doctor.suspended_until = null;
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    console.error("doctorAuth error:", error);
    return res.status(500).json({ message: "Authentication failed.", error: error.message });
  }
};

module.exports = doctorAuth;
