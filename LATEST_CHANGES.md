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
