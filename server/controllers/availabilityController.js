const pool = require("../config/db");
const { getDhakaNow, getDhakaDateString, formatPgDate, computeDisplayStatus } = require("../utils/time");

const getAvailableDoctors = async (req, res) => {
  try {
    const { search, department_id } = req.query;
    const now = getDhakaNow();
    const todayStr = getDhakaDateString(now);

    let query = `
      SELECT
        d.doctor_id,
        d.full_name,
        d.qualification,
        d.specification,
        d.department_id,
        dep.department_name,
        d.profile_photo,
        s.schedule_id,
        s.available_date,
        s.start_time,
        s.end_time,
        h.hospital_id,
        h.hospital_name,
        h.city,
        h.address,
        ds.status AS stored_status
      FROM doctor d
      LEFT JOIN department dep ON dep.department_id = d.department_id
      JOIN doctor_schedule ds ON ds.doctor_id = d.doctor_id
      JOIN schedule s ON s.schedule_id = ds.schedule_id
      LEFT JOIN hospital h ON h.hospital_id = s.hospital_id
      WHERE d.approval_status='approved'
        AND (d.suspended_until IS NULL OR d.suspended_until <= CURRENT_TIMESTAMP)
    `;
    const values = [];
    let idx = 1;

    if (department_id) {
      query += ` AND d.department_id = $${idx}`;
      values.push(department_id);
      idx++;
    }
    if (search) {
      query += ` AND LOWER(d.full_name) LIKE LOWER($${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY d.full_name ASC, s.available_date ASC, s.start_time ASC`;

    const result = await pool.query(query, values);

    // Group by doctor, keep all schedules but compute status per schedule (Available/Upcoming/Schedule ended)
    const doctorsMap = new Map();
    for (const row of result.rows) {
      const dateStr = formatPgDate(row.available_date);
      const displayStatus = computeDisplayStatus(dateStr, row.start_time, row.end_time, now);
      const isToday = dateStr === todayStr;

      if (!doctorsMap.has(row.doctor_id)) {
        doctorsMap.set(row.doctor_id, {
          doctor_id: row.doctor_id,
          full_name: row.full_name,
          qualification: row.qualification,
          specification: row.specification,
          department_id: row.department_id,
          department_name: row.department_name,
          profile_photo: row.profile_photo,
          schedules: [],
        });
      }
      doctorsMap.get(row.doctor_id).schedules.push({
        schedule_id: row.schedule_id,
        available_date: dateStr || row.available_date,
        start_time: row.start_time,
        end_time: row.end_time,
        hospital_id: row.hospital_id,
        hospital_name: row.hospital_name,
        city: row.city,
        address: row.address,
        status: displayStatus,
        display_status: displayStatus,
        is_today: isToday,
      });
    }

    // Do not inject synthetic UNAVAILABLE — real schedules drive status (Available/Upcoming/Schedule ended)
    // Doctors without schedules will be handled in extraQuery below

    const doctors = Array.from(doctorsMap.values());

    // Include doctors without schedules only for those not already in map
    // Do not run extra query if we already have all matching doctors with schedules
    {
      let extraQuery = `SELECT d.doctor_id, d.full_name, d.qualification, d.specification, d.department_id, dep.department_name, d.profile_photo
                        FROM doctor d LEFT JOIN department dep ON dep.department_id=d.department_id
                        WHERE d.approval_status='approved' AND (d.suspended_until IS NULL OR d.suspended_until <= CURRENT_TIMESTAMP)`;
      const vals2 = [];
      let i2 = 1;
      if (department_id) { extraQuery += ` AND d.department_id=$${i2}`; vals2.push(department_id); i2++; }
      if (search) { extraQuery += ` AND LOWER(d.full_name) LIKE LOWER($${i2})`; vals2.push(`%${search}%`); i2++; }
      extraQuery += ` ORDER BY d.full_name ASC`;
      const extra = await pool.query(extraQuery, vals2);
      for (const doc of extra.rows) {
        if (!doctorsMap.has(doc.doctor_id)) {
          doctors.push({
            doctor_id: doc.doctor_id,
            full_name: doc.full_name,
            qualification: doc.qualification,
            specification: doc.specification,
            department_id: doc.department_id,
            department_name: doc.department_name,
            profile_photo: doc.profile_photo,
            schedules: [],
            no_schedule: true,
          });
        }
      }
      doctors.sort((a,b)=>a.full_name.localeCompare(b.full_name));
    }

    return res.status(200).json({ doctors, today: todayStr });
  } catch (error) {
    console.error("getAvailableDoctors error:", error);
    return res.status(500).json({ message: "Could not fetch available doctors.", error: error.message });
  }
};

module.exports = { getAvailableDoctors };
