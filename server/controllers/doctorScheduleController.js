const pool = require("../config/db");
const {
  getTargetDateStr,
  getYearEndDateStr,
  getCurrentDateStr,
  getScheduleWindowStatus,
  assertScheduleWindow,
  assertTargetDate,
  assertTargetDateInSameYear,
  isSlotExpired,
} = require("../utils/scheduleWindow");

// reuse getActiveDoctor
const getActiveDoctor = async (doctorId) => {
  const result = await pool.query(
    `SELECT doctor_id, approval_status, suspended_until FROM doctor WHERE doctor_id = $1`,
    [doctorId]
  );
  if (result.rows.length === 0) {
    return { ok: false, status: 404, message: "Doctor account not found." };
  }
  const doctor = result.rows[0];
  if (doctor.approval_status !== "approved") {
    return { ok: false, status: 403, message: "Your doctor account is not approved." };
  }
  if (doctor.suspended_until && new Date(doctor.suspended_until) <= new Date()) {
    await pool.query(`UPDATE doctor SET suspended_until = NULL WHERE doctor_id = $1`, [doctorId]);
    doctor.suspended_until = null;
  }
  if (doctor.suspended_until && new Date(doctor.suspended_until) > new Date()) {
    return { ok: false, status: 403, message: "Your account is temporarily suspended.", suspended_until: doctor.suspended_until };
  }
  return { ok: true, doctor };
};

const sendDoctorAccessError = (res, access) =>
  res.status(access.status).json({ message: access.message, ...(access.suspended_until ? { suspended_until: access.suspended_until } : {}) });

// helper: check overlap for this doctor on date via JOIN doctor_schedule
const hasOverlap = async (doctorId, available_date, start_time, end_time, excludeScheduleId = null) => {
  const result = await pool.query(
    `SELECT s.schedule_id FROM schedule s
     JOIN doctor_schedule ds ON s.schedule_id = ds.schedule_id
     WHERE ds.doctor_id = $1 AND s.available_date = $2
       AND ($5::integer IS NULL OR s.schedule_id != $5)
       AND NOT (s.end_time <= $3::time OR s.start_time >= $4::time)
     LIMIT 1`,
    [doctorId, available_date, start_time, end_time, excludeScheduleId]
  );
  return result.rows.length > 0;
};

const getWindowInfo = async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);
    const status = getScheduleWindowStatus(new Date());
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch window status.", error: error.message });
  }
};

const getHospitals = async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);
    const result = await pool.query(`SELECT hospital_id, hospital_name, city, address FROM hospital ORDER BY hospital_name ASC`);
    return res.status(200).json({ hospitals: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch hospitals.", error: error.message });
  }
};

const getMySchedules = async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    const nowForFilter = new Date();
    const windowForFilter = getScheduleWindowStatus(nowForFilter);
    const yearEnd = getYearEndDateStr(nowForFilter);
    // TEMP TESTING: any schedule from today through Dec 31 of same Dhaka year
    const result = await pool.query(
      `SELECT s.schedule_id, TO_CHAR(s.available_date,'YYYY-MM-DD') AS available_date, s.start_time, s.end_time, s.hospital_id, s.created_at, s.updated_at,
               ds.status as slot_status, ds.doctor_id,
               h.hospital_name, h.city
        FROM schedule s
        JOIN doctor_schedule ds ON s.schedule_id = ds.schedule_id
        LEFT JOIN hospital h ON s.hospital_id = h.hospital_id
        WHERE ds.doctor_id = $1 AND s.available_date >= $2 AND s.available_date <= $3
        ORDER BY s.available_date ASC, s.start_time ASC`,
      [doctorId, windowForFilter.currentDate, yearEnd]
    );

    const now = new Date();
    const windowStatus = getScheduleWindowStatus(now);
    const enriched = result.rows.map((s) => {
      const expired = isSlotExpired(s.available_date, s.end_time, now);
      let computedStatus = s.slot_status;
      if (expired && s.slot_status === "AVAILABLE") computedStatus = "expired";
      if (expired) computedStatus = s.slot_status === "WORKING" ? "WORKING" : s.slot_status === "UNAVAILABLE" ? "UNAVAILABLE" : "expired";
      // TEMP TESTING: window logic now applies to today (was tomorrow)
      const dateStr = s.available_date;
      const is_tomorrow = dateStr === windowStatus.currentDate;
      // TEMP: if window is closed, today's AVAILABLE slots display as UNAVAILABLE
      if (is_tomorrow && !windowStatus.isOpen && !expired && computedStatus === "AVAILABLE") {
        computedStatus = "UNAVAILABLE";
      }
      const is_editable = is_tomorrow && windowStatus.isOpen && !expired && s.slot_status === "AVAILABLE";
      const window_closed_unavailable = is_tomorrow && !windowStatus.isOpen && !expired && s.slot_status === "AVAILABLE";
      return { ...s, is_expired: expired, computed_status: computedStatus, is_tomorrow, is_editable, window_is_open: windowStatus.isOpen, window_closed_unavailable };
    });

    return res.status(200).json({ schedules: enriched, timezone: windowStatus.timezone, targetDate: windowStatus.targetDate, currentDate: windowStatus.currentDate, isOpen: windowStatus.isOpen, currentTime: windowStatus.currentTime });
  } catch (error) {
    console.error("getMySchedules error:", error);
    return res.status(500).json({ message: "Could not load schedules.", error: error.message });
  }
};

// Helper to reuse existing schedule row (hospital+date+time) for sharing, else create new
const findOrCreateSchedule = async (client, available_date, start_time, end_time, hospital_id) => {
  // Try to find exact same slot (hospital+date+time) for sharing
  const existing = await client.query(
    `SELECT schedule_id FROM schedule WHERE available_date=$1 AND start_time=$2::time AND end_time=$3::time AND (hospital_id = $4 OR (hospital_id IS NULL AND $4 IS NULL)) LIMIT 1`,
    [available_date, start_time, end_time, hospital_id]
  );
  if (existing.rows.length > 0) return existing.rows[0].schedule_id;
  const ins = await client.query(
    `INSERT INTO schedule (available_date, start_time, end_time, hospital_id, created_at, updated_at)
     VALUES ($1,$2::time,$3::time,$4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING schedule_id`,
    [available_date, start_time, end_time, hospital_id]
  );
  return ins.rows[0].schedule_id;
};

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createSchedule = async (req, res) => {
  console.log("[createSchedule] req.user:", req.user);
  console.log("[createSchedule] req.body:", req.body);
  const client = await pool.connect();
  try {
    const doctorId = req.user?.doctor_id;
    console.log("[createSchedule] doctorId:", doctorId);
    if (!doctorId) {
      return res.status(401).json({ message: "Doctor authentication failed. doctor_id missing from token.", code: "AUTH_MISSING" });
    }
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    const now = new Date();
    try {
      // TEMP TESTING: default to today (was targetDate = tomorrow)
      const today = getCurrentDateStr(now);
      let { available_date, start_time, end_time, hospital_id, status } = req.body;
      if (!available_date) available_date = today;
      // TEMP TESTING: Allow any date from today through Dec 31 of same year
      assertTargetDateInSameYear(available_date, now);
      // Normalize to YYYY-MM-DD
      available_date = String(available_date).split("T")[0];

      if (!start_time || !end_time) {
        return res.status(400).json({ message: "start_time and end_time are required (HH:MM 24-hour, e.g. 13:30)." });
      }
      const rawStart = String(start_time).trim();
      const rawEnd = String(end_time).trim();
      if (!TIME_24H_REGEX.test(rawStart) || !TIME_24H_REGEX.test(rawEnd)) {
        return res.status(400).json({ message: "Time must be 24-hour HH:MM (e.g. 09:00, 13:30, 23:45). AM/PM not allowed." });
      }
      start_time = rawStart.slice(0, 5);
      end_time = rawEnd.slice(0, 5);
      if (start_time >= end_time) {
        return res.status(400).json({ message: "End time must be later than start time." });
      }
      // hospital validation
      if (!hospital_id) {
        return res.status(400).json({ message: "hospital_id is required." });
      }
      const hospCheck = await pool.query(`SELECT hospital_id FROM hospital WHERE hospital_id=$1`, [hospital_id]);
      if (hospCheck.rows.length === 0) {
        return res.status(404).json({ message: "Hospital not found." });
      }
      // status mapping: frontend may send slot_status, normalize
      let normalizedStatus = status || req.body.slot_status || "AVAILABLE";
      normalizedStatus = String(normalizedStatus).toUpperCase();
      if (!["AVAILABLE","WORKING","UNAVAILABLE"].includes(normalizedStatus)) normalizedStatus = "AVAILABLE";

      // Overlap per doctor (via JOIN)
      if (await hasOverlap(doctorId, available_date, start_time, end_time, null)) {
        return res.status(409).json({ message: "Overlapping time slot exists for this date." });
      }
      // Duplicate check: same doctor+time+hospital
      const dup = await pool.query(
        `SELECT s.schedule_id FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
         WHERE ds.doctor_id=$1 AND s.available_date=$2 AND s.start_time=$3::time AND s.end_time=$4::time AND s.hospital_id=$5 LIMIT 1`,
        [doctorId, available_date, start_time, end_time, hospital_id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ message: "Duplicate time slot." });
      }

      await client.query("BEGIN");
      const scheduleId = await findOrCreateSchedule(client, available_date, start_time, end_time, hospital_id);
      // Check if this doctor already linked to this schedule (if reused global row)
      const alreadyLinked = await client.query(`SELECT status FROM doctor_schedule WHERE doctor_id=$1 AND schedule_id=$2`, [doctorId, scheduleId]);
      if (alreadyLinked.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "You are already linked to this schedule slot." });
      }
      await client.query(`INSERT INTO doctor_schedule (doctor_id, schedule_id, status) VALUES ($1,$2,$3)`, [doctorId, scheduleId, normalizedStatus]);
      await client.query("COMMIT");

      const result = await pool.query(
        `SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, h.hospital_name, ds.status as slot_status
         FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id LEFT JOIN hospital h ON s.hospital_id=h.hospital_id
         WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [scheduleId, doctorId]
      );

      return res.status(201).json({ message: "Schedule created successfully.", schedule: result.rows[0] });
    } catch (winErr) {
      await client.query("ROLLBACK").catch(()=>{});
      if (winErr.status) {
        return res.status(winErr.status).json({ message: winErr.message, code: winErr.code || undefined, details: winErr.details });
      }
      throw winErr;
    }
  } catch (error) {
    console.error("createSchedule error:", error);
    return res.status(500).json({ message: error.message || "Could not create schedule.", error: error.message });
  } finally { client.release(); }
};

const updateSchedule = async (req, res) => {
  console.log("[updateSchedule] req.user:", req.user, "body:", req.body);
  const client = await pool.connect();
  try {
    const doctorId = req.user?.doctor_id;
    if (!doctorId) return res.status(401).json({ message: "Doctor authentication failed.", code: "AUTH_MISSING" });
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    const scheduleId = req.params.id;
    const now = new Date();
    try { assertScheduleWindow(now); } catch (winErr) {
      return res.status(winErr.status).json({ message: winErr.message, code: winErr.code || undefined, details: winErr.details });
    }

    // Ownership via doctor_schedule
    const existing = await pool.query(
      `SELECT s.schedule_id, s.available_date, TO_CHAR(s.available_date,'YYYY-MM-DD') as available_date_str, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status, ds.doctor_id FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [scheduleId, doctorId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Schedule not found or not owned by you." });
    const schedule = existing.rows[0];
    // TEMP TESTING: Allow editing any same-year schedule (from today through Dec 31); window 1:30 AM–12:00 PM still gated
    const existingDateStr = schedule.available_date_str || (schedule.available_date instanceof Date ? schedule.available_date.toISOString().split("T")[0] : String(schedule.available_date).split("T")[0]);
    try { assertTargetDateInSameYear(existingDateStr, now); } catch (e) {
      return res.status(400).json({ message: "Only same-year schedules (from today through Dec 31) can be edited during the 1:30 AM–12:00 PM window.", details: e.details });
    }
    if (isSlotExpired(schedule.available_date, schedule.end_time, now)) {
      return res.status(400).json({ message: "Expired schedule cannot be modified." });
    }
    if (schedule.slot_status === "WORKING") {
      return res.status(400).json({ message: "Working slot cannot be edited." });
    }

    let { start_time, end_time, hospital_id, status, slot_status, available_date } = req.body;
    const validateTime = (t) => TIME_24H_REGEX.test(String(t).trim());
    start_time = start_time ? String(start_time).trim().slice(0, 5) : String(schedule.start_time).slice(0, 5);
    end_time = end_time ? String(end_time).trim().slice(0, 5) : String(schedule.end_time).slice(0, 5);
    if (!validateTime(start_time) || !validateTime(end_time)) {
      return res.status(400).json({ message: "Time must be 24-hour HH:MM (e.g. 09:00, 13:30)." });
    }
    if (start_time >= end_time) return res.status(400).json({ message: "End time must be later than start time." });

    // hospital + date handling for same-year range
    let newHospitalId = hospital_id !== undefined ? hospital_id : schedule.hospital_id;
    if (newHospitalId) {
      const hc = await pool.query(`SELECT hospital_id FROM hospital WHERE hospital_id=$1`, [newHospitalId]);
      if (hc.rows.length===0) return res.status(404).json({ message: "Hospital not found." });
    }
    // If client sends new available_date, validate it is within same-year future range
    let newAvailableDate = available_date ? String(available_date).split("T")[0] : String(schedule.available_date).split("T")[0];
    try { assertTargetDateInSameYear(newAvailableDate, now); } catch (e) {
      return res.status(400).json({ message: e.message, details: e.details });
    }

    if (await hasOverlap(doctorId, newAvailableDate, start_time, end_time, Number(scheduleId))) {
      return res.status(409).json({ message: "Overlapping time slot exists for this date." });
    }

    let newStatus = status || slot_status || schedule.slot_status;
    newStatus = String(newStatus).toUpperCase();
    if (!["AVAILABLE","WORKING","UNAVAILABLE"].includes(newStatus)) newStatus = schedule.slot_status;

    // Check if schedule is shared by many doctors - if so, detach and create new schedule row for this doctor instead of updating global
    const shareCount = await pool.query(`SELECT COUNT(*) FROM doctor_schedule WHERE schedule_id=$1`, [scheduleId]);
    const isShared = Number(shareCount.rows[0].count) > 1;

    await client.query("BEGIN");
    if (isShared) {
      // Create new schedule row for this doctor's edit, keep old for others
      const newId = await findOrCreateSchedule(client, newAvailableDate, start_time, end_time, newHospitalId);
      // If newId equals old and other doctors exist, we need new distinct row - force create new
      let finalId = newId;
      if (Number(newId) === Number(scheduleId)) {
        const ins = await client.query(`INSERT INTO schedule (available_date, start_time, end_time, hospital_id, created_at, updated_at) VALUES ($1,$2::time,$3::time,$4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING schedule_id`, [newAvailableDate, start_time, end_time, newHospitalId]);
        finalId = ins.rows[0].schedule_id;
      }
      await client.query(`DELETE FROM doctor_schedule WHERE doctor_id=$1 AND schedule_id=$2`, [doctorId, scheduleId]);
      await client.query(`INSERT INTO doctor_schedule (doctor_id, schedule_id, status) VALUES ($1,$2,$3)`, [doctorId, finalId, newStatus]);
      await client.query("COMMIT");
      const resRow = await pool.query(`SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [finalId, doctorId]);
      return res.status(200).json({ message: "Schedule updated successfully (shared slot detached).", schedule: resRow.rows[0] });
    } else {
      await client.query(`UPDATE schedule SET available_date=$1, start_time=$2::time, end_time=$3::time, hospital_id=$4, updated_at=CURRENT_TIMESTAMP WHERE schedule_id=$5`, [newAvailableDate, start_time, end_time, newHospitalId, scheduleId]);
      await client.query(`UPDATE doctor_schedule SET status=$1 WHERE doctor_id=$2 AND schedule_id=$3`, [newStatus, doctorId, scheduleId]);
      await client.query("COMMIT");
      const resRow = await pool.query(`SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [scheduleId, doctorId]);
      return res.status(200).json({ message: "Schedule updated successfully.", schedule: resRow.rows[0] });
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(()=>{});
    console.error("updateSchedule error:", error);
    return res.status(500).json({ message: error.message || "Could not update schedule.", error: error.message });
  } finally { client.release(); }
};

const deleteSchedule = async (req, res) => {
  console.log("[deleteSchedule] req.user:", req.user);
  try {
    const doctorId = req.user?.doctor_id;
    if (!doctorId) return res.status(401).json({ message: "Doctor authentication failed.", code: "AUTH_MISSING" });
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    const scheduleId = req.params.id;
    const now = new Date();

    const existing = await pool.query(`SELECT s.schedule_id, s.available_date, TO_CHAR(s.available_date,'YYYY-MM-DD') as available_date_str, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [scheduleId, doctorId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Schedule not found or not owned by you." });
    const schedule = existing.rows[0];
    const schDateStr = schedule.available_date_str || (schedule.available_date instanceof Date ? schedule.available_date.toISOString().split("T")[0] : String(schedule.available_date).split("T")[0]);
    try { assertTargetDateInSameYear(schDateStr, now); } catch (e) {
      return res.status(400).json({ message: "Only same-year schedules (from today through Dec 31) can be deleted.", code: e.code || undefined, details: e.details });
    }
    if (isSlotExpired(schedule.available_date, schedule.end_time, now)) {
      return res.status(400).json({ message: "Expired schedule cannot be deleted." });
    }
    if (schedule.slot_status === "WORKING") {
      return res.status(400).json({ message: "Working slot cannot be deleted." });
    }

    // Check if any appointment uses this schedule+doctor
    const apptCheck = await pool.query(`SELECT appointment_id FROM appointment WHERE schedule_id=$1 AND doctor_id=$2 AND appointment_status IN ('scheduled','confirmed') LIMIT 1`, [scheduleId, doctorId]);
    if (apptCheck.rows.length>0) {
      return res.status(400).json({ message: "Slot has active appointments, cannot delete. Mark unavailable instead." });
    }

    await pool.query(`DELETE FROM doctor_schedule WHERE doctor_id=$1 AND schedule_id=$2`, [doctorId, scheduleId]);
    // Delete schedule row if no more doctors linked
    const remaining = await pool.query(`SELECT COUNT(*) FROM doctor_schedule WHERE schedule_id=$1`, [scheduleId]);
    if (Number(remaining.rows[0].count)===0) {
      await pool.query(`DELETE FROM schedule WHERE schedule_id=$1`, [scheduleId]);
    }
    return res.status(200).json({ message: "Schedule deleted successfully." });
  } catch (error) {
    console.error("deleteSchedule error:", error);
    return res.status(500).json({ message: error.message || "Could not delete schedule.", error: error.message });
  }
};

const updateAvailability = async (req, res) => {
  console.log("[updateAvailability] req.user:", req.user, "body:", req.body);
  try {
    const doctorId = req.user?.doctor_id;
    if (!doctorId) return res.status(401).json({ message: "Doctor authentication failed.", code: "AUTH_MISSING" });
    const access = await getActiveDoctor(doctorId);
    if (!access.ok) return sendDoctorAccessError(res, access);

    const scheduleId = req.params.id;
    let { status, slot_status } = req.body;
    let newStatus = String(status || slot_status || "").toUpperCase();
    if (!["AVAILABLE","WORKING","UNAVAILABLE"].includes(newStatus)) {
      return res.status(400).json({ message: "status must be AVAILABLE, WORKING or UNAVAILABLE." });
    }

    const now = new Date();

    const existing = await pool.query(`SELECT s.schedule_id, s.available_date, TO_CHAR(s.available_date,'YYYY-MM-DD') as available_date_str, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [scheduleId, doctorId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Schedule not found or not owned by you." });
    const schedule = existing.rows[0];
    const avDateStrUpd = schedule.available_date_str || (schedule.available_date instanceof Date ? schedule.available_date.toISOString().split("T")[0] : String(schedule.available_date).split("T")[0]);
    try { assertTargetDateInSameYear(avDateStrUpd, now); } catch (e) {
      return res.status(400).json({ message: "Only same-year schedules (from today through Dec 31) can be updated.", code: e.code || undefined, details: e.details });
    }
    if (isSlotExpired(schedule.available_date, schedule.end_time, now)) {
      return res.status(400).json({ message: "Expired slot cannot be updated." });
    }
    if (schedule.slot_status === "WORKING") {
      // allow toggling from WORKING to AVAILABLE/UNAVAILABLE? Block if has appointment
      const appt = await pool.query(`SELECT appointment_id FROM appointment WHERE schedule_id=$1 AND doctor_id=$2 LIMIT 1`, [scheduleId, doctorId]);
      if (appt.rows.length>0 && newStatus==="UNAVAILABLE") {
        return res.status(400).json({ message: "Slot with appointments cannot be marked unavailable." });
      }
    }

    await pool.query(`UPDATE doctor_schedule SET status=$1 WHERE doctor_id=$2 AND schedule_id=$3`, [newStatus, doctorId, scheduleId]);

    const result = await pool.query(`SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, s.hospital_id, ds.status as slot_status FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id WHERE s.schedule_id=$1 AND ds.doctor_id=$2`, [scheduleId, doctorId]);

    return res.status(200).json({ message: `Slot marked as ${newStatus}.`, schedule: result.rows[0] });
  } catch (error) {
    console.error("updateAvailability error:", error);
    return res.status(500).json({ message: error.message || "Could not update availability.", error: error.message });
  }
};

module.exports = {
  getWindowInfo,
  getHospitals,
  getMySchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  updateAvailability,
};
