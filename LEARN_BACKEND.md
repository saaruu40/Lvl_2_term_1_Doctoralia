# LEARN BACKEND - Doctor Schedule Management

## How it works

### 1. Central Rule (Single Source)
File `server/utils/scheduleWindow.js` is the single source for time rules. No duplication in each controller.
- `TIMEZONE = process.env.TIMEZONE || "Asia/Dhaka"`
- `WINDOW_START_MIN=1 (00:01)`, `WINDOW_END_MIN=180 (03:00)`
- `getNowInTimezone()` uses `Intl.DateTimeFormat` with timeZone to get wall time without extra lib.
- `getTargetDateStr()` = today in that timezone +1 day.
- `isWithinScheduleWindow(now)` = minutes 1-180 inclusive.
- `assertScheduleWindow(now)` throws 403 if outside.
- `assertTargetDate(submitted, now)` throws 400 if not tomorrow.
- `isSlotExpired(date, end_time, now)` = if date < today => expired, if date == today and nowMinutes > endMinutes => expired.

### 2. Doctor Schedule Controller
`server/controllers/doctorScheduleController.js`
- Reuses `getActiveDoctor()` (approval + suspension) like other doctor controllers.
- `createSchedule`: 
  1. check auth doctor
  2. assert window
  3. force available_date = tomorrow (ignore frontend)
  4. validate start<end, slot_status
  5. overlap check SQL: `NOT (end_time <= $3 OR start_time >= $4)`
  6. duplicate check
  7. INSERT

- `updateSchedule` / `deleteSchedule` / `updateAvailability`:
  1. assert window
  2. fetch existing, check doctor_id === req.user.doctor_id (ownership)
  3. assert existing.available_date == tomorrow
  4. check not expired, not booked
  5. overlap check with exclude self
  6. UPDATE/DELETE

- `getMySchedules`: SELECT where doctor_id = me, enrich with is_expired/computed_status (expired calculated dynamically, not stored).

### 3. Staff Stripped
Previously staff did `INSERT INTO schedule` with arbitrary date. Now:
- `scheduleAppointment` in staffController only does `UPDATE appointment SET hospital_id, schedule_id` where schedule_id is existing.
- Validates slot belongs to same doctor, is available, not expired, not booked by other appointment.
- Marks slot booked, frees old slot if replaced.
- New `getAvailableSchedules` for staff: SELECT available where doctor_id=X, filter expired.

### 4. Expired Handling
- Not stored as status; computed each request.
- Backend guards: patient `makePayment` joins schedule and checks isSlotExpired before paid.
- Frontend shows expired badge but backend is authority.

### 5. Overlap Prevention
SQL pattern:
```sql
WHERE doctor_id=$1 AND available_date=$2
  AND schedule_id != $5
  AND NOT (end_time <= $3 OR start_time >= $4)
```
Covers cases 10:00-11:00 and 10:30-11:30 overlapping.

### 6. Ownership
- Doctor ID comes from `req.user.doctor_id` (JWT), never from body.
- Every mutating query checks `Number(slot.doctor_id) !== Number(req.user.doctor_id)` => 403.

### 7. Routes Protection
- `doctorRoutes.js` uses `authMiddleware + roleMiddleware("doctor")` before schedule routes, so staff/patient cannot call them (403).
- Staff routes use `roleMiddleware("staff")` for new GET available-schedules.

### 8. Frontend UX
- DoctorDashboard polls window status, disables buttons outside 00:01-03:00, shows targetDate read-only.
- StaffDashboard no longer has date/time inputs, only dropdown of available slots.

## Verification Cases (from spec)
1. 12:00 AM => isWithin false => 403
2. 12:01 AM => minutes=1 => true => allowed
3. 2:30 AM => 150 => allowed
4. 3:00 AM => 180 => allowed
5. 3:01 AM => 181 => false => 403
6. create for today => assertTargetDate fails => 400
7. create for +2 days => 400
8. modify another doctor => ownership check => 403
9. staff call doctor API => roleMiddleware => 403
10. expired slot => isSlotExpired => filtered/hidden, booking 400
11. overlapping => SQL overlap => 409

## Env Vars
- `TIMEZONE` (default Asia/Dhaka)
- `PORT`, `DB_*`, `JWT_SECRET` existing
