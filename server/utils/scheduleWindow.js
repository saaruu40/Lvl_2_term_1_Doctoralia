// Central helper for Doctor schedule management window
// Window 8:00 PM (20:00) through 12:00 AM (24:00) inclusive — Asia/Dhaka
// Fixable dates: any date from today through Dec 31 of same Dhaka year (today -> year end)

const TIMEZONE = process.env.TIMEZONE || "Asia/Dhaka";
const WINDOW_START_MIN = 20 * 60;    // 8:00 PM = 1200
const WINDOW_END_MIN = 24 * 60;    // 12:00 AM = 1440 (24:00, end of day)

function getNowInTimezone(date = new Date()) {
  // Convert to target timezone and extract wall-time components
  // Using Intl to avoid external libs per Agent.md
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type).value;
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));

  // Build a Date representing same wall-time in that timezone as UTC for calculation
  // For validation we only need Y-M-D and minutes
  const dateStr = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const minutes = hour * 60 + minute;

  return {
    raw: date,
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    minutes,
    timezone: TIMEZONE,
  };
}

function getCurrentDateStr(now = new Date()) {
  return getNowInTimezone(now).dateStr;
}

function getTargetDateStr(now = new Date()) {
  const { year, month, day } = getNowInTimezone(now);
  // Compute tomorrow in target timezone
  const tzMidnightUTC = Date.UTC(year, month - 1, day);
  const tomorrowUTC = new Date(tzMidnightUTC + 24 * 60 * 60 * 1000);
  const y = tomorrowUTC.getUTCFullYear();
  const m = String(tomorrowUTC.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tomorrowUTC.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWithinScheduleWindow(now = new Date()) {
  const { minutes } = getNowInTimezone(now);
  // Inclusive 8:00 PM (1200) through 12:00 AM (24:00 = 1440) — 24:00 is end of day, not next day's 00:00
  return minutes >= WINDOW_START_MIN && minutes <= WINDOW_END_MIN;
}

function formatDhaka12h(now = new Date()) {
  const { hour, minute } = getNowInTimezone(now);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${String(h12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function getScheduleWindowStatus(now = new Date()) {
  const currentDate = getCurrentDateStr(now);
  const targetDate = getTargetDateStr(now);
  const { minutes, hour, minute } = getNowInTimezone(now);
  const isOpen = isWithinScheduleWindow(now);
  return {
    now: now.toISOString(),
    timezone: TIMEZONE,
    currentDate,
    targetDate,
    window: "20:00-24:00",
    isOpen,
    currentTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    minutes,
    message: isOpen
      ? `You can set schedule for today through Dec 31 between 8:00 PM and 12:00 AM. Today: ${currentDate}`
      : "Doctor schedules can only be managed between 8:00 PM and 12:00 AM.",
  };
}

function assertScheduleWindow(now = new Date()) {
  if (!isWithinScheduleWindow(now)) {
    const status = getScheduleWindowStatus(now);
    const err = new Error("Doctor schedules can only be managed between 8:00 PM and 12:00 AM.");
    err.status = 403;
    err.code = "WINDOW_CLOSED";
    err.details = status;
    throw err;
  }
}

function getYearEndDateStr(now = new Date()) {
  const { year } = getNowInTimezone(now);
  return `${year}-12-31`;
}

function assertTargetDate(submittedDateStr, now = new Date()) {
  const target = getTargetDateStr(now);
  // Normalize submitted to YYYY-MM-DD
  const submitted = String(submittedDateStr || "").split("T")[0];
  if (submitted !== target) {
    const err = new Error(`Schedule date must be exactly the following day (${target}). You sent ${submitted || "empty"}.`);
    err.status = 400;
    err.details = { expected: target, received: submitted, ...getScheduleWindowStatus(now) };
    throw err;
  }
}

// TEMP TESTING: Same-year range: any date from today through Dec 31 of same Dhaka year
function assertTargetDateInSameYear(submittedDateStr, now = new Date()) {
  const today = getCurrentDateStr(now);
  const yearEnd = getYearEndDateStr(now);
  const { year } = getNowInTimezone(now);
  const submitted = String(submittedDateStr || "").split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(submitted)) {
    const err = new Error(`Schedule date must be YYYY-MM-DD within current year (${year}). You sent ${submitted || "empty"}.`);
    err.status = 400;
    err.details = { expected: `${today} .. ${yearEnd}`, received: submitted, ...getScheduleWindowStatus(now) };
    throw err;
  }
  const submittedYear = Number(submitted.split("-")[0]);
  if (submittedYear !== year) {
    const err = new Error(`Schedule year must be ${year} (same year). You sent ${submitted}.`);
    err.status = 400;
    err.details = { expectedYear: year, received: submitted, ...getScheduleWindowStatus(now) };
    throw err;
  }
  if (submitted < today) {
    const err = new Error(`Schedule date must be from today (${today}) onward. You sent ${submitted}.`);
    err.status = 400;
    err.details = { expected: `${today} .. ${yearEnd}`, received: submitted, ...getScheduleWindowStatus(now) };
    throw err;
  }
  if (submitted > yearEnd) {
    const err = new Error(`Schedule date must be within current year (≤ ${yearEnd}). You sent ${submitted}.`);
    err.status = 400;
    err.details = { expected: `${today} .. ${yearEnd}`, received: submitted, ...getScheduleWindowStatus(now) };
    throw err;
  }
}

function isSlotExpired(available_date, end_time, now = new Date()) {
  // available_date may be Date object or string YYYY-MM-DD, end_time is HH:MM:SS or HH:MM
  try {
    const dateStr = String(available_date).split("T")[0];
    const timeStr = String(end_time).slice(0, 8); // ensure HH:MM:SS
    const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    // Build end datetime in target timezone, compare with now in same timezone
    const tzNow = getNowInTimezone(now);
    // Construct end slot datetime string in target timezone
    // For expired check we compare wall times: if target date < currentDate => expired, if same date but end_time < now time => expired
    const currentDateStr = getCurrentDateStr(now);
    if (dateStr < currentDateStr) return true;
    if (dateStr > currentDateStr) return false;
    // same date: compare end_time minutes vs now minutes
    const [eh, em] = normalizedTime.split(":").map(Number);
    const endMins = eh * 60 + em;
    return tzNow.minutes > endMins || (tzNow.minutes === endMins && tzNow.second > 0) ? tzNow.minutes > endMins : false;
    // Simpler: if end_time < now's time on same day => expired
    // Actually we need full comparison: if currentDate == slot date and now > end_time => expired
  } catch {
    return false;
  }
}

// More precise: combine date + time and compare instants in TZ
function isSlotExpiredPrecise(available_date, end_time, now = new Date()) {
  const dateStr = String(available_date).split("T")[0];
  const timeStr = String(end_time).slice(0, 5);
  const { year, month, day, hour, minute } = getNowInTimezone(now);
  // If slot date is before today in TZ => expired
  const todayStr = getCurrentDateStr(now);
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  // same day
  const [eh, em] = timeStr.split(":").map(Number);
  const nowMins = hour * 60 + minute;
  const endMins = eh * 60 + em;
  return nowMins > endMins;
}

module.exports = {
  TIMEZONE,
  WINDOW_START_MIN,
  WINDOW_END_MIN,
  getNowInTimezone,
  getCurrentDateStr,
  getTargetDateStr,
  getYearEndDateStr,
  isWithinScheduleWindow,
  getScheduleWindowStatus,
  assertScheduleWindow,
  assertTargetDate,
  assertTargetDateInSameYear,
  isSlotExpired: isSlotExpiredPrecise,
  formatDhaka12h,
};
