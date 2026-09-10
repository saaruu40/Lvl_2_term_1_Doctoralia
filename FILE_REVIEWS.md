# FILE REVIEWS - Doctor Schedule Management

## Summary
Implemented doctor-owned schedule management with strict 00:01-03:00 window for following day only, removed staff schedule control.

## Database
- **database/schema.sql:98-115**
  - schedule: added `slot_status DEFAULT 'available'`, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - Added indexes `idx_schedule_doctor_date` and `idx_schedule_doctor_date_time`

## Backend - New Files
- **server/utils/scheduleWindow.js**
  - Central helper, no external lib, TIMEZONE=Asia/Dhaka (env TIMEZONE)
  - `getNowInTimezone()`, `getTargetDateStr()`, `isWithinScheduleWindow()` (1 <= mins <= 180), `getScheduleWindowStatus()`, `assertScheduleWindow()`, `assertTargetDate()`, `isSlotExpired()`
  - Used by all schedule mutating endpoints

- **server/controllers/doctorScheduleController.js**
  - `getWindowInfo`, `getMySchedules` (enriches with is_expired/computed_status), `createSchedule`, `updateSchedule`, `deleteSchedule`, `updateAvailability`
  - Enforces: auth doctor, getActiveDoctor, ownership via doctor_id compare, window 00:01-03:00, targetDate == tomorrow, start<end, no overlap (`NOT (end <= newStart OR start >= newEnd)`), no duplicate, no edit/delete if booked/expired

- **server/apiTester/doctorSchedule.http**
  - 19 cases covering window, overlap, duplicate, ownership, staff blocked, expired

## Backend - Modified
- **server/routes/doctorRoutes.js:61-72, 365-378**
  - Imported doctorScheduleController, added 6 routes after auth+role doctor: `GET /schedules/window`, `GET /schedules`, `POST /schedules`, `PUT /schedules/:id`, `DELETE /schedules/:id`, `PATCH /schedules/:id/availability`

- **server/controllers/staffController.js:962-1650**
  - `scheduleAppointment`: removed available_date/start_time/end_time creation logic; now requires `hospital_id` + `schedule_id`, validates slot belongs to same doctor, slot_status available, not expired (via scheduleWindow), not booked, frees previous slot if replaced, marks new slot booked
  - Added `getAvailableSchedules` (read-only, filters expired): staff can VIEW but NOT modify
  - Exported new function

- **server/routes/staffRoutes.js:14-27, 273-285**
  - Import getAvailableSchedules, added `GET /available-schedules` (staff role), kept PATCH /appointments/:id/schedule now as hospital+slot assignment, comment clarified

- **server/controllers/patientController.js:358-400, 580-620, 300-340**
  - Added `getDoctorAvailableSchedules` (public, filters expired)
  - Modified `makePayment` to include schedule join and expired/unavailable guards
  - Exported new function

- **server/routes/patientRoutes.js:8-15, 66-72**
  - Import getDoctorAvailableSchedules, added `GET /doctors/:id/schedules`

## Frontend - Doctor
- **client/src/pages/DoctorDashboard.jsx**
  - Added state: schedules, windowInfo, scheduleForm, editingScheduleId, editForm
  - Added loaders: loadWindowInfo, loadSchedules, createSchedule, startEdit, submitEdit, deleteSchedule, toggleAvailability
  - Added sidebar button "My Schedules"
  - Added section "schedules": banner with window info, targetDate auto, disabled create outside window, grid of slots with badges (available/unavailable/booked/expired), edit/delete/toggle disabled outside window or if expired/booked

- **client/src/styles/DoctorDashboard.css**
  - No new CSS file, inline styles used for schedule section (average coder UI per Agent.md)

## Frontend - Staff
- **client/src/pages/StaffDashboard.jsx:31-35, 199-230, 504-570**
  - Changed scheduleForm from {hospital_id, available_date, start_time, end_time} to {hospital_id, schedule_id}
  - Added availableSlots state, loadAvailableSlots()
  - openScheduleForm now async loads slots for doctor_id
  - Modal: removed date/time inputs, added slot select dropdown (read-only slots), note banner "Staff cannot create...", disabled save if no slots

## Notes
- No new libraries (Agent.md rule)
- Existing files not removed
- Timezone configurable via TIMEZONE env
