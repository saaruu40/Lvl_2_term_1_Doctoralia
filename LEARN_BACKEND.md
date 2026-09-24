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

---

# LEARN BACKEND - Authentication Improvements (JWT reuse, no new lib)

## How authentication works (existing, preserved)

1. **Login** — `POST /api/admin/login` (`server/controllers/adminController.js:90`), `POST /api/doctors/login` (`doctorController.js:195`), `POST /api/patients/login` (`patientController.js:96`), `POST /api/staff/login` (`staffController.js:211`) — validate email+password via `bcrypt.compare`, check `approval_status`/`suspended_until`, then `jwt.sign({ admin_id|doctor_id|patient_id|staff_id, role }, process.env.JWT_SECRET, {expiresIn:"1d"})` (`JWT_SECRET` `server/.env:8`).
2. **Store** — Frontend `localStorage.setItem("token", result.token)` + `setItem("admin"|"doctor"|"staff"|"patient", JSON.stringify(result.<role>))` (`AdminLogin.jsx:58`, `DoctorLogin.jsx:98`, `StaffLogin.jsx:177`, `PatientLogin.jsx:59`). Single shared `token` key.
3. **Send** — Every protected request uses `authFetch` helper (`AdminDashboard.jsx:8`, `DoctorDashboard.jsx:14`, `StaffDashboard.jsx:47`, `PatientDashboard.jsx:9`): `headers.Authorization = Bearer ${localStorage.getItem("token")}`.
4. **Verify** — Backend `server/middleware/authMiddleware.js:5,16,24` reads `req.headers.authorization`, splits `Bearer <token>`, `jwt.verify(token, JWT_SECRET)` → `req.user = { role, id }`, else `401 No token / Invalid or expired token`. `roleMiddleware.js:3` checks `req.user.role === requiredRole` else `403`.
5. **Transactions preserved** — No change: `BEGIN/COMMIT/ROLLBACK` + `FOR UPDATE` in `doctorController.createPrescription:898`, `patientController.makePayment:749`, `staffController.scheduleAppointment:748` etc. Still custom JWT, no third-party service (CSE216).

## Feature 1: Auto logout on inactivity (5 min)

- **File:** `client/src/hooks/useInactivityLogout.js` — simple hook, no lib.
- **Timeout:** `5*60*1000` ms (5 min, per request — was 15 min). Chose 5 min for tighter idle protection.
- **Step-by-step:**
  1. Dashboard mounts (`AdminDashboard.jsx:18`, `DoctorDashboard.jsx:452`, `StaffDashboard.jsx:51`, `PatientDashboard.jsx:833`) → `useInactivityLogout(handleInactivityLogout, 5*60*1000)` is called.
  2. Hook sets `timer = setTimeout(handleInactivityLogout, 5*60*1000)` immediately.
  3. Hook adds listeners for `mousemove,mousedown,click,keydown,scroll,touchstart` on `window` (throttled 3s for mousemove).
  4. On any activity → `clearTimeout(timer)` + `timer = setTimeout(..., 5m)` (reset).
  5. After 5 min no activity → `handleInactivityLogout` runs: `localStorage.removeItem(token+admin+doctor+staff+patient)`, `setItem("inactive_logout","1")`, `window.location.replace("/login" or "/doctor-login" etc.)`.
  6. Login page `useEffect` (`AdminLogin.jsx:13`, etc.) sees `inactive_logout==="1"` → shows banner `"You have been logged out due to inactivity."` then `removeItem` so it shows once.
  7. Backend still enforces `expiresIn:"1d"` — even if user disables JS timer, next `authFetch` with expired/missing token gets `401` and hard-logouts. Frontend timer is UX only.
- **No backend change** — no new endpoint, no expiry change.

## Feature 2: Prevent login when already logged in

- **Files:** `client/src/pages/AdminLogin.jsx:13`, `DoctorLogin.jsx:15`, `PatientLogin.jsx:15`, `StaffLogin.jsx:15`.
- **Step-by-step:**
  1. User opens any `/login`, `/doctor-login`, `/staff-login`, `/patient-login`.
  2. Component checks `token = localStorage.getItem("token")` and `hasAny = !!admin||!!doctor||!!staff||!!patient` → `alreadyLoggedIn = !!token && hasAny`.
  3. If `alreadyLoggedIn` true → `return` early UI: `<p>You are already logged in. Please logout first.</p>` + `<button onClick={clearAll+reload}>Logout</button>` (clears `token+all roles+inactive_logout`, `window.location.reload()`). Form is NOT rendered, so no second session can be created on top.
  4. If user clicks `Logout` → storage cleared → `alreadyLoggedIn` becomes false on reload → form renders normally → can login again.
  5. Works for all roles because check is any-token (shared key). Prevents `patient` logged in then opening `/doctor-login` and overwriting token.
  6. Also shows `inactiveMsg` banner if coming from timeout.

## Feature 3: Protected routes/pages

- **Files:** `client/src/components/ProtectedRoute.jsx` + `client/src/App.jsx:151,169,187,205` (`BrowserRouter` `client/src/main.jsx:3`).
- **Step-by-step:**
  1. `App.jsx` wraps dashboards: `<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard/></ProtectedRoute>` (similar for doctor/staff/patient). Public routes (`/`, `/login`, `/register`, `/doctor-registration`, `/doctor-login`, `/staff-registration`, `/staff-login`, `/patient-registration`, `/patient-login`) are NOT wrapped → stay public. `GET /api/departments` and `GET /api/patients/doctors` browsing stays public.
  2. `ProtectedRoute` reads `token` + `hasAdmin/hasDoctor/hasStaff/hasPatient`. If `!token || !hasAny` → `<Navigate to={roleLogin} replace>` (roleLogin = first `allowedRoles` entry mapped to `/login|/doctor-login|...`). If `allowedRoles` specified and `userRole` not in it → redirect to own login (prevents doctor token opening admin dashboard).
  3. Existing per-page `useEffect` guards (`AdminDashboard.jsx:78`, `DoctorDashboard.jsx:456`, `StaffDashboard.jsx:218`, `PatientDashboard.jsx:168`) remain as second layer — if someone bypasses router, component still `navigate("/...-login")`.
  4. Booking still requires auth: `PatientDashboard.jsx:538 bookAppointmentWithSchedule` checks `localStorage patient` before `POST /api/patients/appointments`; backend `appointment` insert still validates `patient_id` and `trg_appointment_department_check`. No change needed because protection is already layered.
- **Assumptions:** One user = one role at a time (shared `token`); clearing all roles on logout is intended. `5 min` constant is easy to change in one place (`useInactivityLogout` call). Average-coder UI (plain div+button, no toast lib).

---

## Department Disabled Message (2026-09-24) — Reuses existing status

- **Schema single source:** `database/schema.sql:18` `department.status VARCHAR(20) DEFAULT 'active' CHECK ('active','inactive')` — `inactive` means disabled, `adminController.disableDepartment:812` sets `inactive`, `enableDepartment:851` sets `active`. Existing trigger `check_department_active_on_appointment:750-777` already blocks `INSERT appointment` when `inactive` — **reused, not recreated**.
- **Backend smallest change:** `server/controllers/doctorController.js:466-468` `getDoctorProfile` added `dep.status AS department_status` to existing `LEFT JOIN department dep ON d.department_id=dep.department_id` SELECT. `GET /api/doctors/profile` (`doctorRoutes:254` `auth+role doctor`) now returns `department_status` (`active`/`inactive`/`null`). No new route, no new query elsewhere.
- **Frontend check:** `client/src/pages/DoctorDashboard.jsx:1758` already loads `doctor` via `loadProfile()` (`authFetch ${API}/profile` → `setDoctor(data.doctor)`). Added `{doctor?.department_status === 'inactive' && <p>Your department is currently disabled.</p>}`. If `active`/`null` (missing dept) → nothing. No redirect/popup/modal/restriction; dashboard otherwise normal.
- **Not changed:** Appointments/schedules/profile/auth/JWT/payment untouched; department disable logic untouched.

---

## Home Page + DB Functions + Secure Booking (2026-09-24) — Simple CSE216 Explanation

### 1. Home Page API Flow
Home (`Home.jsx`) is public — no JWT. On mount it fetches 4 public APIs: `GET /api/departments` (`departmentController:7` `status active` filter), `GET /api/patients/doctors?search=&department_id=` (`patientController:getApprovedDoctors` with `LEFT JOIN department`), `GET /api/patients/doctors/looking-for-staff` → `SELECT * FROM get_doctors_without_staff()` (see §2), `GET /api/admin/public-contact` (`SELECT email`). Each fetch → controller → `pool.query` → JSON `doctors/departments/email` → `useState` → render grid/cards. Clicking department sets `selectedDept` → refetches doctors with `department_id`. `View Doctor` → `navigate("/doctors/:id")`.

### 2. Doctors Looking for Staff — `get_doctors_without_staff()`
Why needed: Advertisement must be database-driven, not hard-coded, and must auto-hide when doctor gets staff. Function `RETURNS TABLE (doctor_id, full_name, department_name, profile_photo, qualification, specification)` does `SELECT d.* FROM doctor d LEFT JOIN department dep WHERE approval_status='approved' AND (suspended_until OK) AND dep status active AND NOT EXISTS (SELECT 1 FROM staff_assignment sa WHERE sa.doctor_id=d.doctor_id AND sa.status='ACTIVE')`. Uses `NOT EXISTS` (not `needs_staff` column) so if staff assigned later, `NOT EXISTS` becomes false → doctor disappears. No trigger needed because query is live.

### 3. Fee Function — `calculate_appointment_fee(p_patient_id,p_doctor_id)`
Why: Return correct fee without payment. Does `EXISTS (SELECT 1 FROM appointment WHERE patient_id=p_patient_id AND doctor_id=p_doctor_id AND appointment_status='completed' AND booking_date >= NOW()-90 days)` → if true `SELECT followup_fee` else `new_patient_fee` from `doctor`. Uses existing `doctor.new_patient_fee/followup_fee:89-90`. No new column. Controller calls `SELECT calculate_appointment_fee($1,$2)` before COMMIT and returns `fee` in booking response.

### 4. Booking Procedure — `book_appointment(p_patient_id,p_doctor_id,p_schedule_id,p_hospital_id, INOUT p_appointment_id)`
Why: Multi-step DB workflow in one transaction avoids partial insert. Steps inside `BEGIN` (Node does `BEGIN`/`COMMIT`/`ROLLBACK` explicitly): check doctor active, check department `status<>'inactive'` (same as trigger but DB-side), check schedule `status='AVAILABLE'`, check duplicate `appointment_status IN (pending,scheduled,confirmed)` and capacity `COUNT(*) < max_patient_num`, then `INSERT ... RETURNING appointment_id`. Keeps `isSlotExpired()` and `assertTargetDateInSameYear` in Node (`utils/scheduleWindow:183`) as authority for time — procedure does not duplicate time parsing. No payment.

### 5. Existing Trigger Reused
`trg_appointment_department_check:750-777` `BEFORE INSERT ON appointment` raises `P0001` if `department.status='inactive'`. Kept, not replaced. If someone bypasses Node and inserts directly, trigger still blocks. No staff trigger created because `NOT EXISTS` query is enough.

### 6. Route→Controller→DB Flow
Browser `Home` → `fetch GET /api/patients/doctors/looking-for-staff` → `patientRoutes:102` → `patientController.getDoctorsWithoutStaff` → `pool.query SELECT * FROM get_doctors_without_staff()` → `res.json`. Same for departments, doctors, public-contact. All plain `pool.query`, no ORM.

### 7. JWT Flow
Login (`POST /api/patients/login` `patientController:176`) `jwt.sign({patient_id, role:patient}, SECRET, expiresIn 1d)` → frontend `localStorage.setItem("token")`. Future booking `fetch POST /api/patients/appointments` sends `Authorization: Bearer <token>` → `authMiddleware:24` `jwt.verify` → `req.user={patient_id, role}` → `roleMiddleware("patient"):1` checks role → controller uses `req.user.patient_id`. If no header → `401 No token provided:5`.

### 8. Why `patient_id` from `req.user`
`req.body.patient_id` is client-controlled — attacker could change `patient_id:99` to book for another patient. `req.user.patient_id` comes from signed JWT (HMAC with `JWT_SECRET`), cannot be forged without secret. Example: before, `POST {patient_id:1, doctor_id:2}` could spoof; now `POST {doctor_id:2}` with `Bearer token of patient 5` → server uses `5`, so spoof fails.

### 9. Schedule Validation & `isSlotExpired()` Reuse
`isSlotExpired(available_date, end_time, now)` (`scheduleWindow:183-199`) returns `true` if `date < today` or `date==today && nowMinutes > endMinutes` (Dhaka TZ). Reused both client (DoctorProfile shows only non-expired via server filter) and server: `patientController:304 getDoctorAvailableSchedules` filters `available = rows.filter(!isSlotExpired(...))`, `createAppointment:543` checks `if isSlotExpired(...) return 400`, `doctorScheduleController:102` enriches `is_expired`. Not duplicated — single source.

### 10. Transactions
Every DML uses `client.query("BEGIN")`, `FOR UPDATE` locks (`patient, doctor, schedule`), then `COMMIT` or `ROLLBACK` on error (see `patientController:createAppointment:487,588,596`). Procedure is called inside same transaction, so if any `RAISE EXCEPTION` triggers rollback.

---

## Home Rebuild — Needs Staff Trigger + Nav-Only Booking (2026-09-24)

### 1. Home Gets Doctors
`Home.jsx useEffect fetch GET /api/patients/doctors?search=&department_id=` → `patientRoutes:60 GET /doctors` → `patientController:getApprovedDoctors LEFT JOIN department WHERE approved+suspended OK` → `res.json doctors` → `useState doctors` → cards. Search input updates `search` state → refetch with `search`. Dept select updates `selectedDept` → refetch.

### 2. Doctor Search Dropdown
Additional searchable dropdown `Search or Select Doctor ▼` shows `All Doctors` + `doctors.filter(d.full_name.toLowerCase().includes(search))`. Typing `rah` filters list to `Rahim` etc. Clicking an entry sets `search` to that name and closes dropdown. Works together with department filter (both in same `useEffect` deps).

### 3. New Approved → Staff-Required
`doctor.approval_status default pending:93`, admin `PATCH /doctors/:id/approve:324 UPDATE SET approval_status='approved' WHERE pending`. Trigger `trg_doctor_needs_staff BEFORE UPDATE OF approval_status WHEN OLD pending AND NEW approved` → `NEW.needs_staff:=TRUE` (`DO $$ ALTER TABLE doctor ADD COLUMN needs_staff BOOLEAN DEFAULT FALSE` if not exists).

### 4. Trigger Details
`set_doctor_needs_staff() RETURNS TRIGGER` checks `IF OLD.approval_status='pending' AND NEW.approval_status='approved' THEN NEW.needs_staff:=TRUE; END IF; RETURN NEW;` — runs only for new approvals, not for other updates (`full_name` etc.). Existing `trg_appointment_department_check:750` kept.

### 5. Home Retrieves Staff-Required Doctors
`get_doctors_needing_staff() RETURNS TABLE` `SELECT ... WHERE needs_staff=TRUE AND approved AND suspended OK AND dept active AND NOT EXISTS ACTIVE staff_assignment` → `patientRoutes:76 GET /looking-for-staff` public (before `:id`) → `pool.query SELECT * FROM get_doctors_needing_staff()` → Home `fetch GET /looking-for-staff` → `setLooking` → cards with `New Doctor` + `Staff Required` + `Register as Staff → /staff-registration` (existing page). When staff added (`INSERT staff_assignment ACTIVE`), `NOT EXISTS` becomes false → doctor disappears without extra trigger.

### 6. Book Appointment Navigation Only
Home/DoctorProfile `Book Appointment` does NOT call `POST /appointments`. It checks `localStorage token + patient` entry (set by `PatientLogin:81 jwt patient_id`). If `!isPatient` → `navigate("/patient-login")` (existing page), else `navigate("/patient-dashboard")` (existing dashboard). No `patient_id` sent, no API, no `book_appointment`/`calculate_appointment_fee` created for Home. Existing `POST /appointments` stays secured (`auth+role patient`, `req.user.patient_id:470`) but is not invoked from Home.

### 7. Why No Appointment Logic Change
Appointment is out of scope — existing `createAppointment` (`BEGIN/COMMIT/ROLLBACK`, `isSlotExpired:540`, `P0001` dept trigger) preserved, no new procedure/fee, no slot-expiry rewrite, no payment. Home simply navigates.

### 8. Route→Controller→DB for Staff Ad (DEPRECATED path — kept for compat)
`Home fetch GET /looking-for-staff` → `patientRoutes:76` → `getDoctorsWithoutStaff` → `SELECT * FROM get_doctors_needing_staff()` → trigger-set `needs_staff` + live `NOT EXISTS` → `res.json` → React grid.

---

## Generic Staff Required — Fix False Ads (2026-09-24)

### 1. Why blind trigger was wrong
Old `set_doctor_needs_staff()` did `pending→approved → NEW.needs_staff:=TRUE` unconditionally. If staff X available and `POST /assign-staff` assigns immediately, `needs_staff TRUE` still caused Home `looking-for-staff` cards to show false ad. Correct rule: `needs_staff` must reflect *live* assignment state, not just approval.

### 2. Fixed DB logic
- `set_doctor_needs_staff()` now: `IF pending→approved THEN IF NOT EXISTS ACTIVE assignment THEN TRUE ELSE FALSE`. So approval with immediate assignment → FALSE, no ad.
- Backfill: `UPDATE doctor SET needs_staff = (approved AND not suspended AND NOT EXISTS ACTIVE)` corrects legacy rows.
- `sync_doctor_needs_staff()` + 3 `AFTER INSERT/UPDATE/DELETE ON staff_assignment` → `UPDATE doctor SET needs_staff = (approved AND not suspended AND NOT EXISTS ACTIVE) WHERE doctor_id=target`. Assigned→FALSE, ended/deleted→re-check TRUE/FALSE.
- `is_staff_required() BOOLEAN` → `EXISTS (approved+dept active+suspended OK AND NOT EXISTS ACTIVE)`. Single boolean for Home, no doctor details leaked.

### 3. Generic API
`patientController.getStaffRequiredStatus:1142` → `SELECT is_staff_required()` → `{staff_required:true|false}` with fallback live EXISTS. `patientRoutes:76 GET /staff-required` public (before `:id`). Old `GET /looking-for-staff` kept but deprecated.

### 4. Home banner (no doctor cards)
`Home.jsx:8 staffRequired boolean` fetches `GET /staff-required` on mount. `staffRequired && <section>📢 STAFF REQUIRED / Some doctors need staff / [Register as Staff → /staff-registration]</section>` — generic, no `doctor_id/full_name/photo/department/qualification`. Hidden when `false`. Reuses existing `Home.css` teal `075f68`, no animation.

### 5. Route→Controller→DB (new)
`Home fetch GET /staff-required` → `patientRoutes GET /staff-required` → `patientController.getStaffRequiredStatus` → `pool.query SELECT is_staff_required()` → `{staff_required}` → React conditional. `needs_staff` triggers maintain DB truth; assignment via `doctorController.assignStaff:2442 POST /assign-staff` (existing workflow) auto-flips via `trg_sync_*`.

### 6. Cases
A assigned→false hidden, B none→true visible, C later assigned→false hidden, D multi one none→true visible, E all have→false hidden. Verified via `SELECT doctor_id,needs_staff FROM doctor`, `SELECT * FROM staff_assignment WHERE status='ACTIVE'`, `SELECT is_staff_required()`.
