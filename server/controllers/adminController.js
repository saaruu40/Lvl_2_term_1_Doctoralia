const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");


// =====================================================
// ADMIN REGISTRATION
// =====================================================

const registerAdmin = async (req, res) => {
  try {
    // SINGLETON GUARD: only one admin allowed (sara)
    const adminCount = await pool.query(`SELECT COUNT(*) FROM admin`);
    if (Number(adminCount.rows[0].count) >= 1) {
      return res.status(403).json({
        message: "Admin registration is disabled. Only one admin (sara) is allowed.",
        closed: true,
      });
    }

    const {
      full_name,
      email,
      password,
      phone_number,
    } = req.body;

    if (!full_name || !email || !password || !phone_number) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

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

    const hashedPassword = await bcrypt.hash(password, 10);

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


// =====================================================
// ADMIN LOGIN
// =====================================================

const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = String(email || "").trim().toLowerCase();
    // alias: bare 'sara' -> 'sara@gmail.com' for backward compat
    if (email === "sara") email = "sara@gmail.com";

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM admin
       WHERE LOWER(email) = LOWER($1)`,
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
    const token = jwt.sign(
  {
    admin_id: admin.admin_id,
    role: "admin",
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "1d",
  }
);

    return res.status(200).json({
      message: "Admin login successful.",
      token:token,
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


// =====================================================
// ADMIN PROFILE
// =====================================================

const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.params.id;

    const result = await pool.query(
      `SELECT
        admin_id,
        full_name,
        email,
        phone_number
       FROM admin
       WHERE admin_id = $1`,
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Admin not found.",
      });
    }

    return res.status(200).json({
      admin: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not fetch admin profile.",
      error: error.message,
    });
  }
};


// =====================================================
// PUBLIC CONTACT — only email, for Home emergency section
// =====================================================

const getAdminPublicContact = async (req, res) => {
  try {
    const result = await pool.query(`SELECT email FROM admin ORDER BY admin_id ASC LIMIT 1`);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Admin contact not found." });
    }
    return res.status(200).json({ email: result.rows[0].email });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch admin contact.", error: error.message });
  }
};


// =====================================================
// DASHBOARD STATISTICS
// =====================================================

const getDashboardStats = async (req, res) => {
  try {
    const doctorPending = await pool.query(
      `SELECT COUNT(*)
       FROM doctor
       WHERE approval_status = 'pending'`
    );

    const staffPending = await pool.query(
      `SELECT COUNT(*)
       FROM staff
       WHERE approval_status = 'pending'`
    );

    const approvedDoctors = await pool.query(
      `SELECT COUNT(*)
       FROM doctor
       WHERE approval_status = 'approved'`
    );

    const departments = await pool.query(
      `SELECT COUNT(*)
       FROM department`
    );

    return res.status(200).json({
      pendingDoctors: Number(doctorPending.rows[0].count),
      pendingStaff: Number(staffPending.rows[0].count),
      approvedDoctors: Number(approvedDoctors.rows[0].count),
      departments: Number(departments.rows[0].count),
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not load dashboard statistics.",
      error: error.message,
    });
  }
};


// =====================================================
// PENDING DOCTORS
// =====================================================

const getPendingDoctors = async (req, res) => {
  try {
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
        d.department_id,
        dep.department_name
       FROM doctor d
       LEFT JOIN department dep
         ON d.department_id = dep.department_id
       WHERE d.approval_status = 'pending'
       ORDER BY d.doctor_id DESC`
    );

    return res.status(200).json({
      doctors: result.rows,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not fetch pending doctors.",
      error: error.message,
    });
  }
};


// =====================================================
// APPROVE DOCTOR
// =====================================================

const approveDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    //const { admin_id } = req.body;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "Admin ID is required.",
    //   });
    // }
    const admin_id = req.user.admin_id;

    const result = await pool.query(
      `UPDATE doctor
       SET
         approval_status = 'approved',
         approved_by = $1
       WHERE doctor_id = $2
         AND approval_status = 'pending'
       RETURNING
         doctor_id,
         full_name,
         email,
         approval_status,
         approved_by`,
      [admin_id, doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending doctor application not found.",
      });
    }
    await pool.query(
  "CALL create_doctor_welcome_notification($1)",
  [doctorId]
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


// =====================================================
// REJECT DOCTOR
// =====================================================

const rejectDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    // const { admin_id } = req.body;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "Admin ID is required.",
    //   });
    // }
    const admin_id = req.user.admin_id;

    const result = await pool.query(
      `UPDATE doctor
       SET
         approval_status = 'rejected',
         approved_by = $1
       WHERE doctor_id = $2
         AND approval_status = 'pending'
       RETURNING
         doctor_id,
         full_name,
         email,
         approval_status,
         approved_by`,
      [admin_id, doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending doctor application not found.",
      });
    }

    return res.status(200).json({
      message: "Doctor application rejected.",
      doctor: result.rows[0],
    });

  } catch (error) {
    console.error("Doctor rejection error:", error);

    return res.status(500).json({
      message: "Doctor rejection failed.",
      error: error.message,
    });
  }
};


// =====================================================
// PENDING STAFF
// =====================================================

const getPendingStaff = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        staff_id,
        email,
        phone_number,
        gender,
        profile_pic,
        approval_status
       FROM staff
       WHERE approval_status = 'pending'
       ORDER BY staff_id DESC`
    );

    return res.status(200).json({
      staff: result.rows,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not fetch pending staff.",
      error: error.message,
    });
  }
};


// =====================================================
// APPROVE STAFF
// =====================================================

const approveStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    //const { admin_id } = req.body;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "Admin ID is required.",
    //   });
    // }
    const admin_id = req.user.admin_id;

    const result = await pool.query(
      `UPDATE staff
       SET
         approval_status = 'approved',
         admin_id = $1
       WHERE staff_id = $2
         AND approval_status = 'pending'
       RETURNING
         staff_id,
         email,
         approval_status,
         admin_id`,
      [admin_id, staffId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending staff application not found.",
      });
    }
await pool.query(
  "CALL create_staff_welcome_notification($1)",
  [staffId]
);
    return res.status(200).json({
      message: "Staff approved successfully.",
      staff: result.rows[0],
    });

  } catch (error) {
    console.error("Staff approval error:", error);

    return res.status(500).json({
      message: "Staff approval failed.",
      error: error.message,
    });
  }
};


// =====================================================
// REJECT STAFF
// =====================================================

const rejectStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    // const { admin_id } = req.body;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "Admin ID is required.",
    //   });
    // }
  const admin_id = req.user.admin_id;
    const result = await pool.query(
      `UPDATE staff
       SET
         approval_status = 'rejected',
         admin_id = $1
       WHERE staff_id = $2
         AND approval_status = 'pending'
       RETURNING
         staff_id,
         email,
         approval_status,
         admin_id`,
      [admin_id, staffId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending staff application not found.",
      });
    }

    return res.status(200).json({
      message: "Staff application rejected.",
      staff: result.rows[0],
    });

  } catch (error) {
    console.error("Staff rejection error:", error);

    return res.status(500).json({
      message: "Staff rejection failed.",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN DOCTOR DECISION HISTORY
// =====================================================

const getDoctorHistory = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const result = await pool.query(
      `SELECT
        d.doctor_id,
        d.full_name,
        d.email,
        d.specification,
        d.approval_status,
        dep.department_name
       FROM doctor d
       LEFT JOIN department dep
         ON d.department_id = dep.department_id
       WHERE d.approved_by = $1
         AND d.approval_status IN ('approved', 'rejected')
       ORDER BY d.doctor_id DESC`,
      [adminId]
    );

    return res.status(200).json({
      doctors: result.rows,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not fetch doctor history.",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN STAFF DECISION HISTORY
// =====================================================

const getStaffHistory = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const result = await pool.query(
      `SELECT
        staff_id,
        email,
        phone_number,
        gender,
        approval_status
       FROM staff
       WHERE admin_id = $1
         AND approval_status IN ('approved', 'rejected')
       ORDER BY staff_id DESC`,
      [adminId]
    );

    return res.status(200).json({
      staff: result.rows,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not fetch staff history.",
      error: error.message,
    });
  }
};


// =====================================================
// GET DEPARTMENTS
// =====================================================

const getDepartments = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT department_id, department_name, description,status FROM department`;
    const values = [];
    if (search && search.trim()) {
      query += ` WHERE LOWER(department_name) LIKE LOWER($1)`;
      values.push(`%${search.trim()}%`);
    }
    query += ` ORDER BY department_id`;
    const result = await pool.query(query, values);

    return res.status(200).json({
      departments: result.rows,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not fetch departments.",
      error: error.message,
    });
  }
};


// =====================================================
// ADD DEPARTMENT
// =====================================================

const addDepartment = async (req, res) => {
  try {
    const {
      department_name,
      description,
    } = req.body;

    if (!department_name) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    const dup = await pool.query(
      `SELECT department_id FROM department WHERE LOWER(department_name) = LOWER($1)`,
      [department_name.trim()]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: "Department already exists." });
    }

    const result = await pool.query(
      `INSERT INTO department (
        department_name,
        description
       )
       VALUES ($1, $2)
       RETURNING *`,
      [
        department_name.trim(),
        description || null,
      ]
    );

    return res.status(201).json({
      message: "Department added successfully.",
      department: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not add department.",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE DEPARTMENT
// =====================================================

const updateDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;

    const {
      department_name,
      description,
    } = req.body;

    if (!department_name) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    const dup = await pool.query(
      `SELECT department_id FROM department WHERE LOWER(department_name) = LOWER($1) AND department_id <> $2`,
      [department_name.trim(), departmentId]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: "Department already exists." });
    }

    const result = await pool.query(
      `UPDATE department
       SET
         department_name = $1,
         description = $2
       WHERE department_id = $3
       RETURNING *`,
      [
        department_name.trim(),
        description || null,
        departmentId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      message: "Department updated successfully.",
      department: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Could not update department.",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE DEPARTMENT
// =====================================================

// const deleteDepartment = async (req, res) => {
//   try {
//     const departmentId = req.params.id;

//     const doctorCheck = await pool.query(
//       `SELECT COUNT(*)
//        FROM doctor
//        WHERE department_id = $1`,
//       [departmentId]
//     );

//     if (Number(doctorCheck.rows[0].count) > 0) {
//       return res.status(409).json({
//         message:
//           "This department cannot be deleted because doctors are assigned to it.",
//       });
//     }

//     const result = await pool.query(
//       `DELETE FROM department
//        WHERE department_id = $1
//        RETURNING department_id`,
//       [departmentId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         message: "Department not found.",
//       });
//     }

//     return res.status(200).json({
//       message: "Department deleted successfully.",
//     });

//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       message: "Could not delete department.",
//       error: error.message,
//     });
//   }
// };

const disableDepartment = async (req, res) => {
  try {

    const departmentId = req.params.id;

    const result = await pool.query(
      `
      UPDATE department
      SET status = 'inactive'
      WHERE department_id = $1
      RETURNING department_id
      `,
      [departmentId]
    );


    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }


    return res.status(200).json({
      message: "Department disabled successfully.",
    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: "Could not disable department.",
      error: error.message,
    });

  }
};
const enableDepartment = async (req, res) => {
  try {

    const departmentId = req.params.id;


    const result = await pool.query(
      `
      UPDATE department
      SET status = 'active'
      WHERE department_id = $1
      RETURNING department_id
      `,
      [departmentId]
    );


    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }


    return res.status(200).json({
      message: "Department enabled successfully.",
    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: "Could not enable department.",
      error: error.message,
    });

  }
};
// =====================================================
// GET ALL COMPLAINTS
// =====================================================

const getComplaints = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.complaint_id,

        c.filed_by_patient_id,
        filed_patient.full_name AS filed_by_patient_name,

        c.filed_by_doctor_id,
        filed_doctor.full_name AS filed_by_doctor_name,

        c.filed_by_staff_id,
        filed_staff.email AS filed_by_staff_email,

        c.against_patient_id,
        against_patient.full_name AS against_patient_name,

        c.against_doctor_id,
        against_doctor.full_name AS against_doctor_name,

        c.against_staff_id,
        against_staff.email AS against_staff_email,

        c.appointment_id,
        c.complaint_type,
        c.description,
        c.complaint_date,
        c.complaint_status,
        c.reviewed_by,
        admin_user.full_name AS reviewed_by_name,
        c.admin_action

       FROM complaint c

       LEFT JOIN patient filed_patient
         ON c.filed_by_patient_id = filed_patient.patient_id

       LEFT JOIN doctor filed_doctor
         ON c.filed_by_doctor_id = filed_doctor.doctor_id

       LEFT JOIN staff filed_staff
         ON c.filed_by_staff_id = filed_staff.staff_id

       LEFT JOIN patient against_patient
         ON c.against_patient_id = against_patient.patient_id

       LEFT JOIN doctor against_doctor
         ON c.against_doctor_id = against_doctor.doctor_id

       LEFT JOIN staff against_staff
         ON c.against_staff_id = against_staff.staff_id

       LEFT JOIN admin admin_user
         ON c.reviewed_by = admin_user.admin_id

       ORDER BY
         CASE
           WHEN c.complaint_status = 'pending'
           THEN 0
           ELSE 1
         END,
         c.complaint_id DESC`
    );

    return res.status(200).json({
      complaints: result.rows,
    });

  } catch (error) {
    console.error("Get complaints error:", error);

    return res.status(500).json({
      message: "Could not fetch complaints.",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE COMPLAINT
// =====================================================

const createComplaint = async (req, res) => {
  try {
    const {
      filed_by_patient_id,
      filed_by_doctor_id,
      filed_by_staff_id,

      against_patient_id,
      against_doctor_id,
      against_staff_id,

      appointment_id,
      complaint_type,
      description,
    } = req.body;

    if (!complaint_type || !description) {
      return res.status(400).json({
        message: "Complaint type and description are required.",
      });
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
        $7, $8, $9,
        'pending'
      )
      RETURNING *`,
      [
        filed_by_patient_id || null,
        filed_by_doctor_id || null,
        filed_by_staff_id || null,

        against_patient_id || null,
        against_doctor_id || null,
        against_staff_id || null,

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


// =====================================================
// SUSPEND USER FROM COMPLAINT FOR 5 DAYS
// =====================================================

const suspendFromComplaint = async (req, res) => {
  const client = await pool.connect();

  try {
    const complaintId = req.params.id;
    // const { admin_id } = req.body;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "Admin ID is required.",
    //   });
    // }
    const admin_id = req.user.admin_id;

    await client.query("BEGIN");

    const complaintResult = await client.query(
      `SELECT *
       FROM complaint
       WHERE complaint_id = $1
       FOR UPDATE`,
      [complaintId]
    );

    if (complaintResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Complaint not found.",
      });
    }

    const complaint = complaintResult.rows[0];

    if (complaint.complaint_status !== "pending") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This complaint has already been reviewed.",
      });
    }

    if (complaint.against_doctor_id) {
      await client.query(
        `UPDATE doctor
         SET suspended_until =
           CURRENT_TIMESTAMP + INTERVAL '5 days'
         WHERE doctor_id = $1`,
        [complaint.against_doctor_id]
      );

    } else if (complaint.against_staff_id) {
      await client.query(
        `UPDATE staff
         SET suspended_until =
           CURRENT_TIMESTAMP + INTERVAL '5 days'
         WHERE staff_id = $1`,
        [complaint.against_staff_id]
      );

    } else if (complaint.against_patient_id) {
      await client.query(
        `UPDATE patient
         SET suspended_until =
           CURRENT_TIMESTAMP + INTERVAL '5 days'
         WHERE patient_id = $1`,
        [complaint.against_patient_id]
      );

    } else {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "No accused user found for this complaint.",
      });
    }

    const updatedComplaint = await client.query(
      `UPDATE complaint
       SET
         reviewed_by = $1,
         complaint_status = 'resolved',
         admin_action = 'suspended_5_days'
       WHERE complaint_id = $2
       RETURNING *`,
      [
        admin_id,
        complaintId,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message:
        "Complaint reviewed. User suspended for 5 days.",
      complaint: updatedComplaint.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Complaint suspension error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not suspend user.",
      error: error.message,
    });

  } finally {
    client.release();
  }
};

// =====================================================
// DISMISS COMPLAINT
// =====================================================

const dismissComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    // const { admin_id } = req.body;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "Admin ID is required.",
    //   });
    // }
    const admin_id = req.user.admin_id;

    const result = await pool.query(
      `UPDATE complaint
       SET
         reviewed_by = $1,
         complaint_status = 'resolved',
         admin_action = 'dismissed'
       WHERE complaint_id = $2
         AND complaint_status = 'pending'
       RETURNING *`,
      [
        admin_id,
        complaintId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Pending complaint not found.",
      });
    }

    return res.status(200).json({
      message:
        "Complaint dismissed successfully.",
      complaint: result.rows[0],
    });

  } catch (error) {
    console.error(
      "Dismiss complaint error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not dismiss complaint.",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN REGISTRATION STATUS (singleton check for UI)
// =====================================================

const getAdminRegistrationStatus = async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM admin`);
    const count = Number(result.rows[0].count);
    const closed = count >= 1;
    return res.status(200).json({
      closed,
      count,
      message: closed
        ? "Admin registration is disabled. Only one admin (sara) is allowed."
        : "Admin registration is open.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch admin status.", error: error.message });
  }
};

// =====================================================
// APPROVED STAFF (with assignment info)
// =====================================================
const getApprovedStaff = async (req, res) => {
  try {
    await pool.query(`UPDATE staff SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
    await pool.query(`UPDATE staff_assignment SET status='ENDED' WHERE status='ACTIVE' AND end_date IS NOT NULL AND end_date <= NOW()`);
    const result = await pool.query(
      `SELECT s.staff_id, s.email, s.phone_number, s.gender, s.profile_pic, s.approval_status, s.suspended_until,
              sa.assignment_id, sa.doctor_id, sa.assignment_type, sa.status as assignment_status,
              d.full_name as assigned_doctor_name
       FROM staff s
       LEFT JOIN staff_assignment sa ON sa.staff_id=s.staff_id AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
       LEFT JOIN doctor d ON d.doctor_id=sa.doctor_id
       WHERE s.approval_status='approved'
       ORDER BY s.staff_id DESC`
    );
    // derive available flag
    const enriched = result.rows.map(r => ({
      ...r,
      is_assigned: !!r.assignment_id,
      is_suspended: r.suspended_until && new Date(r.suspended_until) > new Date(),
      is_available: !r.assignment_id && (!r.suspended_until || new Date(r.suspended_until) <= new Date()),
    }));
    return res.status(200).json({ staff: enriched });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch approved staff.", error: error.message });
  }
};

// =====================================================
// SUSPENDED STAFF
// =====================================================
const getSuspendedStaff = async (req, res) => {
  try {
    await pool.query(`UPDATE staff SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
    const result = await pool.query(
      `SELECT staff_id, email, phone_number, gender, profile_pic, approval_status, suspended_until
       FROM staff
       WHERE suspended_until IS NOT NULL AND suspended_until > NOW()
       ORDER BY suspended_until DESC`
    );
    return res.status(200).json({ staff: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch suspended staff.", error: error.message });
  }
};

// =====================================================
// AVAILABLE STAFF (approved, not suspended, not assigned, not temporary active)
// =====================================================
const getAvailableStaffAdmin = async (req, res) => {
  try {
    await pool.query(`UPDATE staff SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
    await pool.query(`UPDATE staff_assignment SET status='ENDED' WHERE status='ACTIVE' AND end_date IS NOT NULL AND end_date <= NOW()`);
    const result = await pool.query(
      `SELECT s.staff_id, s.email, s.phone_number, s.gender, s.profile_pic, s.approval_status, s.suspended_until
       FROM staff s
       WHERE s.approval_status='approved'
         AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
         AND NOT EXISTS (
           SELECT 1 FROM staff_assignment sa WHERE sa.staff_id=s.staff_id AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
         )
       ORDER BY s.staff_id ASC`
    );
    return res.status(200).json({ staff: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch available staff.", error: error.message });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminRegistrationStatus,

  getAdminProfile,
  getAdminPublicContact,
  getDashboardStats,

  getPendingDoctors,
  approveDoctor,
  rejectDoctor,

  getPendingStaff,
  approveStaff,
  rejectStaff,
  getApprovedStaff,
  getSuspendedStaff,
  getAvailableStaffAdmin,

  getDoctorHistory,
  getStaffHistory,

  getDepartments,
  addDepartment,
  updateDepartment,
  disableDepartment,
 enableDepartment,


  getComplaints,
  createComplaint,
  suspendFromComplaint,
  dismissComplaint,
};