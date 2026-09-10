const pool = require("../config/db");

// Cleanup expired suspensions: clear suspended_until where <= NOW()
const cleanupExpiredSuspensions = async () => {
  await pool.query(`UPDATE staff SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
  await pool.query(`UPDATE doctor SET suspended_until = NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()`);
};

// Cleanup expired temporary assignments: mark ENDED where end_date <= NOW()
const cleanupExpiredAssignments = async () => {
  await pool.query(`UPDATE staff_assignment SET status='ENDED' WHERE status='ACTIVE' AND end_date IS NOT NULL AND end_date <= NOW()`);
};

// For a given staff, return active assignments (after cleanup)
const getActiveAssignmentsForStaff = async (staffId) => {
  await cleanupExpiredAssignments();
  const result = await pool.query(
    `SELECT assignment_id, staff_id, doctor_id, assignment_type, start_date, end_date, status
     FROM staff_assignment WHERE staff_id=$1 AND status='ACTIVE' AND (end_date IS NULL OR end_date > NOW())`,
    [staffId]
  );
  return result.rows;
};

// Check if staff is available: approved, not suspended, no active assignment (primary or temporary)
const isStaffAvailable = async (staff) => {
  if (staff.approval_status !== 'approved') return false;
  if (staff.suspended_until && new Date(staff.suspended_until) > new Date()) return false;
  const active = await getActiveAssignmentsForStaff(staff.staff_id);
  if (active.length > 0) return false;
  return true;
};

// Get available staff list (backend filtering per Req 4)
const getAvailableStaffList = async () => {
  await cleanupExpiredSuspensions();
  await cleanupExpiredAssignments();
  const result = await pool.query(`
    SELECT s.staff_id, s.email, s.phone_number, s.gender, s.profile_pic, s.approval_status, s.suspended_until
    FROM staff s
    WHERE s.approval_status='approved'
      AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
      AND NOT EXISTS (
        SELECT 1 FROM staff_assignment sa
        WHERE sa.staff_id = s.staff_id AND sa.status='ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
      )
    ORDER BY s.staff_id ASC
  `);
  return result.rows;
};

// Verify staff can manage appointments for a given doctor_id
// Returns {ok:true, assignment} or {ok:false, status, message}
const verifyStaffCanManageDoctor = async (staffId, doctorId) => {
  await cleanupExpiredSuspensions();
  await cleanupExpiredAssignments();
  // Check staff exists and approved/not suspended
  const staffRes = await pool.query(`SELECT staff_id, approval_status, suspended_until FROM staff WHERE staff_id=$1`, [staffId]);
  if (staffRes.rows.length === 0) return { ok: false, status: 404, message: "Staff account not found." };
  const staff = staffRes.rows[0];
  if (staff.approval_status !== 'approved') return { ok: false, status: 403, message: "Your staff account is not approved." };
  if (staff.suspended_until && new Date(staff.suspended_until) > new Date()) {
    return { ok: false, status: 403, message: "Your account is temporarily suspended. You cannot use Doctoralia until the suspension period ends.", suspended_until: staff.suspended_until };
  }
  // Check active assignment to doctor
  const assignRes = await pool.query(
    `SELECT assignment_id, assignment_type, start_date, end_date, status, doctor_id
     FROM staff_assignment
     WHERE staff_id=$1 AND doctor_id=$2 AND status='ACTIVE' AND (end_date IS NULL OR end_date > NOW()) LIMIT 1`,
    [staffId, doctorId]
  );
  if (assignRes.rows.length === 0) {
    return { ok: false, status: 403, message: "You are not authorized to manage this doctor's appointments." };
  }
  return { ok: true, staff, assignment: assignRes.rows[0] };
};

module.exports = {
  cleanupExpiredSuspensions,
  cleanupExpiredAssignments,
  getActiveAssignmentsForStaff,
  getAvailableStaffList,
  verifyStaffCanManageDoctor,
  isStaffAvailable,
};
