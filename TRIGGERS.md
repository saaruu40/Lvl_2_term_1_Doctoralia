# Triggers — Doctoralia

> Scope: `PART 3` — every trigger in the project (DB triggers, ORM hooks, cron jobs, webhooks, event listeners).  
> Search: `database/schema.sql`, `database/seed.sql`, `database/schema_backup_pre_m2m.sql`, `server/config/*.js`, `server/controllers/*.js`, `server/utils/*.js`, `server/server.js`, `server/package.json`, `server/*.sql`, `server/*.js`.

## Summary

- **6 PostgreSQL triggers** — all in `database/schema.sql:394-739` (only file containing `CREATE TRIGGER` / `RETURNS TRIGGER`). Each trigger inserts a row into `notification` (`schema.sql:394-413`).
- **0 ORM hooks** — project uses raw `pg` (`Pool` in `server/config/db.js:4`), no Sequelize/Mongoose/`beforeSave`/`afterCreate`.
- **0 cron jobs / `setInterval` / `node-cron`** — `server/package.json:14` has no cron deps; no `setInterval` in app code (only `node_modules`).
- **0 webhooks / `pg_notify` / `LISTEN`** — none.
- **2 Node event listeners** (`pool.on`) + **2 on-demand cleanup helpers** + **time-window guards** — documented below as event-like logic.

---

## 1. Database Triggers (PostgreSQL `plpgsql` — `database/schema.sql`)

All triggers follow: `CREATE OR REPLACE FUNCTION <func>() RETURNS TRIGGER LANGUAGE plpgsql` + `CREATE TRIGGER <trigger> AFTER ... ON <table> FOR EACH ROW EXECUTE FUNCTION <func>()`. No `pg_notify`.

| # | Trigger Name | Attachment (Event / Table / Timing) | What It Does (exact) | File |
|---|--------------|--------------------------------------|----------------------|------|
| **1** | `trg_appointment_status_notification` | `AFTER UPDATE OF appointment_status ON appointment FOR EACH ROW` | `IF OLD.appointment_status <> NEW.appointment_status THEN INSERT INTO notification (receiver_role='patient', receiver_id=NEW.patient_id, title='Appointment Update', message='Your appointment status changed to '||NEW.appointment_status, related_type='appointment', related_id=NEW.appointment_id)` — fires on every status change: `pending→scheduled` (staff approve), `scheduled→confirmed` (payment), `confirmed→completed` (prescription), `pending→rejected`, etc. | `database/schema.sql:414-469` (`appointment_status_notification()` L414-459, trigger L461-469) |
| **2** | `trg_patient_registration` | `AFTER INSERT ON patient FOR EACH ROW` | `INSERT INTO notification (receiver_role='patient', receiver_id=NEW.patient_id, title='Welcome to Doctoralia', message='Your patient account has been created successfully.', related_type='patient', related_id=NEW.patient_id)` — welcome notification on `POST /api/patients/register` | `database/schema.sql:471-516` (func L471-506, trigger L508-516) |
| **3** | `trg_payment_success` | `AFTER INSERT ON payment FOR EACH ROW` | `DECLARE p_id INT; SELECT patient_id INTO p_id FROM appointment WHERE appointment_id=NEW.appointment_id; INSERT INTO notification (receiver_role='patient', receiver_id=p_id, title='Payment Successful', message='Your payment has been completed successfully.', related_type='payment', related_id=NEW.payment_id)` — via `appointment` lookup | `database/schema.sql:518-577` (func L518-567, trigger L569-577) |
| **4** | `trg_prescription_notification` | `AFTER INSERT ON prescription FOR EACH ROW` | `DECLARE p_id INT; SELECT patient_id INTO p_id FROM appointment WHERE appointment_id=NEW.appointment_id; INSERT INTO notification (receiver_role='patient', receiver_id=p_id, title='New Prescription', message='Doctor has added a new prescription.', related_type='prescription', related_id=NEW.prescription_id)` — via `appointment` lookup | `database/schema.sql:579-641` (func L579-632, trigger L633-641) |
| **5** | `trg_referral_notification` | `AFTER INSERT ON referral FOR EACH ROW` | `INSERT INTO notification (receiver_role='patient', receiver_id=NEW.patient_id, title='New Referral', message='You have received a new doctor referral.', related_type='referral', related_id=NEW.referral_id)` — uses `referral.patient_id` (backfilled from `appointment.patient_id` in migration `schema.sql:169-177`) | `database/schema.sql:643-690` (func L643-681, trigger L682-690) |
| **6** | `trg_complaint_admin` | `AFTER INSERT ON complaint FOR EACH ROW` | `INSERT INTO notification (receiver_role='admin', receiver_id=1, title='New Complaint', message='A new complaint has been submitted.', related_type='complaint', related_id=NEW.complaint_id)` — **hardcoded `receiver_id=1`** (singleton admin `sara@gmail.com`) | `database/schema.sql:692-739` (func L692-730, trigger L731-739) |

### Supporting Objects

- **Table `notification`** — `database/schema.sql:394-413` — `(notification_id SERIAL PK, receiver_role VARCHAR(20), receiver_id INT, title VARCHAR(100), message TEXT, related_type VARCHAR(50), related_id INT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`.
- **Read path** — `server/controllers/notificationController.js:17` + `server/routes/notificationRoutes.js:13` — `GET /api/notifications/:role/:id` → `SELECT * FROM notification WHERE receiver_role=$1 AND receiver_id=$2 ORDER BY created_at DESC`.
- **Migration block** — `database/schema.sql:136-178` — `DO $$ BEGIN ... END $$;` — conditional idempotent migration of old `schedule.doctor_id`/`slot_status` → `doctor_schedule` junction and `referral.patient_id` backfill; not a trigger but event-like DDL.

### Trigger Test Matrix (use `api-tests.http` + `GET /api/notifications/:role/:id`)

| Trigger | Endpoint that fires it | Verify via |
|---------|------------------------|------------|
| `trg_patient_registration` | `POST /api/patients/register` (`api-tests.http:1C.1`) | `GET /api/notifications/patient/<newPatientId>` — expect `Welcome to Doctoralia` |
| `trg_payment_success` | `POST /api/patients/payments` (`api-tests.http:5.16`) | `GET /api/notifications/patient/<patientId>` — `Payment Successful` |
| `trg_prescription_notification` | `POST /api/doctors/prescriptions` (`api-tests.http:3.7`) — needs `appointment_status='confirmed'` | `GET /api/notifications/patient/<patientId>` — `New Prescription` |
| `trg_referral_notification` | `POST /api/doctors/referrals` (`api-tests.http:3.9`) | `GET /api/notifications/patient/<patientId>` — `New Referral` |
| `trg_appointment_status_notification` | Any status change: `PATCH /api/staff/appointments/:id/approve` → `scheduled`, `POST /api/patients/payments` → `confirmed`, `POST /api/doctors/prescriptions` → `completed` | `GET /api/notifications/patient/<patientId>` — `Appointment Update: <newStatus>` |
| `trg_complaint_admin` | Any `POST` to complaint (`/api/patients/complaints`, `/api/doctors/complaints`, `/api/staff/complaints`, `POST /api/complaints`) | `GET /api/notifications/admin/1` — `New Complaint` |
| `trg_doctor_needs_staff` (FIXED) | `PATCH /api/admin/doctors/:id/approve` (`api-tests.http:6.4`) — `pending→approved` checks `NOT EXISTS ACTIVE` else `FALSE` | `SELECT doctor_id, needs_staff FROM doctor WHERE doctor_id=:id` — `TRUE` if no ACTIVE, else `FALSE`; `GET /api/patients/staff-required` → `true` if any doctor needs |
| `trg_sync_needs_staff_on_insert` | `POST /api/doctors/assign-staff` (`api-tests.http:3E.3`) — `INSERT staff_assignment ACTIVE` → `needs_staff FALSE` | `SELECT needs_staff FROM doctor`; `GET /api/patients/staff-required` should flip to `false` if that was last needing doctor |
| `trg_sync_needs_staff_on_update` | `UPDATE staff_assignment SET status='ENDED'` / `end_date` expiry | `SELECT needs_staff` re-checked; `GET /staff-required` flips to `true` if doctor now without ACTIVE |
| `trg_sync_needs_staff_on_delete` | `DELETE FROM staff_assignment` | Same as update — needs_staff re-checked |

---

## 2. Pool Event Listeners (Node `pg` — `server/config/db.js`)

| Name | Attachment | What It Does | File |
|------|------------|--------------|------|
| `pool.on("connect")` | `Pool` — new client connection acquired | `console.log("PostgreSQL connected successfully")` | `server/config/db.js:12` |
| `pool.on("error")` | `Pool` — idle client error | `console.error("PostgreSQL connection error:", error.message)` | `server/config/db.js:16` |

No `pg` `LISTEN`/`NOTIFY`, no `pool.on("acquire"/"release")`.

---

## 3. On-Demand Cleanup Helpers (Lazy — not scheduled; called pre-query)

| Name | What It Does (SQL) | Called From | File |
|------|--------------------|-------------|------|
| `cleanupExpiredSuspensions()` | `UPDATE staff SET suspended_until=NULL WHERE suspended_until IS NOT NULL AND suspended_until <= NOW()` + same for `doctor` | `doctorController.getActiveDoctor`, `staffController.getActiveStaff`, `patientController.createAppointment/makePayment`, `adminController.getApprovedStaff` etc. | `server/utils/staffAssignmentHelper.js:4` |
| `cleanupExpiredAssignments()` | `UPDATE staff_assignment SET status='ENDED' WHERE status='ACTIVE' AND end_date IS NOT NULL AND end_date <= NOW()` | `staffAssignmentHelper.getActiveAssignmentsForStaff`, `verifyStaffCanManageDoctor`, `adminController.getApprovedStaff/suspended/available` | `server/utils/staffAssignmentHelper.js:10` |
| Helpers: `getActiveAssignmentsForStaff`, `isStaffAvailable`, `getAvailableStaffList`, `verifyStaffCanManageDoctor` | Query + cleanup → availability/authorization decisions (e.g. `verifyStaffCanManageDoctor` checks ACTIVE assignment to `doctor_id`) | `server/controllers/*` staff flows | `server/utils/staffAssignmentHelper.js:15,26,35,54` |

These are **not** cron/`setInterval` — they run lazily on every read. A true cron would `setInterval(cleanupExpiredSuspensions, 60000)`.

---

## 4. Time-Window Guards (`server/utils/scheduleWindow.js:3-214`)

Not DB triggers — app-level request guards enforcing schedule-management window.

| Name | Attachment / When | What It Does | File |
|------|-------------------|--------------|------|
| `TIMEZONE = Asia/Dhaka`, `WINDOW_START_MIN=775` (12:55), `WINDOW_END_MIN=1080` (18:00) | Constants | Defines allowed wall-clock window inclusive | `scheduleWindow.js:5-7` |
| `getNowInTimezone()` / `getCurrentDateStr()` / `getTargetDateStr()` / `getYearEndDateStr()` | Helpers | `Intl.DateTimeFormat` TZ-aware date math (no external libs) | `scheduleWindow.js:9,50,54,109` |
| `isWithinScheduleWindow(now)` | Pure check | `775 <= minutes <= 1080` | `scheduleWindow.js:65` |
| `getScheduleWindowStatus(now)` | Used by `GET /api/doctors/schedules/window` | Returns `{ timezone, targetDate, currentDate, isOpen, currentTime, window:"12:55-18:00" }` | `scheduleWindow.js:78` |
| `assertScheduleWindow(now)` | Guard — called by `POST/PUT/DELETE/PATCH /api/doctors/schedules*` | Throws `403 WINDOW_CLOSED` if outside window | `scheduleWindow.js:98` |
| `assertTargetDateInSameYear(date, now)` | Guard — called by schedule write paths | Validates `YYYY-MM-DD` ∈ `[tomorrow .. YYYY-12-31]` same year | `scheduleWindow.js:127` |
| `isSlotExpired(available_date, end_time, now)` (= `isSlotExpiredPrecise`) | Guard — called by `patientController.createAppointment`, `makePayment`, `staffController.scheduleAppointment/approveAppointment`, `doctorScheduleController.getMySchedules` | Returns true if `available_date < today` or same-day `end_time` < `now` in Asia/Dhaka — blocks payment/booking on expired slots, enriches `is_expired`/`computed_status` | `scheduleWindow.js:159,184,212` |

---

## 5. Staff-Required Feature (NEW — Generic Advertisement, no doctor details)

| Name | Attachment | What It Does | File |
|------|------------|--------------|------|
| `set_doctor_needs_staff()` | `BEFORE UPDATE OF approval_status ON doctor` — `pending→approved` → `needs_staff:= (NOT EXISTS ACTIVE)` | Fixes false ad: only TRUE if no ACTIVE assignment else FALSE; backfill corrects legacy rows | `database/schema.sql:928-941` |
| `sync_doctor_needs_staff()` | `AFTER INSERT/UPDATE/DELETE ON staff_assignment` — `target_doctor = COALESCE(NEW.doctor_id, OLD.doctor_id)` → `UPDATE doctor SET needs_staff = (approved AND not suspended AND NOT EXISTS ACTIVE)` | Keeps ad in sync: assigned→FALSE (hidden), ended/deleted→TRUE if still needing | `database/schema.sql:969-989` |
| `trg_sync_needs_staff_on_insert` | `AFTER INSERT ON staff_assignment` | Calls `sync_doctor_needs_staff()` | `database/schema.sql:991` |
| `trg_sync_needs_staff_on_update` | `AFTER UPDATE OF status, end_date ON staff_assignment` | Calls `sync_doctor_needs_staff()` | `database/schema.sql:994` |
| `trg_sync_needs_staff_on_delete` | `AFTER DELETE ON staff_assignment` | Calls `sync_doctor_needs_staff()` | `database/schema.sql:997` |
| `is_staff_required()` | `RETURNS BOOLEAN` — `EXISTS approved+dept active+suspended OK AND NOT EXISTS ACTIVE` | Public `GET /api/patients/staff-required` → `{staff_required:true|false}` — generic, no doctor leak | `database/schema.sql:1002-1022` |
| `get_doctors_needing_staff()` | `RETURNS TABLE` — `needs_staff TRUE AND approved AND dept active AND NOT EXISTS ACTIVE` | Deprecated `GET /looking-for-staff` — kept compat, now also checks `end_date> NOW()` | `database/schema.sql:943-967` |

Flow: `PATCH /approve` → `needs_staff` set correctly → `POST /assign-staff` → sync trigger flips FALSE → `GET /staff-required` → `is_staff_required()` checks live state → Home banner `📢 STAFF REQUIRED / Some doctors need staff / [Register as Staff]` visible only when `true`.

## 6. Negative Findings (verified by grep)

| Type | Searched | Result |
|------|----------|--------|
| `TRIGGER` / `CREATE TRIGGER` / `RETURNS TRIGGER` | `rg "TRIGGER"` across `database/`, `server/` | **16 hits — 6 original notification + 1 dept check + 4 staff-required (1 doctor + 3 sync) + 5 definitions in `database/schema.sql`** |
| ORM hooks `beforeSave`, `afterCreate`, `hooks` | `rg "beforeSave|afterCreate|hooks"` | 0 in app code (only `node_modules`) |
| `cron` / `node-cron` / `setInterval` / `setTimeout` | `rg "cron|setInterval"` | 0 in app code (only `node_modules`/client debounce) |
| `webhook` / `pg_notify` / `LISTEN` | `rg "webhook|pg_notify|LISTEN"` | 0 |
| `database/seed.sql` / `schema_backup_pre_m2m.sql` | Full read | **0 triggers**; seed only inserts departments/hospital/medicines/tests/admin |

## 7. Operational Notes

- **Hardcoded admin 1** in `trg_complaint_admin:715` — if singleton admin is ever re-seeded with different `admin_id`, notifications will go to stale ID. Consider `SELECT MIN(admin_id) FROM admin`.
- **Lazy cleanup** — because expirations are cleared only on read, a suspended user with no traffic may appear suspended in raw SQL even after `suspended_until` passed until next related API call. Prefer a nightly `pg_cron` or `setInterval` if strict freshness is required.
- **No `is_read` trigger** — marking notifications read is manual (no DB trigger for it).
