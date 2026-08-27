const pool = require("../config/db");
const {
  getDhakaNow,
  getDhakaDateString,
  getDhakaTimeMinutes,
  parseTimeToMinutes,
  formatPgDate,
  isInsideFixingWindow,
  computeAvailabilityStatus,
  computeDisplayStatus,
} = require("../utils/time");

const validateScheduleInput = (body) => {
  const { available_date, start_time, end_time, hospital_id } = body;
  if (!available_date) return "available_date is required (YYYY-MM-DD).";
  if (!start_time) return "start_time is required (HH:MM).";
  if (!end_time) return "end_time is required (HH:MM).";
  if (!hospital_id) return "hospital is required. Please select a hospital from the list.";
  const s = parseTimeToMinutes(start_time);
  const e = parseTimeToMinutes(end_time);
  if (s === null) return "Invalid start_time.";
  if (e === null) return "Invalid end_time.";
  if (s >= e) return "start_time must be before end_time.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(available_date)) return "available_date must be YYYY-MM-DD.";
  return null;
};

const createSchedule = async (req, res) => {
  const doctorId = req.doctor.doctor_id;
  const { available_date, start_time, end_time, hospital_id } = req.body;

  const err = validateScheduleInput(req.body);
  if (err) return res.status(400).json({ message: err });

  const now = getDhakaNow();
  if (!isInsideFixingWindow(available_date, now)) {
    return res.status(403).json({ message: "Schedule fixing time is over." });
  }
  const todayStr = getDhakaDateString(now);
  if (available_date < todayStr) {
    return res.status(400).json({ message: "Selected date has already passed." });
  }
  if (available_date === todayStr) {
    const endM = parseTimeToMinutes(end_time);
    const nowM = getDhakaTimeMinutes(now);
    if (endM !== null && endM <= nowM) {
      return res.status(400).json({ message: "Selected time has already passed." });
    }
  }

  try {
    const hospCheck = await pool.query(`SELECT hospital_id FROM hospital WHERE hospital_id=$1`, [hospital_id]);
    if (hospCheck.rows.length === 0) return res.status(404).json({ message: "Hospital not found. Please select from existing hospitals." });

    const overlap = await pool.query(
      `SELECT s.schedule_id FROM schedule s
       JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       WHERE ds.doctor_id=$1 AND s.available_date=$2 AND NOT (s.end_time <= $3 OR s.start_time >= $4)`,
      [doctorId, available_date, start_time, end_time]
    );
    if (overlap.rows.length > 0) return res.status(409).json({ message: "Conflicting schedule for this date/time." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const scheduleResult = await client.query(
        `INSERT INTO schedule (available_date, start_time, end_time, hospital_id)
         VALUES ($1,$2,$3,$4) RETURNING schedule_id, available_date, start_time, end_time, hospital_id`,
        [available_date, start_time, end_time, Number(hospital_id)]
      );
      const schedule = scheduleResult.rows[0];
      const status = computeAvailabilityStatus(available_date, start_time, end_time, now);
      await client.query(
        `INSERT INTO doctor_schedule (doctor_id, schedule_id, status) VALUES ($1,$2,$3)`,
        [doctorId, schedule.schedule_id, status]
      );
      await client.query("COMMIT");
      return res.status(201).json({
        message: "Schedule fixed successfully.",
        schedule: {
          ...schedule,
          available_date: formatPgDate(schedule.available_date) || schedule.available_date,
          status,
        },
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("createSchedule error:", error);
    return res.status(500).json({ message: "Could not create schedule.", error: error.message });
  }
};

const getMySchedules = async (req, res) => {
  const doctorId = req.doctor.doctor_id;
  try {
    const result = await pool.query(
      `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id,
              h.hospital_name, h.city, h.address,
              ds.status
       FROM schedule s
       JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       LEFT JOIN hospital h ON h.hospital_id=s.hospital_id
       WHERE ds.doctor_id=$1
       ORDER BY s.available_date ASC, s.start_time ASC`,
      [doctorId]
    );
    const now = getDhakaNow();
    const rows = result.rows.map((r) => {
      const dateStr = formatPgDate(r.available_date);
      return {
        ...r,
        available_date: dateStr || r.available_date,
        computed_status: computeAvailabilityStatus(dateStr, r.start_time, r.end_time, now),
        display_status: computeDisplayStatus(dateStr, r.start_time, r.end_time, now),
      };
    });
    return res.status(200).json({ schedules: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not fetch schedules.", error: error.message });
  }
};

const getMyScheduleById = async (req, res) => {
  const doctorId = req.doctor.doctor_id;
  const sid = req.params.id;
  try {
    const result = await pool.query(
      `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id,
              h.hospital_name, h.city, h.address, ds.status
       FROM schedule s
       JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       LEFT JOIN hospital h ON h.hospital_id=s.hospital_id
       WHERE ds.doctor_id=$1 AND s.schedule_id=$2`,
      [doctorId, sid]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Schedule not found or not owned by you." });
    const r = result.rows[0];
    const now = getDhakaNow();
    const dateStr = formatPgDate(r.available_date);
    r.available_date = dateStr || r.available_date;
    r.computed_status = computeAvailabilityStatus(dateStr, r.start_time, r.end_time, now);
    r.display_status = computeDisplayStatus(dateStr, r.start_time, r.end_time, now);
    return res.status(200).json({ schedule: r });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch schedule.", error: error.message });
  }
};

const updateMySchedule = async (req, res) => {
  const doctorId = req.doctor.doctor_id;
  const sid = req.params.id;
  const { available_date, start_time, end_time, hospital_id } = req.body;
  const err = validateScheduleInput(req.body);
  if (err) return res.status(400).json({ message: err });
  const now = getDhakaNow();
  if (!isInsideFixingWindow(available_date, now)) {
    return res.status(403).json({ message: "Schedule fixing time is over." });
  }
  const todayStr = getDhakaDateString(now);
  if (available_date < todayStr) {
    return res.status(400).json({ message: "Selected date has already passed." });
  }
  if (available_date === todayStr) {
    const endM = parseTimeToMinutes(end_time);
    const nowM = getDhakaTimeMinutes(now);
    if (endM !== null && endM <= nowM) {
      return res.status(400).json({ message: "Selected time has already passed." });
    }
  }
  try {
    const own = await pool.query(
      `SELECT s.schedule_id FROM schedule s JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       WHERE ds.doctor_id=$1 AND s.schedule_id=$2`,
      [doctorId, sid]
    );
    if (own.rows.length === 0) return res.status(404).json({ message: "Schedule not found or not owned by you." });

    const hospCheck = await pool.query(`SELECT hospital_id FROM hospital WHERE hospital_id=$1`, [hospital_id]);
    if (hospCheck.rows.length === 0) return res.status(404).json({ message: "Hospital not found. Please select from existing hospitals." });

    const overlap = await pool.query(
      `SELECT s.schedule_id FROM schedule s JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       WHERE ds.doctor_id=$1 AND s.available_date=$2 AND s.schedule_id<>$5 AND NOT (s.end_time <= $3 OR s.start_time >= $4)`,
      [doctorId, available_date, start_time, end_time, sid]
    );
    if (overlap.rows.length > 0) return res.status(409).json({ message: "Conflicting schedule for this date/time." });

    const status = computeAvailabilityStatus(available_date, start_time, end_time, now);
    await pool.query(`UPDATE schedule SET available_date=$1, start_time=$2, end_time=$3, hospital_id=$4 WHERE schedule_id=$5`, [
      available_date,
      start_time,
      end_time,
      Number(hospital_id),
      sid,
    ]);
    await pool.query(`UPDATE doctor_schedule SET status=$1 WHERE doctor_id=$2 AND schedule_id=$3`, [status, doctorId, sid]);
    const result = await pool.query(
      `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, h.hospital_name, ds.status
       FROM schedule s JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id LEFT JOIN hospital h ON h.hospital_id=s.hospital_id
       WHERE s.schedule_id=$1`,
      [sid]
    );
    return res.status(200).json({
      message: "Schedule fixed successfully.",
      schedule: result.rows[0]
        ? {
            ...result.rows[0],
            available_date: formatPgDate(result.rows[0].available_date) || result.rows[0].available_date,
          }
        : result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update schedule.", error: error.message });
  }
};

const deleteMySchedule = async (req, res) => {
  const doctorId = req.doctor.doctor_id;
  const sid = req.params.id;
  try {
    const own = await pool.query(
      `SELECT s.available_date FROM schedule s JOIN doctor_schedule ds ON ds.schedule_id=s.schedule_id
       WHERE ds.doctor_id=$1 AND s.schedule_id=$2`,
      [doctorId, sid]
    );
    if (own.rows.length === 0) return res.status(404).json({ message: "Schedule not found or not owned by you." });

    const available_date = formatPgDate(own.rows[0].available_date);
    const now = getDhakaNow();
    if (!isInsideFixingWindow(available_date, now)) {
      return res.status(403).json({ message: "Schedule fixing time is over." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM doctor_schedule WHERE doctor_id=$1 AND schedule_id=$2`, [doctorId, sid]);
      const remaining = await client.query(`SELECT COUNT(*) FROM doctor_schedule WHERE schedule_id=$1`, [sid]);
      if (Number(remaining.rows[0].count) === 0) {
        await client.query(`DELETE FROM appointment WHERE schedule_id=$1`, [sid]);
        await client.query(`DELETE FROM schedule WHERE schedule_id=$1`, [sid]);
      }
      await client.query("COMMIT");
      return res.status(200).json({ message: "Schedule removed successfully." });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not delete schedule.", error: error.message });
  }
};

const getHospitals = async (req, res) => {
  try {
    const result = await pool.query(`SELECT hospital_id, hospital_name, city, address, phone_number, description FROM hospital ORDER BY hospital_name ASC`);
    return res.status(200).json({ hospitals: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch hospitals.", error: error.message });
  }
};

module.exports = {
  createSchedule,
  getMySchedules,
  getMyScheduleById,
  updateMySchedule,
  deleteMySchedule,
  getHospitals,
};
