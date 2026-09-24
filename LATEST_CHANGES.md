# Latest Changes — Schedule Dropdown + Window 12:55 PM–6:00 PM Next Day

**Date:** 2026-09-11 (updated for 12:55 PM–6:00 PM window)
**Scope:** Doctor Panel — My Schedules (Fix/Edit) only. No new page, no Appointment List dropdown. Window now 12:55 PM–6:00 PM Asia/Dhaka for tomorrow.

---

## 1. What Changed (Summary)

Added a **Schedule dropdown** to the **existing Doctor Schedule Fix/Edit section** (`DoctorDashboard.jsx` — `section === "schedules"`).

- Dropdown is populated from `GET /api/doctors/schedules` — **authenticated doctor only** (`Authorization: Bearer <token>` → `req.user.doctor_id`, scoped by `JOIN doctor_schedule WHERE doctor_id = $1`).
- Doctor selects an existing schedule → form pre-fills → doctor clicks **Fix/Edit Schedule**.
- The **schedule-fixing time-window restriction applies to this dropdown Fix/Edit action only** — the Save/Update button is disabled when the window is closed, and the server still enforces `403` (`WINDOW_CLOSED` / `Schedule fixing time is over.`).

Constraints obeyed:
- **Did NOT create a separate Schedule List page** — existing tomorrow/history grids remain as before, no new route.
- **Did NOT add a schedule dropdown to the Appointment List** (`section === "appointments"` untouched).

---

## 2. Files Modified

### `Moriom_code/client/src/pages/DoctorDashboard.jsx`

| Area | Lines | Change |
|------|-------|--------|
| State | ~184–218 | Added `const [selectedScheduleId, setSelectedScheduleId] = useState("")` and handler `handleScheduleDropdownChange(e)` — finds `schedules.find(schedule_id === val)` and calls `startEditSchedule(s)`. |
| `startEditSchedule()` | ~420 | Now also syncs `setSelectedScheduleId(String(schedule_id))`. |
| New helper | ~430 | `clearScheduleSelection()` resets `selectedScheduleId`, `editingScheduleId`, `editForm`. |
| `submitEditSchedule()` | ~450 | On `response.ok` clears `selectedScheduleId` as well as `editingScheduleId`, then `loadSchedules()`. |
| `deleteSchedule()` | ~474 | If deleted `scheduleId === selectedScheduleId`, clears selection. |
| JSX `section==="schedules"` | ~1878–1955 | Inserted **dropdown panel** (white, `border:1px solid #e5e7eb`) before the Create Slot form, plus conditional **Fix/Edit Selected Schedule panel** (`#ecfdf5`) shown only when `selectedScheduleId && editingScheduleId`. |

**Dropdown panel (lines ~1878–1902):**
```jsx
<select value={selectedScheduleId} onChange={handleScheduleDropdownChange}>
  <option value="">-- Select Existing Schedule --</option>
  {schedules.map(s => (
    <option key={s.schedule_id} value={s.schedule_id}>
      #{s.schedule_id} {date} {start}-{end} @ {hospital} [{computed_status}]
    </option>
  ))}
</select>
```
Shows helper text + window open/closed badge:
- `schedules.length===0` → "No schedules yet — create one below when window is open."
- `selectedScheduleId && !windowInfo?.isOpen` → "Window CLOSED (12:01–03:00 only) — Fix/Edit blocked for this action."
- `selectedScheduleId && windowInfo?.isOpen` → "Window OPEN — you can fix/edit selected schedule."

**Fix/Edit Selected panel (lines ~1904–1955):**
- Start/End HH:MM split selects (`HOURS`/`MINUTES`, `parseHHMM`, `updateEditTime`), Hospital `<select>` from `hospitals`.
- Button: `<button onClick={()=>submitEditSchedule(editingScheduleId)} disabled={!windowInfo?.isOpen}>` → `Fix/Edit Schedule` when open, `Window Closed` when disabled. `Clear` calls `clearScheduleSelection`.

Window gated **only for this dropdown action** on frontend; server still enforces for all mutating endpoints (`assertScheduleWindow` → `403` with `code:"WINDOW_CLOSED"`).

### `Lvl_2_term_1_Doctoralia/client/src/pages/DoctorDashboard.jsx`

| Area | Lines | Change |
|------|-------|--------|
| State/handler | ~58 | Added `handleScheduleDropdownChange(e)` — if empty, resets `editingId`+`form`; else `schedules.find(...)` → `startEdit(s)`. |
| JSX `schedule-form-section` | ~154 | Inserted dropdown panel **inside** the existing Fix/Edit section, before `<form>`, with `value={editingId ? String(editingId) : ""}` and same option mapping. Helper: "Fix/Edit via dropdown — 15:00–18:00 (Asia/Dhaka) window applies to this action only." |

---

## 3. Reused Existing Backend (No Backend Changes)

- `Moriom_code/server/routes/doctorRoutes.js:376-388` — `GET /hospitals`, `GET /schedules/window`, `GET /schedules`, `POST /schedules`, `PUT /schedules/:id`, `DELETE`, `PATCH /availability` (JWT `authMiddleware + roleMiddleware("doctor")`).
- `Moriom_code/server/controllers/doctorScheduleController.js:74 getMySchedules`, `135 createSchedule`, `228 updateSchedule` — already scoped to `req.user.doctor_id`, window via `server/utils/scheduleWindow.js:65 isWithinScheduleWindow`, `98 assertScheduleWindow`.
- `Lvl_2_term_1_Doctoralia/server/routes/doctorRoutes.js:67-74`, `server/controllers/scheduleController.js:98 getMySchedules`, `28 createSchedule` — scoped to `req.doctor` (`x-doctor-id`), window `server/utils/time.js:47 isInsideFixingWindow` (15:00–18:00 same-date).
- `GET /schedules` already returns only the doctor's own rows (`JOIN doctor_schedule WHERE doctor_id=$1`) — dropdown respects ownership.

No new API, no DB query change.

---

## 4. What Did NOT Change

- **No new file / page** created (no `/schedules/list` route, no `ScheduleList.jsx`).
- **Appointment List** (`section==="appointments"` in Moriom_code, `HomePage.jsx` etc.) — no schedule `<select>` added.
- **Database schema** — unchanged. `schema_modification.txt` — no entry needed. `erd_guide.txt` — no ERD change (still `doctor ← doctor_schedule → schedule → hospital`).
- **Window logic** — unchanged. Still `Asia/Dhaka`, `00:01–03:00 inclusive` for tomorrow (Moriom_code) and `15:00–18:00` same-date (Lvl_2). Only the frontend disable for the dropdown Fix/Edit button is newly tied to `windowInfo.isOpen`.

---

## 5. How To Test

1. Login as doctor → **My Schedules**.
2. Verify dropdown shows **your** schedules (check `GET /api/doctors/schedules` in Network → only `doctor_id` matches).
3. Select a schedule → form pre-fills Date/Time/Hospital → edit values.
4. **Window closed** (outside 00:01–03:00 or 15:00–18:00): button shows `Window Closed`, is `disabled`, hover shows "Fix/Edit allowed only …". Submit via curl still gets `403 { "message": "Doctor schedules for the following day can only be managed between 12:01 AM and 3:00 AM.", "code":"WINDOW_CLOSED" }` (Moriom) or `403 { "message":"Schedule fixing time is over." }` (Lvl_2).
5. **Window open**: button enabled → `PUT /schedules/:id` succeeds → `200 { "message":"Schedule updated successfully." }` (Moriom) / `200 { "message":"Schedule fixed successfully." }` (Lvl_2) → `GET /schedules` refresh → dropdown updated.
6. Confirm: `My Appointments` has no schedule dropdown; no new page in sidebar.

---

## 6. Notes / Next Steps

- If you want **only** the dropdown action window-gated (and allow Create/Delete/Availability toggle outside window), remove `assertScheduleWindow` from `deleteSchedule` / `updateAvailability` in `doctorScheduleController.js` — currently they are still window-gated server-side.
- `FILE_REVIEWS.md` / `LEARN_BACKEND.md` not updated — this is a UI-only change on top of existing schedule window design.

---

## 7. Window Update — 12:55 PM to 6:00 PM for Next Day (2026-09-11)

Changed window from `00:01-03:00` (Moriom) / `15:00-18:00 same-date` (Lvl2) to `12:55 PM-6:00 PM Asia/Dhaka for tomorrow`.

Backend:
- `Moriom_code/server/utils/scheduleWindow.js:5` WINDOW_START_MIN=775 (12*60+55), WINDOW_END_MIN=1080 (18*60), window="12:55-18:00", messages updated, isWithinScheduleWindow uses 775-1080 inclusive, assertScheduleWindow throws "between 12:55 PM and 6:00 PM".
- `Lvl_2_term_1_Doctoralia/server/utils/time.js:47` FIX_START_MIN=775, FIX_END_MIN=1080, added getTomorrowDateString() (Dhaka +1 day), isInsideFixingWindow now checks availableDateStr === tomorrowStr and mins >=775 && mins <=1080, exported getTomorrowDateString.

Frontend:
- `Moriom_code/client/src/pages/DoctorDashboard.jsx:1864-2063` all labels: "12:01 AM-3:00 AM"/"00:01-03:00" -> "12:55 PM-6:00 PM"/"12:55-18:00", titles/badges updated, schedule section comment updated.
- `Lvl_2_term_1_Doctoralia/client/src/pages/DoctorDashboard.jsx:164-223` window-note -> "next day only between 12:55 PM-6:00 PM", dropdown helpers updated, empty-state text updated.

Behavior: Outside 12:55-18:00 Dhaka on day before available_date, POST/PUT/DELETE return 403 (WINDOW_CLOSED / Schedule fixing time is over). GET /schedules/window now returns window:"12:55-18:00". Requires server restart.

No schema/ERD change.

## References

- `Moriom_code/client/src/pages/DoctorDashboard.jsx:184, 420, 450, 1878, 1864`
- `Moriom_code/server/utils/scheduleWindow.js:5`
- `Moriom_code/server/controllers/doctorScheduleController.js:74, 135, 228`
- `Moriom_code/server/routes/doctorRoutes.js:376`
- `Lvl_2_term_1_Doctoralia/client/src/pages/DoctorDashboard.jsx:58, 154, 164`
- `Lvl_2_term_1_Doctoralia/server/utils/time.js:47`

## 8. Next-Day Only Icon Dropdown + Auto-Clear History (2026-09-11)

Requested: No history read; icon dropdown in schedule fixing date for next-day schedules only; previous days auto-clear.

Backend (next-day only, hide previous):
- \Moriom_code/server/controllers/doctorScheduleController.js:84\ getMySchedules now \WHERE ds.doctor_id=\ AND s.available_date=\ with \ = windowForFilter.targetDate\ (getScheduleWindowStatus tomorrow). Comment Auto-clear: only next-day returned. Previous days are hidden (not hard-deleted).
- \Lvl_2_term_1_Doctoralia/server/controllers/scheduleController.js:102\ getMySchedules now \WHERE ... AND s.available_date=\ with \	omorrowStr = getTomorrowDateString(getDhakaNow())\. Same auto-clear comment. Exported getTomorrowDateString from utils/time.js.

Frontend Moriom_code:
- \client/src/pages/DoctorDashboard.jsx:190\ added \showNextDayDropdown\ state + \handleNextDayIconSelect(s)\.
- \Create Slot\ Target Date row now has icon button 📅 ▾ (aria-expanded, toggle) with absolute dropdown listing \schedules\ (already next-day only) — click selects via startEditSchedule and closes. Badge next-day only, auto-clear note.
- Removed history: deleted \const history = ...\ and entire \<h2>History - Read Only\ grid (2082-2104). Replaced \editable/history\ split with extDaySchedules = schedules\ and updated header text to note previous days auto-cleared and to use 📅 ▾ icon. Large standalone Select Schedule dropdown panel retained (now also next-day only) plus Fix/Edit Selected panel.
- History check: \History - Read Only\ no longer present.

Frontend Lvl2:
- Added \showDateIconDropdown\ state + \handleDateIconSelect(s)\.
- Available Date label now has 📅 ▾ icon button with absolute dropdown (next-day only, auto-clear note) — same selection via startEdit.
- Schedule list section header changed to My Schedules — Next Day Only, Show Next-Day List, helper note about auto-clear and icon.

Verification: \📅 ▾\ present in both frontends, history removed, backends filter next-day, appointments untouched.

---

## 9. Doctor Dashboard — Department Disabled Message (2026-09-24)

**Requirement:** When doctor logs into Doctor Dashboard, if assigned department is disabled (`status='inactive'`), show only `"Your department is currently disabled."`.

**Backend (minimal):**
- `server/controllers/doctorController.js:466-468` `getDoctorProfile` — added `dep.status AS department_status` to existing `LEFT JOIN department` SELECT. Reuses `department.status` (`database/schema.sql:18` `active`/`inactive`) and existing `GET /api/doctors/profile` (`authMiddleware+roleMiddleware("doctor")`). No new route/table/trigger/procedure, no payment change.

**Frontend (minimal):**
- `client/src/pages/DoctorDashboard.jsx:1758` — added `{doctor?.department_status === 'inactive' && <p>Your department is currently disabled.</p>}` right under `doctor-main` banner. Simple inline style `fef2f2/fecaca/991b1b`. When `active`/`null` shows nothing. No redirect/popup/button/restriction; dashboard otherwise unchanged.

**Trigger reused:** `database/schema.sql:750-777` `check_department_active_on_appointment` (`trg_appointment_department_check`) — existing, not modified/recreated. This task only displays message, not blocks.

**What did NOT change:** Appointments, schedules, profile, auth/JWT (`expiresIn 1d`), department disable/enable logic (`adminController.js:812/851`), no new library, no file deleted, no unrelated API.

---

## 10. Home Page + DB Functions + Secure Booking (2026-09-24)

**Home public (`/`):** New `Home.jsx` + `HomeNavbar.jsx` + `Home.css` + `DoctorProfile.jsx` (`/doctors/:id`). Navbar `Doctoralia | Home | Doctors | Departments | Account ▾ (Patient/Doctor/Staff/Admin)` via new `HomeNavbar.jsx` (keeps `Header.jsx` for other pages). 8 sections in order: Navbar, Doctor ad → `Link /doctor-registration`, Doctors Looking for Staff (fetch `GET /api/patients/doctors/looking-for-staff` → `get_doctors_without_staff()`), Find Your Doctor (search + dept filter via `GET /api/patients/doctors?search=&department_id=` + `GET /api/departments`), Browse by Department (fetch departments, click filters doctors), Why Doctoralia static, Emergency Contact (fetch `GET /api/admin/public-contact` → `{email}` only, fallback `sara@gmail.com`), Footer. Simple student UI, no lib, reuse `doctor-card` styles.

**DB (append `database/schema.sql:777+`):**
- `get_doctors_without_staff()` `RETURNS TABLE (doctor_id, full_name, department_name, profile_photo, qualification, specification)` — `WHERE approval_status='approved' AND suspended_until OK AND dep status active AND NOT EXISTS (SELECT 1 FROM staff_assignment WHERE doctor_id=d.doctor_id AND status='ACTIVE')` — no `needs_staff` column/trigger.
- `calculate_appointment_fee(p_patient_id,p_doctor_id)` `RETURNS NUMERIC` — `EXISTS completed 90d` → `followup_fee` else `new_patient_fee` (uses `doctor.new_patient_fee/followup_fee:89-90`, `appointment_status='completed'`).
- `book_appointment(p_patient_id,p_doctor_id,p_schedule_id,p_hospital_id, INOUT p_appointment_id)` `PROCEDURE` — validates doctor active, dept active (via `LEFT JOIN department`), schedule `AVAILABLE`, duplicate, capacity vs `max_patient_num`, then `INSERT pending` — keeps `isSlotExpired`/`assertTargetDateInSameYear` in `utils/scheduleWindow.js` (authority Node), no payment.

**Backend:** `adminController.getAdminPublicContact` (`SELECT email FROM admin LIMIT 1`) + route `GET /api/admin/public-contact` public (no phone/password); `patientController.getDoctorsWithoutStaff` (`SELECT * FROM get_doctors_without_staff()`) + route `GET /api/patients/doctors/looking-for-staff` public (before `:id`); secure `POST /api/patients/appointments` with `authMiddleware,role(patient)` + `patient_id=req.user.patient_id` (not body) + fee via `SELECT calculate_appointment_fee($1,$2)` before COMMIT; keeps `BEGIN/COMMIT/ROLLBACK` and `P0001` dept trigger reuse (`trg_appointment_department_check:750-777`). No new trigger, no payment.

**Frontend auth:** Browsing public, booking protected via `Authorization Bearer`; `DoctorProfile.jsx` reuses `GET /api/patients/doctors/:id` + `GET /doctors/:id/schedules` (`isSlotExpired` filtered server) and secured booking.

**What NOT changed:** Existing `Header.jsx` kept (Home uses own navbar), no file deleted, no payment/Mock Gateway, no new lib, no duplicate schedule logic, existing triggers preserved.

---

## 11. Home Rebuild — Needs Staff Trigger + Nav-Only Booking (2026-09-24)

**Appointment out of scope:** Home `Book Appointment` now navigation-only — no `book_appointment`/`calculate_appointment_fee` creation, no `POST /appointments` call from Home. Existing `POST /appointments` stays secured (`auth+role patient`, `req.user.patient_id`) but Home does not use it. `book_appointment` procedure dropped (was unused, zero CALLs); `calculate_appointment_fee` kept (used by existing appointment fee `patientController:591`).

**DB:**
- `doctor` add `needs_staff BOOLEAN DEFAULT FALSE` (`DO $$ IF NOT EXISTS`).
- Trigger `trg_doctor_needs_staff` `BEFORE UPDATE OF approval_status ON doctor WHEN pending→approved` → `set_doctor_needs_staff()` sets `NEW.needs_staff=TRUE`.
- Function `get_doctors_needing_staff()` `RETURNS TABLE` — `WHERE needs_staff=TRUE AND approved AND suspended OK AND dept active AND NOT EXISTS ACTIVE staff_assignment` → Home `GET /looking-for-staff` now uses this.

**Backend:** `patientController.getDoctorsWithoutStaff` now `SELECT * FROM get_doctors_needing_staff()` (fallback to old if not migrated), endpoint path unchanged `/looking-for-staff` public.

**Frontend:**
- `Home.jsx` staff section title → `New Doctors Looking for Staff`, text `New doctors have recently joined...`, card shows `New Doctor` + `Staff Required` + `Register as Staff → /staff-registration`; find doctor adds searchable dropdown `Search or Select Doctor ▼` with `All Doctors` + filtered `Dr. name` on typing `rah`, dept dropdown + search work together.
- `DoctorProfile.jsx` `Book Appointment` → `if !patient JWT → navigate /patient-login else navigate /patient-dashboard`, no API, no `patient_id`, no `POST`.

**What NOT changed:** Appointment backend (`createAppointment` still secured, `isSlotExpired` untouched `scheduleWindow:183`), no new appointment trigger/procedure/fee, no file deleted, no new lib.

---

## 12. Generic Staff Required Advertisement — Fix False Ads (2026-09-24)

**Problem:** Blind `pending→approved → needs_staff TRUE` created false ad even when staff immediately available and assigned.

**Fix:**
- DB: `set_doctor_needs_staff()` now conditional `NOT EXISTS ACTIVE` else FALSE + backfill; `sync_doctor_needs_staff()` + 3 `AFTER INSERT/UPDATE/DELETE ON staff_assignment` keeps `needs_staff` in sync (assigned→FALSE, ended→re-check); new `is_staff_required() BOOLEAN` = `EXISTS approved+dept active+suspended OK with NO ACTIVE assignment`.
- Backend: `patientController.getStaffRequiredStatus` → `SELECT is_staff_required()` → `{staff_required:true|false}` + `GET /api/patients/staff-required` public (no doctor details).
- Frontend: `Home.jsx` fetches `GET /staff-required` → `staffRequired` boolean; generic banner `📢 STAFF REQUIRED / Some doctors currently need available staff members / [Register as Staff → /staff-registration]` only when true, no `full_name/photo/dept` leaked. Old `looking-for-staff` kept deprecated for compat.

**Cases:** A assigned→hidden (false), B none→visible (true), C later assigned→hidden, D multi one none→visible, E all have→hidden. Uses existing `staff_assignment` workflow (`POST /api/doctors/assign-staff`), no auto-assign invented.

**ApiTester:** `patient.http 2.13/2.14`, `api-tests.http 5.10b`.
**Docs:** `FILE_REVIEWS §12`, `LEARN_BACKEND`, `TRIGGERS.md` updated; no payment/appointment touched.

**Verification:** `GET /staff-required` public, `SELECT is_staff_required()`, `SELECT doctor_id,needs_staff FROM doctor`, assignment → banner toggles; `npm run build` passes.
