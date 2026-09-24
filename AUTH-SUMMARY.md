# Auth Summary — Doctoralia

> Token middleware: `server/middleware/authMiddleware.js:3` — reads `Authorization: Bearer <token>`, `jwt.verify(token, JWT_SECRET)`, sets `req.user = { doctor_id|staff_id|patient_id|admin_id, role }` (`server/.env: JWT_SECRET=doctoralia_secret_key_2026_change_this`, `expiresIn: 1d`).  
> Role guard: `server/middleware/roleMiddleware.js:1` — `roleMiddleware(requiredRole)` 403 if `req.user.role !== requiredRole`.  
> Mount points: `server/server.js:36-46` — `/api/doctors`, `/api/staff`, `/api/patients`, `/api/admin`, `/api/departments`, `/api/complaints`, `/api/learn`, `/api/notifications`, plus `GET /` and `GET /api/test-db`.

## How to Preserve & Reuse Tokens (VS Code REST Client — `api-tests.http`)

```http
@baseUrl = http://localhost:5000
@adminToken = PASTE_ADMIN_JWT_HERE
@doctorToken = PASTE_DOCTOR_JWT_HERE
@patientToken = PASTE_PATIENT_JWT_HERE
@staffToken = PASTE_STAFF_JWT_HERE
```

1. **Login** — run one of the login requests in `api-tests.http` §1 (e.g. `POST {{baseUrl}}/api/admin/login`). Success returns:
   ```json
   { "message": "Admin login successful.", "token": "eyJhbGci...", "admin": { "admin_id": 1, ... } }
   ```
   Similarly `doctorLogin` → `{ token, doctor }`, `patientLogin` → `{ token, patient }`, `staffLogin` → `{ token, staff }`.
2. **Copy** the `token` value from the response body.
3. **Paste** into the matching `@adminToken` / `@doctorToken` / `@patientToken` / `@staffToken` variable at top of `api-tests.http`.  
   Alternative using REST Client request variables (no manual copy):
   ```http
   # @name adminLogin
   POST {{baseUrl}}/api/admin/login
   Content-Type: application/json

   { "email": "sara@gmail.com", "password": "sara123" }
   ### Use captured token:
   GET {{baseUrl}}/api/admin/dashboard/stats
   Authorization: Bearer {{adminLogin.response.body.token}}
   ```
4. **Every protected request** already includes:
   ```
   Authorization: Bearer {{roleToken}}
   ```
   Missing/malformed token → `401 { "message": "No token provided" }` or `401 { "message": "Invalid or expired token" }` (`authMiddleware.js:8,32`). Wrong role → `403 { "message": "Access denied. You do not have permission." }` (`roleMiddleware.js:4`).

> **File header note:** `api-tests.http:1-18` contains a compact summary table and token flow instructions; this file is the canonical reference.

---

## Counts

- **Total endpoints: 100**
- **Protected: 61** — doctor 25, staff 12, patient 2, admin 19, department 3
- **Public: 39** — health 2, auth 8, department reads 2, complaint generic 1, learn 6, notifications 1, patient browsing/profile/appointment 17, admin register/login/status + 2 anomaly disable/enable 5, staff status/apply/login 3
- **Triggers: 6 PostgreSQL triggers** (`database/schema.sql:414-739`) — see `TRIGGERS.md`

---

## Full Endpoint Matrix

| # | Endpoint | Method | Protected | Role Required | Token Variable | Notes |
|---|----------|--------|-----------|---------------|----------------|-------|
| **0 — Health / Infra — `server/server.js`** |
| 0.1 | `/` | GET | No | — | — | `server.js:48` — `{ message: "Doctoralia backend is running" }` |
| 0.2 | `/api/test-db` | GET | No | — | — | `server.js:54` — `SELECT current_database(), CURRENT_TIMESTAMP` |
| **1 — Auth (token acquisition)** |
| 1.1 | `/api/admin/status` | GET | No | — | — | `adminRoutes.js:45` — singleton open/closed |
| 1.2 | `/api/admin/register` | POST | No | — | — | `adminController.js:10` — **singleton**: 403 after 1st admin; 409 dup email |
| 1.3 | `/api/admin/login` | POST | No | — | — (produces `{{adminToken}}`) | `adminController.js:90` — alias `sara` → `sara@gmail.com`; returns `token + admin`; **use this to obtain `{{adminToken}}`** |
| 1.4 | `/api/doctors/apply` | POST | No | — | — | `doctorRoutes.js:225` — **⭐ Doctor Registration — Public** — `multipart/profile_photo` 5MB; dept FK check; 409 dup email/regNo |
| 1.5 | `/api/doctors/login` | POST | No | — | — (produces `{{doctorToken}}`) | `doctorController.js:190` — pending/rejected 403, clears expired suspension; returns `token + doctor`; **use for `{{doctorToken}}`** |
| 1.6 | `/api/patients/register` | POST | No | — | — | `patientController.js:5` — all 8 fields required; fires `trg_patient_registration` |
| 1.7 | `/api/patients/login` | POST | No | — | — (produces `{{patientToken}}`) | `patientController.js:96` — clears expired suspension; returns `token + patient`; **use for `{{patientToken}}`** |
| 1.8 | `/api/staff/status` | GET | No | — | — | `staffRoutes.js:181` — `{ closed:false, count }` always open |
| 1.9 | `/api/staff/apply` | POST | No | — | — | `staffRoutes.js:185` — `multipart/profile_pic` 5MB; pending |
| 1.10 | `/api/staff/login` | POST | No | — | — (produces `{{staffToken}}`) | `staffController.js` — pending/rejected 403, cleans assignments; returns `token + staff`; **use for `{{staffToken}}`** |
| **2 — Department — `server/routes/departmentRoutes.js` (`/api/departments`)** |
| 2.1 | `/api/departments` | GET | No | — | — | `departmentController.js:4` — `?search=` optional LIKE; **public read for Doctor Registration dropdown** |
| 2.2 | `/api/departments/:id` | GET | No | — | — | `departmentController.js:31` — 404 if not found |
| 2.3 | `/api/departments` | POST | **Yes 🔒** | `admin` | `{{adminToken}}` | `auth+role(admin)` — `{ department_name (required), description }` — 409 dup LOWER |
| 2.4 | `/api/departments/:id` | PUT | **Yes 🔒** | `admin` | `{{adminToken}}` | `auth+role(admin)` — COALESCE semantics |
| 2.5 | `/api/departments/:id` | DELETE | **Yes 🔒** | `admin` | `{{adminToken}}` | `auth+role(admin)` — 409 if doctors assigned |
| **3 — Doctor Protected — `server/routes/doctorRoutes.js:244` `router.use(auth, role(doctor))`** |
| 3.1 | `/api/doctors/profile` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:428` — `getActiveDoctor` check; joins department |
| 3.2 | `/api/doctors/dashboard/stats` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:502` — confirmed/completed appts, prescriptions, referrals |
| 3.3 | `/api/doctors/appointments` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:620` — `?schedule_id=` optional ownership check |
| 3.4 | `/api/doctors/medicines` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:733` — `SELECT * FROM medicine ORDER BY name` |
| 3.5 | `/api/doctors/tests` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:791` — `SELECT * FROM test` |
| 3.6 | `/api/doctors/prescriptions` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:846` — `confirmed` only; transactional; fires `trg_prescription_notification` |
| 3.7 | `/api/doctors/referral-doctors` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:1233` — approved not suspended, excludes self |
| 3.8 | `/api/doctors/referrals` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:1307` — confirmed/completed only; fires `trg_referral_notification` |
| 3.9 | `/api/doctors/referrals/sent` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:1623` |
| 3.10 | `/api/doctors/referrals/received` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:1725` |
| 3.11 | `/api/doctors/complaint-targets` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:1834` — patients of doctor + approved staff |
| 3.12 | `/api/doctors/complaints` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js:1929` — `against_type patient|staff`; fires `trg_complaint_admin` |
| 3.13 | `/api/doctors/complaints` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js` — `WHERE filed_by_doctor_id = self` |
| 3.14 | `/api/doctors/hospitals` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorScheduleController.js` — `hospital_id, hospital_name, city, address` |
| 3.15 | `/api/doctors/schedules/window` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `scheduleWindow.js:78` — `{ targetDate, currentDate, isOpen, window:"12:55-18:00" }` |
| 3.16 | `/api/doctors/schedules` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorScheduleController.js:76` — targetDate..Dec31, enriched is_expired/is_editable |
| 3.17 | `/api/doctors/schedules` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorScheduleController.js` — window 12:55-18:00 Asia/Dhaka; date tomorrow..Dec31; overlap/duplicate/capacity |
| 3.18 | `/api/doctors/schedules/:id` | PUT | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorScheduleController.js` — window+ownership+not expired/WORKING |
| 3.19 | `/api/doctors/schedules/:id` | DELETE | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorScheduleController.js` — no scheduled/confirmed appts; cascade |
| 3.20 | `/api/doctors/schedules/:id/availability` | PATCH | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorScheduleController.js` — `status AVAILABLE|WORKING|UNAVAILABLE` |
| 3.21 | `/api/doctors/my-staff` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js` — primary+temporary |
| 3.22 | `/api/doctors/available-staff` | GET | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `staffAssignmentHelper.js:35` — approved not suspended, no ACTIVE assignment |
| 3.23 | `/api/doctors/assign-staff` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorController.js` — PRIMARY vs TEMPORARY logic |
| 3.24 | `/api/doctors/add-medicine` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorRoutes.js:402` — **redundant** `authMiddleware` (already protected) |
| 3.25 | `/api/doctors/add-test` | POST | **Yes 🔒** | `doctor` | `{{doctorToken}}` | `doctorRoutes.js:408` — redundant auth |
| **4 — Staff — `server/routes/staffRoutes.js`** |
| 4.1 | `/api/staff/profile` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:230` |
| 4.2 | `/api/staff/my-assignment` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:234` — ACTIVE assignment join doctor |
| 4.3 | `/api/staff/dashboard/stats` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:247` — via assigned doctorId |
| 4.4 | `/api/staff/appointments` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:262` — requires assignment else empty |
| 4.5 | `/api/staff/hospitals` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:272` |
| 4.6 | `/api/staff/appointments/:id/schedule` | PATCH | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:282` — assign hospital + existing slot; FOR UPDATE + capacity |
| 4.7 | `/api/staff/available-schedules` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:290` — `?doctor_id` required, verifies assignment |
| 4.8 | `/api/staff/appointments/:id/approve` | PATCH | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:296` — pending→scheduled + capacity |
| 4.9 | `/api/staff/appointments/:id/reject` | PATCH | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:300` — `cancelled_by_staff_id` |
| 4.10 | `/api/staff/complaint-targets` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:314` |
| 4.11 | `/api/staff/complaints` | POST | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:323` — `against_type patient|doctor` |
| 4.12 | `/api/staff/complaints` | GET | **Yes 🔒** | `staff` | `{{staffToken}}` | `staffController.js:336` |
| **5 — Patient — `server/routes/patientRoutes.js`** |
| 5.1 | `/api/patients/doctors` | GET | No | — | — | `patientController.js:209` — `?department_id&search` approved not suspended |
| 5.2 | `/api/patients/doctors/available-by-date` | GET | No | — | — | `patientController.js:371` — `?date` required, `?department_id` optional |
| 5.3 | `/api/patients/doctors/:id/schedules/by-date` | GET | No | — | — | `patientController.js:438` — `?date` required, AVAILABLE |
| 5.4 | `/api/patients/departments` | GET | No | — | — | `patientController.js:277` |
| 5.5 | `/api/patients/doctors/:id` | GET | No | — | — | `patientController.js:318` — 404 if not approved |
| 5.6 | `/api/patients/doctors/:id/schedules` | GET | No | — | — | `patientController.js:300` — filtered `!isSlotExpired` |
| 5.7 | `/api/patients/staff` | GET | No | — | — | `patientController.js:1093` |
| 5.8 | `/api/patients/profile/:id` | GET | No (⚠️ should be 🔒) | — | — (no token check) | `patientController.js:984` — **security: any caller can fetch any patient by ID** |
| 5.9 | `/api/patients/profile/:id` | PUT | No (⚠️ should be 🔒) | — | — | `patientController.js:1025` — **no auth, any caller can overwrite profile** |
| 5.10 | `/api/patients/appointments` | POST | No (⚠️ should be 🔒) | — | — | `patientController.js:466` — validates internally, capacity/duplicate/expired |
| 5.11 | `/api/patients/:patientId/appointments` | GET | No (⚠️ should be 🔒) | — | — | `patientController.js:605` — lists appointments for any patientId |
| 5.12 | `/api/patients/appointments/:id` | DELETE | No (⚠️ should be 🔒) | — | — | `patientController.js:688` — deletes any pending appointment by ID |
| 5.13 | `/api/patients/payments` | POST | No (⚠️ should be 🔒) | — | — | `patientController.js:721` — checks `patient_id == appointment.patient_id` internally |
| 5.14 | `/api/patients/complaints` | POST | No (⚠️ should be 🔒) | — | — | `patientController.js:1126` — checks suspended |
| 5.15 | `/api/patients/:patientId/complaints` | GET | No (⚠️ should be 🔒) | — | — | `patientController.js:1256` |
| 5.16 | `/api/patients/prescriptions` | GET | **Yes 🔒** | `patient` | `{{patientToken}}` | `patientController.js:1324` — `auth+role(patient)`, `req.user.patient_id` |
| 5.17 | `/api/patients/referrals` | GET | **Yes 🔒** | `patient` | `{{patientToken}}` | `patientController.js:1499` — `auth+role(patient)` |
| **6 — Admin Protected — `server/routes/adminRoutes.js`** |
| 6.1 | `/api/admin/profile/:id` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:165` |
| 6.2 | `/api/admin/dashboard/stats` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:205` — pending doctors/staff, approved doctors, departments |
| 6.3 | `/api/admin/doctors/pending` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:252` |
| 6.4 | `/api/admin/doctors/:id/approve` | PATCH | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:295` — uses `req.user.admin_id` |
| 6.5 | `/api/admin/doctors/:id/reject` | PATCH | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:349` |
| 6.6 | `/api/admin/staff/pending` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:403` |
| 6.7 | `/api/admin/staff/:id/approve` | PATCH | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:437` |
| 6.8 | `/api/admin/staff/:id/reject` | PATCH | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:490` |
| 6.9 | `/api/admin/staff/approved` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:1260` |
| 6.10 | `/api/admin/staff/suspended` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:1290` |
| 6.11 | `/api/admin/staff/available` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:1308` |
| 6.12 | `/api/admin/history/doctors/:adminId` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:542` |
| 6.13 | `/api/admin/history/staff/:adminId` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:582` |
| 6.14 | `/api/admin/complaints` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:895` |
| 6.15 | `/api/admin/complaints/:id/suspend` | PATCH | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:1057` — `NOW()+5 days`, status `resolved` |
| 6.16 | `/api/admin/complaints/:id/dismiss` | PATCH | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:1181` |
| 6.17 | `/api/admin/departments` | GET | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:621` — `?search=` |
| 6.18 | `/api/admin/departments` | POST | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:650` — 409 dup |
| 6.19 | `/api/admin/departments/:id` | PUT | **Yes 🔒** | `admin` | `{{adminToken}}` | `adminController.js:704` |
| 6.20 | `/api/admin/departments/:id/disable` | PUT | **No (⚠️ anomaly)** | — (should be `admin`) | — (no token) | `adminRoutes.js:103` — **`adminController.disableDepartment`** mounted **without** `authMiddleware` — any caller can disable |
| 6.21 | `/api/admin/departments/:id/enable` | PUT | **No (⚠️ anomaly)** | — (should be `admin`) | — (no token) | `adminRoutes.js:108` — same — any caller can enable |
| **7 — Complaint Generic — `server/routes/complaintRoutes.js:9` (`/api/complaints`)** |
| 7.1 | `/api/complaints` | POST | No | — | — | `complaintController.js:??` — generic; `filed_by_type`/`against_type` patient|doctor|staff |
| **8 — Notifications — `server/routes/notificationRoutes.js:13` (`/api/notifications`)** |
| 8.1 | `/api/notifications/:role/:id` | GET | No (⚠️ should be 🔒) | — | — | `notificationController.js:6` — `SELECT * WHERE receiver_role=$1 AND receiver_id=$2`; **anyone can read anyone's notifications** |
| **9 — Learn — `server/routes/learnRoutes.js:6` (`/api/learn`)** |
| 9.1 | `/api/learn/health` | GET | No | — | — | `learnController.js:??` — `{ message, time, env }` |
| 9.2 | `/api/learn/select` | GET | No | — | — | `learnController.js` — `?search=` |
| 9.3 | `/api/learn/insert` | POST | No | — | — | `learnController.js` — `{ department_name, description }` |
| 9.4 | `/api/learn/update/:id` | PUT | No | — | — | `learnController.js` — `COALESCE` |
| 9.5 | `/api/learn/delete/:id` | DELETE | No | — | — | `learnController.js` — 409 if doctors assigned |
| 9.6 | `/api/learn/transaction` | POST | No | — | — | `learnController.js:78` — demo `BEGIN/COMMIT/ROLLBACK` |

---

## Security Notes / Recommendations

- **Critical — public writes without ownership:** `PUT /api/patients/profile/:id`, `DELETE /api/patients/appointments/:id`, `POST /api/patients/appointments` / `payments` / `complaints`, and `GET /api/notifications/:role/:id` expose data without binding to `req.user`. Recommend adding `authMiddleware + roleMiddleware("patient")` and comparing `req.user.patient_id` to `:id`/`patient_id` in body — as already done for `GET /prescriptions` and `GET /referrals`.
- **High — admin disable/enable missing auth:** `PUT /api/admin/departments/:id/disable|enable` in `server/routes/adminRoutes.js:103,108` are public. Fix: `router.put("/departments/:id/disable", authMiddleware, roleMiddleware("admin"), adminController.disableDepartment)`.
- **Medium — redundant auth:** `POST /api/doctors/add-medicine|add-test` (`doctorRoutes.js:402,408`) declare `authMiddleware` again despite `router.use(auth, role(doctor))` at `doctorRoutes.js:244` — harmless but noisy.

## Frontend Auth Guards (new — no backend route change, JWT still authoritative)

- **Auto logout on inactivity — `client/src/hooks/useInactivityLogout.js` (5 min, `5*60*1000`):** Used in all dashboards (`AdminDashboard.jsx:18`, `DoctorDashboard.jsx:6`, `StaffDashboard.jsx:4`, `PatientDashboard.jsx:4`). Listens `mousemove,mousedown,click,keydown,scroll,touchstart` (throttled 3s for mousemove) and resets `setTimeout(logout, timeout)`. On timeout: `removeItem token+admin+doctor+staff+patient`, `setItem inactive_logout=1`, `window.location.replace(login)`. Login pages (`AdminLogin.jsx:13`, `DoctorLogin.jsx:13`, `PatientLogin.jsx:13`, `StaffLogin.jsx:13`) read `inactive_logout` in `useEffect` and show banner `"You have been logged out due to inactivity."` then clear it. Backend `authMiddleware.js:24 jwt.verify` with `expiresIn 1d` remains the only security check — frontend timer is UX only, every `authFetch` still sends `Bearer {{token}}` and `401` still hard-logouts.
- **Prevent login when already logged in — all 4 login pages:** Early check `!!localStorage.getItem("token") && (!!admin||!!doctor||!!staff||!!patient)` → render instead of form: `"You are already logged in. Please logout first."` + `<button>Logout</button>` that clears all keys + `reload()`. After logout condition becomes false and form renders normally. Prevents session stacking on shared `token` key.
- **Protected routes — `client/src/components/ProtectedRoute.jsx` + `client/src/App.jsx:1,151,169,187,205`:** `BrowserRouter` now wraps dashboards: `/admin-dashboard` `allowedRoles ["admin"]`, `/doctor-dashboard` `["doctor"]`, `/staff-dashboard` `["staff"]`, `/patient-dashboard` `["patient"]`. Checks `token` + role storage; if missing → `<Navigate to={roleLogin} replace>`; wrong role → redirect to own login. Public pages (`/`, `/login`, `/doctor-registration`, `/patient-registration`, `GET /api/departments`, `GET /api/patients/doctors`) remain unwrapped and public. `Appointment booking` flow still requires auth — `PatientDashboard.jsx` `bookAppointmentWithSchedule` checks `localStorage patient` and backend validates `patient_id` internally; staff `approve` still requires assignment.
- **Counts unchanged:** Still **100 endpoints (61 Protected / 39 Public)** — no new API route added, so `api-tests.http` and `server/apiTester/*.http` keep same counts; tester files now contain comment blocks `=== Frontend Auth (no API) ===` documenting manual verification for inactivity/already-logged-in.
- **CSE216 checklist:** Still custom JWT (no third-party service), no new triggers/functions/procedures/libraries, explicit `BEGIN/COMMIT/ROLLBACK` transactions preserved (`doctorController.js:898`, `patientController.js:749`, `staffController.js:748`), `pg` `FOR UPDATE` locking preserved.

---

## Quick Smoke Order (token flow end-to-end)

1. `1.1` `GET /api/admin/status` → `1.3` login admin → paste `{{adminToken}}`
2. `2.3` create `Nephrology` (🔒 admin) → `2.1` list to get `department_id`
3. `1.4` doctor apply (public, needs valid `department_id`) → `6.3` pending doctors → `6.4` approve (🔒 admin)
4. `1.5` doctor login → paste `{{doctorToken}}` → `3.15` window → `3.17` create schedule (12:55-18:00 Asia/Dhaka, `available_date` tomorrow..Dec31) → `3.16` list
5. `1.6` patient register → `1.7` login → paste `{{patientToken}}`
6. `5.10` create appointment (needs `patient_id`, `doctor_id`, `schedule_id`) → `4.6-4.8` staff approves (🔒 staff) → `5.13` payment → `3.6` prescription (🔒 doctor)
7. `8.1` check `GET /api/notifications/patient/1` and `/admin/1` for trigger-generated notifications
