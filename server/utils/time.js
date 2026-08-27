const DHAKA_TZ = "Asia/Dhaka";

function getDhakaNow() {
  const now = new Date();
  const dhakaStr = now.toLocaleString("en-US", { timeZone: DHAKA_TZ });
  return new Date(dhakaStr);
}

function getDhakaDateString(dateObj) {
  const d = dateObj || getDhakaNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDhakaTimeMinutes(dateObj) {
  const d = dateObj || getDhakaNow();
  return d.getHours() * 60 + d.getMinutes();
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = parts[2] ? Number(parts[2].split(".")[0]) : 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m + s / 60;
}

/** Safe YYYY-MM-DD from pg DATE / Date / string (avoids toISOString UTC day-shift). */
function formatPgDate(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.split("T")[0];
}

const FIX_START_MIN = 15 * 60;
const FIX_END_MIN = 18 * 60;
function isInsideFixingWindow(availableDateStr, now) {
  const nowDhaka = now || getDhakaNow();
  const todayStr = getDhakaDateString(nowDhaka);
  if (availableDateStr !== todayStr) return false;
  const mins = getDhakaTimeMinutes(nowDhaka);
  // Same-date window 15:00 inclusive to 18:00 exclusive (Asia/Dhaka)
  return mins >= FIX_START_MIN && mins < FIX_END_MIN;
}

function computeAvailabilityStatus(availableDateStr, startTimeStr, endTimeStr, now) {
  const nowDhaka = now || getDhakaNow();
  const todayStr = getDhakaDateString(nowDhaka);
  if (!availableDateStr || availableDateStr !== todayStr) {
    return "UNAVAILABLE";
  }
  if (!startTimeStr || !endTimeStr) return "UNAVAILABLE";
  const startM = parseTimeToMinutes(startTimeStr);
  const endM = parseTimeToMinutes(endTimeStr);
  if (startM === null || endM === null) return "UNAVAILABLE";
  const nowM = getDhakaTimeMinutes(nowDhaka);
  if (nowM < startM) return "AVAILABLE";
  if (nowM >= startM && nowM < endM) return "WORKING";
  return "UNAVAILABLE";
}

function computeDisplayStatus(availableDateStr, startTimeStr, endTimeStr, now) {
  const nowDhaka = now || getDhakaNow();
  const todayStr = getDhakaDateString(nowDhaka);
  if (!availableDateStr) return "Schedule ended";
  const dateStr = String(availableDateStr).split("T")[0];
  if (dateStr > todayStr) return "Upcoming";
  if (dateStr < todayStr) return "Schedule ended";
  if (!startTimeStr || !endTimeStr) return "Schedule ended";
  const endM = parseTimeToMinutes(endTimeStr);
  if (endM === null) return "Schedule ended";
  const nowM = getDhakaTimeMinutes(nowDhaka);
  if (nowM < endM) return "Available";
  return "Schedule ended";
}

module.exports = {
  DHAKA_TZ,
  FIX_START_MIN,
  FIX_END_MIN,
  getDhakaNow,
  getDhakaDateString,
  getDhakaTimeMinutes,
  parseTimeToMinutes,
  formatPgDate,
  isInsideFixingWindow,
  computeAvailabilityStatus,
  computeDisplayStatus,
};
