-- TRACK B: Appointment Lifecycle - Practice SQL directly in psql / pgAdmin
-- This mirrors what Node does in patientController.js, staffController.js, doctorController.js
-- Run: psql -U postgres -d doctoralia_moriom -f learn_flow_b.sql
-- Or copy-paste block by block in pgAdmin Query Tool

-- 0) See what you have (like pool.query SELECT)
SELECT COUNT(*) FROM patient;
SELECT COUNT(*) FROM doctor WHERE approval_status='approved';
SELECT COUNT(*) FROM appointment;
SELECT COUNT(*) FROM schedule;

-- 1) PATIENT creates appointment (patientController.js:435 INSERT pending)
--    Needs existing patient_id and approved doctor_id
--    Find ids first:
SELECT patient_id, full_name FROM patient LIMIT 2;
SELECT doctor_id, full_name, approval_status FROM doctor WHERE approval_status='approved' LIMIT 2;

-- Example: patient_id=1, doctor_id=1 (change to your ids)
-- Uncomment and run:
-- INSERT INTO appointment (patient_id, doctor_id, appointment_status)
-- VALUES (1, 1, 'pending') RETURNING *;

-- 2) DOCTOR creates schedule slot for TOMORROW 10:00-11:00 (doctorScheduleController.js:135)
--    Uses M:N: schedule (global) + doctor_schedule (per-doctor status)
--    Find hospital:
SELECT hospital_id, hospital_name FROM hospital;

-- Insert schedule + link (same as findOrCreateSchedule + INSERT doctor_schedule)
-- Tomorrow's date in Asia/Dhaka, example 2026-09-06 (update to tomorrow!)
-- Uncomment:
-- INSERT INTO schedule (available_date, start_time, end_time, hospital_id)
-- VALUES (CURRENT_DATE + 1, '10:00', '11:00', 1) RETURNING schedule_id;
-- -- Say returned schedule_id=5, then:
-- INSERT INTO doctor_schedule (doctor_id, schedule_id, status) VALUES (1, 5, 'AVAILABLE');

-- Or if schedule already exists, just link:
-- INSERT INTO doctor_schedule (doctor_id, schedule_id, status) VALUES (1, 1, 'AVAILABLE') ON CONFLICT DO NOTHING;

-- Check M:N view (like staffController.js:1381 getAvailableSchedules)
SELECT s.schedule_id, s.available_date, s.start_time, s.end_time, ds.status, ds.doctor_id, h.hospital_name
FROM schedule s JOIN doctor_schedule ds ON s.schedule_id=ds.schedule_id
LEFT JOIN hospital h ON s.hospital_id=h.hospital_id
WHERE ds.doctor_id=1 AND ds.status='AVAILABLE' ORDER BY s.available_date, s.start_time;

-- 3) STAFF assigns hospital+slot to pending appointment (staffController.js:1280 UPDATE scheduled)
--    Find pending appointment:
SELECT appointment_id, patient_id, doctor_id, appointment_status FROM appointment WHERE appointment_status='pending' ORDER BY appointment_id DESC LIMIT 2;
-- Pick appointment_id and schedule_id from above, then:
-- UPDATE appointment SET hospital_id=1, schedule_id=5, appointment_status='scheduled'
-- WHERE appointment_id=1 RETURNING *;

-- Verify:
SELECT a.appointment_id, a.appointment_status, s.available_date, s.start_time, h.hospital_name
FROM appointment a LEFT JOIN schedule s ON a.schedule_id=s.schedule_id LEFT JOIN hospital h ON a.hospital_id=h.hospital_id
WHERE a.appointment_id=1;

-- 4) PATIENT pays (patientController.js:790 INSERT payment + UPDATE confirmed) - transaction in Node
--    This is two steps in one transaction: BEGIN; INSERT payment; UPDATE appointment; COMMIT;
-- BEGIN;
-- INSERT INTO payment (appointment_id, amount, payment_method, payment_status, payment_date)
-- VALUES (1, 500, 'cash', 'paid', CURRENT_TIMESTAMP) RETURNING *;
-- UPDATE appointment SET appointment_status='confirmed' WHERE appointment_id=1 RETURNING *;
-- COMMIT;
-- Check:
SELECT appointment_id, appointment_status FROM appointment WHERE appointment_id=1;
SELECT * FROM payment WHERE appointment_id=1;

-- 5) DOCTOR creates prescription (doctorController.js:1016 INSERT prescription -> completed)
--    Needs confirmed appointment
-- BEGIN;
-- INSERT INTO prescription (appointment_id, diagnosis, advice, created_at)
-- VALUES (1, 'Fever', 'Rest and water', CURRENT_TIMESTAMP) RETURNING prescription_id;
-- -- Say prescription_id=1, then add medicines/tests if needed:
-- -- INSERT INTO prescription_medicine (prescription_id, medicine_id, dosage) VALUES (1, 1, '500mg');
-- -- INSERT INTO prescription_test (prescription_id, test_id) VALUES (1, 1);
-- UPDATE appointment SET appointment_status='completed' WHERE appointment_id=1 RETURNING *;
-- COMMIT;

-- 6) Clean up demo (optional, like deleteAppointment pending only)
-- DELETE FROM appointment WHERE appointment_id=1 AND appointment_status='pending' RETURNING *;

-- Status codes to remember (what Node sends):
-- 201 created, 200 ok, 400 bad input (missing), 401 wrong password, 403 forbidden/suspended, 404 not found, 409 duplicate/booked, 500 server error
