# FILE REVIEWS - Doctor Schedule Management

## Summary
Implemented doctor-owned schedule management with strict **20:00-24:00 (8:00 PM–12:00 AM)** window Asia/Dhaka, dates **today→Dec31 same year**, removed staff schedule control. **Old window `01:30-12:00` (`90-720`) → New window `20:00-24:00` (`1200-1440`)** — only time values changed, date/year validation unchanged. Midnight: `24:00` is end-of-day, `00:00` next day is closed.

## Database
- **database/schema.sql:98-115**
  - schedule: added `slot_status DEFAULT 'available'`, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - Added indexes `idx_schedule_doctor_date` and `idx_schedule_doctor_date_time`

## Backend - New Files
- **server/utils/scheduleWindow.js** — updated 2026-09-25 to **window 20:00-24:00 (8:00 PM–12:00 AM) Asia/Dhaka**, `WINDOW_START_MIN=1200`, `WINDOW_END_MIN=1440` (24:00 end-of-day, `00:00` next day is closed). Handles midnight boundary: `1200 ≤ mins ≤1440` (19:59 closed, 20:00 open, 23:59 open, 00:00 closed). `getScheduleWindowStatus()` now returns `window:"20:00-24:00"`.
  - Central helper, no external lib, TIMEZONE=Asia/Dhaka (env TIMEZONE)
  - `getNowInTimezone()`, `getTargetDateStr()`, `isWithinScheduleWindow()` (1200 <= mins <= 1440), `getScheduleWindowStatus()`, `assertScheduleWindow()`, `assertTargetDateInSameYear()` (today→Dec31 same year, unchanged), `isSlotExpired()`
  - Used by all schedule mutating endpoints (`assertScheduleWindow` throws `403 WINDOW_CLOSED` outside 20:00-24:00)

- **server/controllers/doctorScheduleController.js** — window logic reused, not duplicated
  - `getWindowInfo`, `getMySchedules` (filter `available_date >= CURRENT_DATE` today→Dec31, enriches with is_expired/computed_status), `createSchedule`, `updateSchedule`, `deleteSchedule`, `updateAvailability`
  - Enforces: auth doctor, getActiveDoctor, ownership via doctor_id compare, window **20:00-24:00**, dates **today→Dec31 same year** via `assertTargetDateInSameYear`, start<end, no overlap (`NOT (end <= newStart OR start >= newEnd)`), no duplicate, no edit/delete if expired/WORKING

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

---

# FILE REVIEWS - Authentication Improvements (Inactivity Logout + Already Logged In + Protected Routes)

## Date: 2026-09-24

## Summary
Implemented 3 frontend auth features reusing existing JWT (`jsonwebtoken 9.0.3`, `expiresIn 1d`, `JWT_SECRET` `server/.env:8`) without new libraries, without deleting files, without breaking existing auth. Backend JWT `authMiddleware.js:24` + `roleMiddleware.js:3` remains authoritative; frontend adds UX guards.

## Frontend - New Files
- **client/src/hooks/useInactivityLogout.js** (NEW, 45 lines)
  - Average-coder hook, no lib. Params: `onLogout, timeoutMs=5*60*1000` (was 15 min, now 5 min per request).
  - Events: `mousemove,mousedown,click,keydown,scroll,touchstart` (throttled 3s for mousemove). Logic: `let timer; reset=()=>{clearTimeout(timer); timer=setTimeout(onLogout, timeoutMs)}` + `addEventListener` each event → reset, `removeEventListener+clearTimeout` on cleanup. Called with `useCallback` logout that clears storage + sets `inactive_logout=1` + redirects.
- **client/src/components/ProtectedRoute.jsx** (NEW, 34 lines)
  - Simple wrapper for `BrowserRouter`. Checks `localStorage token` + `admin|doctor|staff|patient` presence. If missing → `<Navigate to={roleLogin} replace>`; if `allowedRoles` mismatch → redirect to own login. Keeps public pages unwrapped.

## Frontend - Modified
- **client/src/App.jsx:1,83,151,169,187,205**
  - Added `import ProtectedRoute`. Wrapped 4 dashboards: `"/admin-dashboard" allowed ["admin"]`, `"/doctor-dashboard" ["doctor"]`, `"/staff-dashboard" ["staff"]`, `"/patient-dashboard" ["patient"]`. Public routes (`/`, `/login`, `/doctor-registration`, `/staff-registration`, `/patient-registration`, etc.) left unwrapped. No new route added.
- **client/src/pages/AdminLogin.jsx:1,13,74,76**
  - Added `useEffect` for `inactive_logout` banner, `alreadyLoggedIn` check (`token && (admin||doctor||staff||patient)`), early return showing `"You are already logged in. Please logout first."` + `Logout` button (`removeItem all + reload`). Normal login still `POST /api/admin/login` → `setItem token+admin` → `navigate("/admin-dashboard")`.
- **client/src/pages/DoctorLogin.jsx:1,15,74,76** — same guard + banner + logout (shared token check), normal flow `POST /api/doctors/login` unchanged.
- **client/src/pages/PatientLogin.jsx:1,15,74,76** — same.
- **client/src/pages/StaffLogin.jsx:1,15,74,76** — same.
- **client/src/pages/AdminDashboard.jsx:1,18,672,680**
  - Added `import useInactivityLogout`, `useCallback`. Added `handleInactivityLogout` (`remove all roles+token, set inactive_logout=1, replace /login`) + `useInactivityLogout(handleInactivityLogout, 5*60*1000)` (5 min) after `storedAdmin` def. Expanded `logout()` to clear all roles (prevent stale shared token).
- **client/src/pages/DoctorDashboard.jsx:1,5,452,1611**
  - Added hook + `handleInactivityLogout` → `/doctor-login` (both `navigate` + `replace`), expanded `logout()` to clear all. Timeout now `5*60*1000` (5 min).
- **client/src/pages/StaffDashboard.jsx:1,4,42,51**
  - Added hook + `handleInactivityLogout` → `/staff-login`, expanded `logout()`. Timeout `5*60*1000`.
- **client/src/pages/PatientDashboard.jsx:1,5,833,843**
  - Added hook + `handleInactivityLogout` → `/patient-login`, expanded `logout()`. Timeout `5*60*1000`.

## Backend - Unchanged (preserved)
- `server/middleware/authMiddleware.js:5,16,24,31` — still `Bearer` + `jwt.verify` → 401.
- `server/middleware/roleMiddleware.js:3` — still 403.
- `server/controllers/*.js` `jwt.sign(..., expiresIn:"1d")` unchanged (`adminController.js:135`, `doctorController.js:310`, `patientController.js:183`, `staffController.js:336`).
- No new triggers/functions/procedures, no new dependency, transactions `BEGIN/COMMIT/ROLLBACK` preserved.

## Docs - Modified
- **AUTH-SUMMARY.md:171-187 → added Frontend Auth Guards section** (inactivity 5 min, already-logged-in, ProtectedRoute, counts unchanged 100).
- **LEARN_BACKEND.md** — added How Auth Works section (inactivity + already-logged-in + ProtectedRoute step-by-step).
- **api-tests.http:1-33 header** — added separate role files index + Frontend Auth note (no new endpoint, manual verification).
- **server/apiTester/admin.http, doctor.http, patient.http, staff.http** — appended comment block `=== Frontend Auth (no API) ===` with 401 smoke + manual steps.

## Verification
- `npm run build` passes (vite build)
- Manual: login → wait 5m (or temporarily 10s for test) → assert `inactive_logout` banner + redirect; while logged in → visit any `/...-login` → assert block + Logout → form; without token → visit `/admin-dashboard` → redirect to `/login`; booking without auth still requires `patient` storage + backend validates.

---

# FILE REVIEWS - Doctor Department Disabled Message (2026-09-24)

## Summary
Show `"Your department is currently disabled."` on Doctor Dashboard only when assigned department `status='inactive'`. Minimal change reusing existing `department.status`.

## Backend - Modified
- **server/controllers/doctorController.js:466-468** `getDoctorProfile` — added `dep.status AS department_status` to `SELECT` of existing `LEFT JOIN department` query. Reuses `department.status` (`database/schema.sql:18` `active`/`inactive`, `adminController.js:812 disable → inactive, 851 enable → active`). `GET /api/doctors/profile` (`doctorRoutes.js:254` `auth+role doctor`) now returns `department_status`. No new route/table/trigger.

## Frontend - Modified
- **client/src/pages/DoctorDashboard.jsx:1758** — added `{doctor?.department_status === 'inactive' && <p style fef2f2/fecaca>Your department is currently disabled.</p>}` under main banner. Simple, no popup/modal/redirect/restriction. Enabled/`null` → nothing shown. Appointments/schedules/profile/auth untouched.

## Not Changed
- Appointments, schedules, profile, auth/JWT (`expiresIn 1d` unchanged), department disable/enable logic, payment (none), no new lib, no file deleted, no new trigger (reused `check_department_active_on_appointment` `schema.sql:750-777`).

## Docs - Modified
- **LATEST_CHANGES.md §9** brief entry
- **server/apiTester/doctor.http §3.1a/3.1b** added
- **LEARN_BACKEND.md** added Department Status section

---

# FILE REVIEWS - Home Page + DB Functions + Secure Booking (2026-09-24)

## Summary
Public Home at `/` with 8 sections, 2 DB functions + 1 procedure, secure booking via JWT `req.user.patient_id`, reuse existing triggers/`isSlotExpired`, simple UI, no payment/lib/file deletion.

## Database - Modified
- **database/schema.sql:777+** append:
  - `get_doctors_without_staff()` `RETURNS TABLE` — `NOT EXISTS staff_assignment ACTIVE`, filters `approved`+`suspended_until`+`department active`, no `needs_staff` column/trigger.
  - `calculate_appointment_fee(p_patient_id INT,p_doctor_id INT)` — `EXISTS completed 90d` → `followup_fee` else `new_patient_fee` (`doctor.new_patient_fee/followup_fee:89-90`).
  - `book_appointment(p_patient_id,p_doctor_id,p_schedule_id,p_hospital_id, INOUT p_appointment_id)` `PROCEDURE` — validates doctor/dept/schedule/duplicate/capacity, `INSERT pending` — keeps `isSlotExpired` in Node.

## Backend - Modified
- **server/controllers/adminController.js:200+** add `getAdminPublicContact` (`SELECT email ... LIMIT 1`) + export, **server/routes/adminRoutes.js:6+** add `GET /public-contact` public (only email).
- **server/controllers/patientController.js:1133+** add `getDoctorsWithoutStaff` (`SELECT * FROM get_doctors_without_staff()`), secure `createAppointment` (`patient_id=req.user.patient_id` 401 if no JWT, fee via `SELECT calculate_appointment_fee`) with `BEGIN/COMMIT/ROLLBACK` + `P0001` forward; export; **server/routes/patientRoutes.js:20+** import, add `GET /doctors/looking-for-staff` before `:id`, secure `POST /appointments` with `authMiddleware,role(patient)`.
- No new trigger — reuse `trg_appointment_department_check:750-777`; no payment; transactions preserved.

## Frontend - New
- **client/src/components/HomeNavbar.jsx** (40 lines) — logo + Home|Doctors|Departments + Account ▾ (Patient/Doctor/Staff/Admin) with logout if logged in; not replacing `Header.jsx`.
- **client/src/pages/Home.jsx** (120 lines) — 8 sections in order, fetches `departments` (`GET /api/departments`), `doctors` (`GET /api/patients/doctors?search&department_id`), `looking` (`GET /doctors/looking-for-staff`), `adminEmail` (`GET /admin/public-contact`), dept click scrolls to doctors, simple fetch, no lib.
- **client/src/pages/DoctorProfile.jsx** (90 lines) — `/doctors/:id` via `GET /doctors/:id` + `GET /doctors/:id/schedules` (server `isSlotExpired` filtered), `Book Appointment` checks token → `POST /appointments` with `Bearer` and `doctor_id,schedule_id` only (patient_id from JWT), reuse scheduleWindow.
- **client/src/styles/Home.css** (70 lines) — reuse `f5f7fb`, teal `075f68`, white cards, `grid auto-fill 250px`, no animation.

## Frontend - Modified
- **client/src/App.jsx:109+** import Home/DoctorProfile, add `Route "/" <Home/>`, `Route "/doctors/:id" <DoctorProfile/>`, `hideHeader` for `/` and `/doctors/*`, keep all auth routes.

## Docs - Modified
- **server/apiTester/admin.http** add `1.1b GET /public-contact`; **patient.http** add `2.12 doctors looking-for-staff` + secure `4.1/4.1b` booking with JWT; **LATEST_CHANGES.md §10**, **LEARN_BACKEND.md** Home flow.

## Not Changed
- No file deleted, no payment/Mock Gateway, no new lib, no duplicate schedule logic, existing `isSlotExpired`/`scheduleWindow` preserved, existing `Header.jsx` kept.

---

# FILE REVIEWS - Home Rebuild — Needs Staff Trigger + Nav-Only Booking (2026-09-24)

## Summary
Revised Home to use `needs_staff` trigger for newly approved doctors and make `Book Appointment` navigation-only (appointment out of scope). Kept `calculate_appointment_fee` (used by existing booking), dropped unused `book_appointment`.

## Database - Modified
- **database/schema.sql:840+** `DO $$ ALTER TABLE doctor ADD COLUMN needs_staff BOOLEAN DEFAULT FALSE`, `FUNCTION set_doctor_needs_staff()`, `TRIGGER trg_doctor_needs_staff BEFORE UPDATE OF approval_status WHEN pending→approved SET needs_staff TRUE`, `FUNCTION get_doctors_needing_staff() RETURNS TABLE WHERE needs_staff TRUE AND NOT EXISTS ACTIVE staff_assignment`, `DROP PROCEDURE book_appointment` (checked zero CALLs, keep `calculate_appointment_fee` because `patientController:591` uses it).

## Backend - Modified
- **server/controllers/patientController.js:1142** `getDoctorsWithoutStaff` now `SELECT * FROM get_doctors_needing_staff()` (fallback to old if not migrated), endpoint path unchanged `/looking-for-staff` public.
- `POST /appointments` kept secured (`auth+role patient`, `req.user.patient_id`) but not called from Home.

## Frontend - Modified
- **client/src/pages/Home.jsx** staff section → `New Doctors Looking for Staff` + `New doctors have recently joined...` + card `New Doctor`/`Staff Required` + `Register as Staff → /staff-registration`; add searchable doctor dropdown `Search or Select Doctor ▼` with `All Doctors` + filtered `Dr. name` on typing `rah`, dept filter works together.
- **client/src/pages/DoctorProfile.jsx:24** `book` now `const isPatient=!!token&&!!patient → navigate /patient-login else /patient-dashboard`, no `fetch POST`, no `patient_id`.

## Docs - Modified
- **server/apiTester/patient.http 2.12** comment to `get_doctors_needing_staff`+trigger, **LATEST_CHANGES.md §11**, **LEARN_BACKEND.md** Home Rebuild.

## Not Changed
- No file deleted, no appointment backend modified for Home task beyond staff query, no new appointment procedure/fee, no payment, no new lib, `isSlotExpired` untouched.

---

# FILE REVIEWS - Generic Staff Required Advertisement (2026-09-24)

## Summary
Fixed false advertisement caused by blind `pending→approved → needs_staff TRUE` trigger. Home now shows generic boolean banner only when true shortage exists (approved doctor with NO ACTIVE staff). No doctor details leaked.

## Database - Modified
- **database/schema.sql:928-1030** — `set_doctor_needs_staff()` now checks `NOT EXISTS ACTIVE` before setting TRUE else FALSE (prevents false ad when staff already available) + backfill `UPDATE doctor SET needs_staff` corrects legacy rows; new `sync_doctor_needs_staff()` + 3 triggers `trg_sync_needs_staff_on_insert/update/delete ON staff_assignment` keeps `needs_staff` in sync (assigned→FALSE, ended/deleted→re-check); new `is_staff_required() BOOLEAN` = `EXISTS approved active doctor with NO ACTIVE assignment` (used by Home). Existing `get_doctors_needing_staff()` kept for compat, now filters `end_date > NOW()` correctly.

## Backend - Modified
- **server/controllers/patientController.js:1142-1185** added `getStaffRequiredStatus` → `SELECT is_staff_required()` → `{staff_required: true|false}` with fallback live EXISTS query; exported. Keeps `getDoctorsWithoutStaff` (DEPRECATED compat).
- **server/routes/patientRoutes.js:20-30** added `GET /staff-required` (public, before `/looking-for-staff`) via `getStaffRequiredStatus`; existing `GET /looking-for-staff` kept but Home no longer uses.

## Frontend - Modified
- **client/src/pages/Home.jsx:8-22,51-71** replaced `looking` state + `GET /looking-for-staff` fetch with `staffRequired` boolean + `GET /staff-required`; section `New Doctors Looking for Staff` cards (leaked `full_name/department/photo`) replaced by generic conditional banner `📢 STAFF REQUIRED / Some doctors currently need available staff members / [Register as Staff → /staff-registration]` (white card, teal button, no doctor data). Uses existing route `/staff-registration`.

## ApiTester - Modified
- **server/apiTester/patient.http:90-108** `2.12` marked DEPRECATED, added `2.13 GET /staff-required` generic + `2.14` Cases A-E toggle verification (approve→GET→assign→GET).
- **api-tests.http:22-31,695-720** updated endpoint count `102→103`, counts per file, added `5.10b GET /staff-required` + `5.10c` deprecated note.

## Docs - Modified
- **LATEST_CHANGES.md §12**, **LEARN_BACKEND.md § Staff Required**, **TRIGGERS.md** added is_staff_required + 4 triggers.
- Existing appointment/payment, department status, auth unchanged.

## Verification Cases
- A assigned → `needs_staff FALSE, staff_required false, banner hidden`; B none → `TRUE/true/visible`; C later assigned → `false/hidden`; D multi one none → `true/visible`; E all have → `false/hidden`.

---

# FILE REVIEWS - Staff API Security (Patient + Staff) + Tester Update (2026-09-25)

## Summary
Proper security: **12 Staff APIs** via `router.use(authMiddleware, roleMiddleware("staff"))` after 3 public (`GET /status`, `POST /apply`, `POST /login`), staff notification ownership `req.params.id vs req.user.staff_id`, Staff complaint via `POST /api/staff/complaints` (`filed_by_id` from `req.user.staff_id`, spoof blocked), generic `POST /api/complaints` marked **DEPRECATED for Staff** (use staff endpoint). No new lib/route/file deletion, reuse existing JWT `expiresIn:"1d"`.

## Backend - Modified

- **server/routes/staffRoutes.js:218** `router.use(authMiddleware, roleMiddleware("staff"))` after public 3 — protects 12: `GET /profile:230`, `GET /my-assignment:237`, `GET /dashboard/stats:247`, `GET /appointments:262`, `GET /hospitals:273`, `GET /available-schedules:290` (`?doctor_id`), `PATCH /appointments/:id/schedule:282`, `PATCH .../approve:296`, `PATCH .../reject:301`, `GET /complaint-targets:314`, `POST /complaints:324`, `GET /complaints:334`. Public stay public: `GET /status:181`, `POST /apply:185`, `POST /login:199`, plus `GET /patients/doctors/:id/schedules`, `GET /api/learn/health`, `GET /`, `GET /api/test-db`.
  - Expected: `No token→401 No token provided` (`authMiddleware:8`), `Invalid→401 Invalid or expired token` (`32`), `Non-staff (doctor/patient)→403 Access denied` (`roleMiddleware:3`), `Valid staff→200`.

- **server/routes/patientRoutes.js:1** — 7 Patient APIs now `auth+role+own-ID`:
  - `verifyPatientOwnership` checks `String(req.user.patient_id) !== String(req.params.id || req.params.patientId) →403`
  - `GET /profile/:id:117`, `PUT /profile/:id:122`, `GET /:patientId/appointments:139`, `GET /:patientId/complaints:169` → `auth, role patient, verifyOwn`
  - `DELETE /appointments/:id:144` → `auth, role patient` + controller checks `SELECT patient_id FROM appointment WHERE id=$1` → `403` if other patient's, then `DELETE ... WHERE appointment_id=$1 AND patient_id=$2 AND status='pending'`
  - `POST /payments:154` + `POST /complaints:164` → `auth, role patient`, controllers take `patient_id=req.user.patient_id` (not body) → `401` if missing

- **server/controllers/patientController.js:703,746,1205** — `deleteAppointment` ownership check, `makePayment`/`createPatientComplaint` use `req.user.patient_id` only (ignore body `patient_id:999` spoof).

- **server/routes/notificationRoutes.js:15** — added `verifyStaffNotificationRole` symmetric to `verifyPatientNotificationRole`: `if :role==="staff" → roleMiddleware("staff")`, `if :role==="patient" → roleMiddleware("patient")`. Then `notificationController.js:15` `String(role)!==tokenRole || String(id)!==tokenId →403` enforces `req.params.id vs req.user.staff_id`. Results: `Staff own→200`, `Another staff→403`, `No/invalid→401`, `Doctor on staff/:id→403`.

- **server/routes/complaintRoutes.js:9** — generic `POST /api/complaints` marked `DEPRECATED for Staff — Staff must use POST /api/staff/complaints` (kept for backward compat patient/doctor, no staff spoof via generic). Staff path is `/api/staff/complaints` (`staffController.js:1166` `filed_by_staff_id = req.user.staff_id`).

- **server/controllers/staffController.js / notificationController.js** — no new logic, reuse existing `req.user.staff_id` checks (`staffController 371,415,540, etc.`, `notificationController 15`).

## ApiTester - Modified (no new file)

- **server/apiTester/staff.http** — **updated existing file**, kept structure/comments, replaced header with:
  ```http
  @staffToken = PASTE_VALID_STAFF_JWT_HERE
  @staffToken2 = PASTE_ANOTHER_STAFF_JWT_HERE
  @doctorToken = PASTE_VALID_DOCTOR_JWT_HERE
  @patientToken = PASTE_VALID_PATIENT_JWT_HERE
  @staffId = 1
  @otherStaffId = 2
  ```
  - Labeled sections `1. Staff Auth — PUBLIC`, `2. Profile & Assignment — PROTECTED`, `3. Appointments — PROTECTED`, `4. Complaints — PROTECTED (staff endpoint, filed_by_id from JWT, DEPRECATED generic marked)`, `5. Public Doctor Schedules — PUBLIC`, `6. Staff Notifications — PROTECTED + OWNERSHIP`, `7. Learn Health — PUBLIC`, `8. Authentication Negative Tests` — per spec.
  - For each protected 12 Staff APIs added 4 cases: `A Valid 200 Bearer {{staffToken}}`, `B No token 401`, `C Invalid 401 Bearer invalid-token`, `D Wrong role 403 Bearer {{doctorToken/patientToken}}`.
  - Notifications 5 cases: `Own 200 GET /notifications/staff/{{staffId}} Bearer {{staffToken}}`, `Another 403 GET /notifications/staff/{{otherStaffId}} Bearer {{staffToken}}`, `No 401`, `Invalid 401`, `Doctor 403`.
  - Complaint spoof covered in `4.2E` `POST /api/staff/complaints` — even if body contains `filed_by_id:999`, backend uses `req.user.staff_id`.

- **server/apiTester/patient.http** — **replaced** 8 patient APIs with secured blocks (`profile`, `appointments`, `payments`, `complaints`, `notifications`) — each `200 own` + `403 other` + `401` + `403 wrong role`, bodies without `patient_id` (JWT only). Same tester structure kept.

## Docs - Modified
- **LEARN_BACKEND.md** — appended staff security section (protected list, `401/403`, `req.user.staff_id`, notification ownership, complaint spoof, tester variables).

## Verification
- `GET /api/staff/profile` no header `401`, invalid `401`, doctor `403`, staff own `200` (all 12 same pattern)
- `GET /api/notifications/staff/1` own `200`, `2` with token `1` `403`
- `POST /api/staff/complaints` with body `filed_by_id:999` → `201` but stored `filed_by_staff_id = req.user.staff_id` (1)
- `vite build ✓` (`107 modules`)
