-- Doctoralia Database Schema
-- Based on the provided Entity-Attribute List.
-- PostgreSQL

CREATE TABLE IF NOT EXISTS admin (
    admin_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(255),
    phone_number VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS department (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100),
    description TEXT,
    created_by INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),

    CONSTRAINT fk_department_created_by
        FOREIGN KEY (created_by)
        REFERENCES admin(admin_id)
);

CREATE TABLE IF NOT EXISTS patient (
    patient_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(255),
    phone_number VARCHAR(20),
    gender VARCHAR(20),
    date_of_birth DATE,
    blood_group VARCHAR(10),
    address TEXT,
    suspended_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital (
    hospital_id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(150),
    city VARCHAR(100),
    address TEXT,
    phone_number VARCHAR(20),
    description TEXT
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    email VARCHAR(100),
    password VARCHAR(255),
    phone_number VARCHAR(20),
    gender VARCHAR(20),
    profile_pic TEXT,
    approval_status VARCHAR(10) default 'pending',
     suspended_until TIMESTAMP,

    CONSTRAINT fk_staff_admin
        FOREIGN KEY (admin_id)
        REFERENCES admin(admin_id)
);

CREATE TABLE IF NOT EXISTS medicine (
    medicine_id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(150),
    company_name VARCHAR(150),
    strength VARCHAR(100),
    medicine_type VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS test (
    test_id SERIAL PRIMARY KEY,
    test_name VARCHAR(150),
    description TEXT,
    estimated_cost NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS doctor (
    doctor_id SERIAL PRIMARY KEY,
    department_id INTEGER,
    approved_by INTEGER,
    full_name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(255),
    phone_number VARCHAR(20),
    qualification VARCHAR(150),
    specification VARCHAR(150),
    medical_registration_no VARCHAR(100),
    new_patient_fee NUMERIC(10,2),
    followup_fee NUMERIC(10,2),
    max_patient_num INTEGER,
    profile_photo TEXT,
    approval_status VARCHAR(20) default 'pending',
    suspended_until TIMESTAMP,

    CONSTRAINT fk_doctor_department
        FOREIGN KEY (department_id)
        REFERENCES department(department_id),

    CONSTRAINT fk_doctor_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES admin(admin_id)
);

CREATE TABLE IF NOT EXISTS schedule (
    schedule_id SERIAL PRIMARY KEY,
    available_date DATE,
    start_time TIME,
    end_time TIME,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_schedule_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id)
);

CREATE TABLE IF NOT EXISTS doctor_schedule (
    doctor_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('AVAILABLE','WORKING','UNAVAILABLE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (doctor_id, schedule_id),

    CONSTRAINT fk_doctor_schedule_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctor(doctor_id) ON DELETE CASCADE,

    CONSTRAINT fk_doctor_schedule_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES schedule(schedule_id) ON DELETE CASCADE
);

-- Migration for existing DBs that still have old columns (safe, no-op if already migrated) - FIXED for zero loss
DO $$ BEGIN
  -- If old schedule still has doctor_id, migrate to junction with UPPER mapping (booked->WORKING)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule' AND column_name='doctor_id') THEN
    INSERT INTO doctor_schedule (doctor_id, schedule_id, status)
    SELECT doctor_id, schedule_id,
      CASE UPPER(TRIM(COALESCE(NULLIF(slot_status,''),'UNAVAILABLE')))
        WHEN 'AVAILABLE' THEN 'AVAILABLE'
        WHEN 'BOOKED' THEN 'WORKING'
        WHEN 'WORKING' THEN 'WORKING'
        WHEN 'UNAVAILABLE' THEN 'UNAVAILABLE'
        ELSE 'UNAVAILABLE'
      END
    FROM schedule WHERE doctor_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    ALTER TABLE schedule DROP CONSTRAINT IF EXISTS fk_schedule_doctor;
    ALTER TABLE schedule DROP CONSTRAINT IF EXISTS idx_schedule_doctor_date;
    ALTER TABLE schedule DROP CONSTRAINT IF EXISTS idx_schedule_doctor_date_time;
    ALTER TABLE schedule DROP COLUMN IF EXISTS doctor_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule' AND column_name='slot_status') THEN
    ALTER TABLE schedule DROP COLUMN IF EXISTS slot_status;
  END IF;
  -- hospital_id already added via CREATE TABLE above, ensure FK
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule' AND column_name='hospital_id') THEN
    ALTER TABLE schedule ADD COLUMN hospital_id INTEGER REFERENCES hospital(hospital_id);
  END IF;
  -- Ensure created_at/updated_at exist (additive, not dropping)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule' AND column_name='created_at') THEN
    ALTER TABLE schedule ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule' AND column_name='updated_at') THEN
    ALTER TABLE schedule ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  -- referral: keep both appointment_id and patient_id for zero loss
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referral' AND column_name='patient_id') THEN
    ALTER TABLE referral ADD COLUMN patient_id INTEGER REFERENCES patient(patient_id);
  END IF;
  -- backfill patient_id from appointment where possible
  BEGIN
    UPDATE referral r SET patient_id = a.patient_id FROM appointment a WHERE r.appointment_id = a.appointment_id AND r.patient_id IS NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- department status: ensure column exists for existing DBs, default active for legacy rows
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department' AND column_name='status') THEN
    ALTER TABLE department ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive'));
  END IF;
  BEGIN
    UPDATE department SET status='active' WHERE status IS NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(available_date);
CREATE INDEX IF NOT EXISTS idx_schedule_hospital ON schedule(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_doctor ON doctor_schedule(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_schedule ON doctor_schedule(schedule_id);

CREATE TABLE IF NOT EXISTS appointment (
    appointment_id SERIAL PRIMARY KEY,

    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,

    hospital_id INTEGER,
    schedule_id INTEGER,

    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    appointment_status VARCHAR(50) DEFAULT 'pending',

    cancelled_by_staff_id INTEGER,

    CONSTRAINT fk_appointment_patient
        FOREIGN KEY (patient_id)
        REFERENCES patient(patient_id),

    CONSTRAINT fk_appointment_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctor(doctor_id),

    CONSTRAINT fk_appointment_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id),

    CONSTRAINT fk_appointment_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES schedule(schedule_id),

    CONSTRAINT fk_appointment_staff
        FOREIGN KEY (cancelled_by_staff_id)
        REFERENCES staff(staff_id)
);

CREATE TABLE IF NOT EXISTS prescription (
    prescription_id SERIAL PRIMARY KEY,
    appointment_id INTEGER,
    diagnosis TEXT,
    advice TEXT,
    created_at TIMESTAMP,

    CONSTRAINT fk_prescription_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointment(appointment_id)
);

CREATE TABLE IF NOT EXISTS prescription_medicine (
    prescription_id INTEGER,
    medicine_id INTEGER,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instruction TEXT,

    PRIMARY KEY (prescription_id, medicine_id),

    CONSTRAINT fk_prescription_medicine_prescription
        FOREIGN KEY (prescription_id)
        REFERENCES prescription(prescription_id),

    CONSTRAINT fk_prescription_medicine_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicine(medicine_id)
);

CREATE TABLE IF NOT EXISTS prescription_test (
    prescription_id INTEGER,
    test_id INTEGER,

    PRIMARY KEY (prescription_id, test_id),

    CONSTRAINT fk_prescription_test_prescription
        FOREIGN KEY (prescription_id)
        REFERENCES prescription(prescription_id),

    CONSTRAINT fk_prescription_test_test
        FOREIGN KEY (test_id)
        REFERENCES test(test_id)
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL PRIMARY KEY,

    appointment_id INTEGER NOT NULL,

    amount NUMERIC(10,2) NOT NULL,

    payment_method VARCHAR(50),

    payment_status VARCHAR(50) DEFAULT 'pending',

    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointment(appointment_id)
);

CREATE TABLE IF NOT EXISTS complaint (
    complaint_id SERIAL PRIMARY KEY,

    filed_by_patient_id INTEGER,
    filed_by_doctor_id INTEGER,
    filed_by_staff_id INTEGER,

    against_patient_id INTEGER,
    against_doctor_id INTEGER,
    against_staff_id INTEGER,

    appointment_id INTEGER,

    reviewed_by INTEGER,

    complaint_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    complaint_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    complaint_status VARCHAR(50)
        DEFAULT 'pending',

    admin_action TEXT,

    CONSTRAINT fk_complaint_filed_patient
        FOREIGN KEY (filed_by_patient_id)
        REFERENCES patient(patient_id),

    CONSTRAINT fk_complaint_filed_doctor
        FOREIGN KEY (filed_by_doctor_id)
        REFERENCES doctor(doctor_id),

    CONSTRAINT fk_complaint_filed_staff
        FOREIGN KEY (filed_by_staff_id)
        REFERENCES staff(staff_id),

    CONSTRAINT fk_complaint_against_patient
        FOREIGN KEY (against_patient_id)
        REFERENCES patient(patient_id),

    CONSTRAINT fk_complaint_against_doctor
        FOREIGN KEY (against_doctor_id)
        REFERENCES doctor(doctor_id),

    CONSTRAINT fk_complaint_against_staff
        FOREIGN KEY (against_staff_id)
        REFERENCES staff(staff_id),

    CONSTRAINT fk_complaint_reviewed_by
        FOREIGN KEY (reviewed_by)
        REFERENCES admin(admin_id)

 
);

CREATE TABLE IF NOT EXISTS referral (
    referral_id SERIAL PRIMARY KEY,
    patient_id INTEGER,
    appointment_id INTEGER,
    referred_by INTEGER,
    referred_to INTEGER,
    reason TEXT,
    referral_status VARCHAR(50),
    referral_date DATE,

    CONSTRAINT fk_referral_patient
        FOREIGN KEY (patient_id)
        REFERENCES patient(patient_id),

    CONSTRAINT fk_referral_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointment(appointment_id),

    CONSTRAINT fk_referral_referred_by
        FOREIGN KEY (referred_by)
        REFERENCES doctor(doctor_id),

    CONSTRAINT fk_referral_referred_to
        FOREIGN KEY (referred_to)
        REFERENCES doctor(doctor_id)
);

-- =====================================================
-- STAFF-DOCTOR ASSIGNMENT (Primary + Temporary Replacement)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_assignment (
    assignment_id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctor(doctor_id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('PRIMARY','TEMPORARY')),
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED','SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One active assignment per staff (prevents two doctors at once)
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_staff ON staff_assignment(staff_id) WHERE status = 'ACTIVE';
-- One primary per doctor
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_primary ON staff_assignment(doctor_id) WHERE status = 'ACTIVE' AND assignment_type = 'PRIMARY';
-- One temporary per doctor (at most one replacement)
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_temporary ON staff_assignment(doctor_id) WHERE status = 'ACTIVE' AND assignment_type = 'TEMPORARY';

CREATE INDEX IF NOT EXISTS idx_staff_assignment_staff ON staff_assignment(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_doctor ON staff_assignment(doctor_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_status ON staff_assignment(status);


CREATE TABLE notification
(
    notification_id SERIAL PRIMARY KEY,

    receiver_role VARCHAR(20),

    receiver_id INT,

    title VARCHAR(100),

    message TEXT,

    related_type VARCHAR(50),

    related_id INT,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE FUNCTION appointment_status_notification()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN


IF OLD.appointment_status <> NEW.appointment_status
THEN


INSERT INTO notification
(
receiver_role,
receiver_id,
title,
message,
related_type,
related_id
)

VALUES
(
'patient',
NEW.patient_id,
'Appointment Update',
'Your appointment status changed to '
|| NEW.appointment_status,
'appointment',
NEW.appointment_id
);


END IF;


RETURN NEW;


END;

$$;

CREATE TRIGGER trg_appointment_status_notification

AFTER UPDATE OF appointment_status

ON appointment

FOR EACH ROW

EXECUTE FUNCTION appointment_status_notification();

CREATE OR REPLACE FUNCTION patient_registration_notification()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN

INSERT INTO notification
(
receiver_role,
receiver_id,
title,
message,
related_type,
related_id
)

VALUES
(
'patient',
NEW.patient_id,
'Welcome to Doctoralia',
'Your patient account has been created successfully.',
'patient',
NEW.patient_id
);


RETURN NEW;

END;

$$;

CREATE TRIGGER trg_patient_registration

AFTER INSERT

ON patient

FOR EACH ROW

EXECUTE FUNCTION patient_registration_notification();

CREATE OR REPLACE FUNCTION payment_success_notification()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

DECLARE

p_id INT;

BEGIN


SELECT patient_id
INTO p_id
FROM appointment
WHERE appointment_id = NEW.appointment_id;



INSERT INTO notification
(
receiver_role,
receiver_id,
title,
message,
related_type,
related_id
)

VALUES
(
'patient',
p_id,
'Payment Successful',
'Your payment has been completed successfully.',
'payment',
NEW.payment_id
);



RETURN NEW;


END;

$$;

CREATE TRIGGER trg_payment_success

AFTER INSERT

ON payment

FOR EACH ROW

EXECUTE FUNCTION payment_success_notification();

CREATE OR REPLACE FUNCTION prescription_notification()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

DECLARE

p_id INT;


BEGIN


SELECT patient_id

INTO p_id

FROM appointment

WHERE appointment_id = NEW.appointment_id;



INSERT INTO notification
(
receiver_role,
receiver_id,
title,
message,
related_type,
related_id
)

VALUES
(
'patient',
p_id,
'New Prescription',
'Doctor has added a new prescription.',
'prescription',
NEW.prescription_id
);



RETURN NEW;


END;

$$;
CREATE TRIGGER trg_prescription_notification

AFTER INSERT

ON prescription

FOR EACH ROW

EXECUTE FUNCTION prescription_notification();

CREATE OR REPLACE FUNCTION referral_notification()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN


INSERT INTO notification
(
receiver_role,
receiver_id,
title,
message,
related_type,
related_id
)

VALUES
(
'patient',
NEW.patient_id,
'New Referral',
'You have received a new doctor referral.',
'referral',
NEW.referral_id
);



RETURN NEW;


END;

$$;
CREATE TRIGGER trg_referral_notification

AFTER INSERT

ON referral

FOR EACH ROW

EXECUTE FUNCTION referral_notification();

CREATE OR REPLACE FUNCTION complaint_admin_notification()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN


INSERT INTO notification
(
receiver_role,
receiver_id,
title,
message,
related_type,
related_id
)

VALUES
(
'admin',
1,
'New Complaint',
'A new complaint has been submitted.',
'complaint',
NEW.complaint_id
);



RETURN NEW;


END;

$$;
CREATE TRIGGER trg_complaint_admin

AFTER INSERT

ON complaint

FOR EACH ROW

EXECUTE FUNCTION complaint_admin_notification();

-- =====================================================
-- BLOCK NEW APPOINTMENTS FOR INACTIVE DEPARTMENTS
-- Business rule enforced ONLY by database trigger.
-- Backend must NOT duplicate this check; it only forwards
-- the PostgreSQL error message to the frontend.
-- =====================================================
CREATE OR REPLACE FUNCTION check_department_active_on_appointment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  dept_status VARCHAR(20);
BEGIN
  SELECT d.status INTO dept_status
  FROM doctor doc
  LEFT JOIN department d ON d.department_id = doc.department_id
  WHERE doc.doctor_id = NEW.doctor_id;

  IF dept_status = 'inactive' THEN
    RAISE EXCEPTION 'This department is currently unavailable. New appointments cannot be booked for this department.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_department_check ON appointment;
CREATE TRIGGER trg_appointment_department_check
BEFORE INSERT ON appointment
FOR EACH ROW EXECUTE FUNCTION check_department_active_on_appointment();

-- =====================================================
-- FUNCTION: get_doctors_without_staff
-- Returns ACTIVE doctors who currently have NO ACTIVE staff
-- Reuses existing staff_assignment table (status='ACTIVE')
-- Uses NOT EXISTS, no needs_staff column/trigger
-- =====================================================
CREATE OR REPLACE FUNCTION get_doctors_without_staff()
RETURNS TABLE (
  doctor_id INT,
  full_name VARCHAR,
  department_name VARCHAR,
  profile_photo TEXT,
  qualification VARCHAR,
  specification VARCHAR
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.doctor_id, d.full_name, dep.department_name, d.profile_photo, d.qualification, d.specification
  FROM doctor d
  LEFT JOIN department dep ON dep.department_id = d.department_id
  WHERE d.approval_status = 'approved'
    AND (d.suspended_until IS NULL OR d.suspended_until <= CURRENT_TIMESTAMP)
    AND (dep.status IS NULL OR dep.status = 'active')
    AND NOT EXISTS (
      SELECT 1 FROM staff_assignment sa
      WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE'
    )
  ORDER BY d.doctor_id;
END;
$$;

-- Drop unused book_appointment procedure (checked: zero CALLs, not used by existing feature; Home task does not need it)
DROP PROCEDURE IF EXISTS book_appointment(INT,INT,INT,INT,INT);
DROP PROCEDURE IF EXISTS book_appointment(INT,INT,INT,INT);

-- =====================================================
-- FUNCTION: calculate_appointment_fee
-- Returns new_patient_fee or followup_fee based on 90-day history
-- Uses existing doctor.new_patient_fee / followup_fee and appointment.appointment_status='completed'
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_appointment_fee(p_patient_id INT, p_doctor_id INT)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_fee NUMERIC;
  v_has_followup BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM appointment a
    WHERE a.patient_id = p_patient_id
      AND a.doctor_id = p_doctor_id
      AND a.appointment_status = 'completed'
      AND a.booking_date >= CURRENT_TIMESTAMP - INTERVAL '90 days'
  ) INTO v_has_followup;

  SELECT CASE WHEN v_has_followup THEN d.followup_fee ELSE d.new_patient_fee END INTO v_fee
  FROM doctor d WHERE d.doctor_id = p_doctor_id;

  IF v_fee IS NULL THEN
    v_fee := 0;
  END IF;

  RETURN v_fee;
END;
$$;

-- =====================================================
-- PROCEDURE: book_appointment
-- Multi-step booking workflow in DB (called inside Node transaction)
-- Validates doctor/dept/schedule/duplicate/capacity and inserts appointment
-- Keeps isSlotExpired / schedule-window checks in Node (utils/scheduleWindow)
-- No payment logic
-- =====================================================
CREATE OR REPLACE PROCEDURE book_appointment(
  p_patient_id INT,
  p_doctor_id INT,
  p_schedule_id INT,
  p_hospital_id INT,
  INOUT p_appointment_id INT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_doctor_exists INT;
  v_dept_status VARCHAR(20);
  v_slot_status VARCHAR(20);
  v_available_date DATE;
  v_max INT;
  v_cnt INT;
  v_dup INT;
BEGIN
  -- 1. Doctor exists and active
  SELECT max_patient_num INTO v_max FROM doctor
  WHERE doctor_id = p_doctor_id AND approval_status = 'approved' AND (suspended_until IS NULL OR suspended_until <= CURRENT_TIMESTAMP);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctor not found or not active.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Department active
  SELECT dep.status INTO v_dept_status
  FROM doctor d LEFT JOIN department dep ON dep.department_id = d.department_id
  WHERE d.doctor_id = p_doctor_id;
  IF v_dept_status = 'inactive' THEN
    RAISE EXCEPTION 'This department is currently unavailable. New appointments cannot be booked for this department.' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Schedule exists, belongs to doctor, available
  SELECT s.available_date, ds.status INTO v_available_date, v_slot_status
  FROM schedule s JOIN doctor_schedule ds ON s.schedule_id = ds.schedule_id
  WHERE s.schedule_id = p_schedule_id AND ds.doctor_id = p_doctor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found for this doctor.' USING ERRCODE = 'P0003';
  END IF;
  IF v_slot_status <> 'AVAILABLE' THEN
    RAISE EXCEPTION 'Selected slot is not available.' USING ERRCODE = 'P0004';
  END IF;

  -- 4. Duplicate check
  SELECT COUNT(*) INTO v_dup FROM appointment
  WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id AND schedule_id = p_schedule_id
    AND appointment_status IN ('pending','scheduled','confirmed');
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'You already have an appointment for this schedule.' USING ERRCODE = 'P0005';
  END IF;

  -- 5. Capacity check
  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cnt FROM appointment
    WHERE doctor_id = p_doctor_id AND schedule_id = p_schedule_id AND appointment_status IN ('scheduled','confirmed');
    IF v_cnt >= v_max THEN
      RAISE EXCEPTION 'This schedule has reached max capacity.' USING ERRCODE = 'P0006';
    END IF;
  END IF;

  -- 6. Insert pending appointment
  INSERT INTO appointment (patient_id, doctor_id, schedule_id, hospital_id, booking_date, appointment_status)
  VALUES (p_patient_id, p_doctor_id, p_schedule_id, p_hospital_id, NOW(), 'pending')
  RETURNING appointment_id INTO p_appointment_id;
END;
$$;

-- =====================================================
-- STAFF-REQUIRED FEATURE (Home Page)
-- Minimal needs_staff flag + trigger for newly approved doctors
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctor' AND column_name='needs_staff') THEN
    ALTER TABLE doctor ADD COLUMN needs_staff BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_doctor_needs_staff()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.approval_status = 'pending' AND NEW.approval_status = 'approved' THEN
    -- Global check: only TRUE if NO ACTIVE assignment for this doctor AND NO available staff globally (shobi unavailable)
    IF NOT EXISTS (
      SELECT 1 FROM staff_assignment sa
      WHERE sa.doctor_id = NEW.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
    ) AND NOT EXISTS (
      SELECT 1 FROM staff s
      WHERE s.approval_status = 'approved'
        AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM staff_assignment sa2
          WHERE sa2.staff_id = s.staff_id AND sa2.status = 'ACTIVE' AND (sa2.end_date IS NULL OR sa2.end_date > NOW())
        )
    ) THEN
      NEW.needs_staff := TRUE;
    ELSE
      NEW.needs_staff := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_needs_staff ON doctor;
CREATE TRIGGER trg_doctor_needs_staff
BEFORE UPDATE OF approval_status ON doctor
FOR EACH ROW EXECUTE FUNCTION set_doctor_needs_staff();

CREATE OR REPLACE FUNCTION get_doctors_needing_staff()
RETURNS TABLE (
  doctor_id INT,
  full_name VARCHAR,
  department_name VARCHAR,
  profile_photo TEXT,
  qualification VARCHAR,
  specification VARCHAR
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.doctor_id, d.full_name, dep.department_name, d.profile_photo, d.qualification, d.specification
  FROM doctor d
  LEFT JOIN department dep ON dep.department_id = d.department_id
  WHERE d.needs_staff = TRUE
    AND d.approval_status = 'approved'
    AND (d.suspended_until IS NULL OR d.suspended_until <= CURRENT_TIMESTAMP)
    AND (dep.status IS NULL OR dep.status = 'active')
    AND NOT EXISTS (
      SELECT 1 FROM staff_assignment sa
      WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
    )
  ORDER BY d.doctor_id;
END;
$$;

-- =====================================================
-- FIX: backfill needs_staff for existing rows (global check: only TRUE if shobi unavailable)
-- =====================================================
DO $$ BEGIN
  UPDATE doctor d SET needs_staff = (
    CASE WHEN d.approval_status = 'approved'
      AND (d.suspended_until IS NULL OR d.suspended_until <= NOW())
      AND NOT EXISTS (SELECT 1 FROM staff_assignment sa WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW()))
      AND NOT EXISTS (
        SELECT 1 FROM staff s
        WHERE s.approval_status = 'approved'
          AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
          AND NOT EXISTS (SELECT 1 FROM staff_assignment sa2 WHERE sa2.staff_id = s.staff_id AND sa2.status = 'ACTIVE' AND (sa2.end_date IS NULL OR sa2.end_date > NOW()))
      )
    THEN TRUE ELSE FALSE END
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- STAFF-ASSIGNMENT SYNC: keep doctor.needs_staff in sync with assignment state
-- Advertisement = approved doctor with NO ACTIVE assignment → needs_staff TRUE
-- Assigned → FALSE, Ended/Deleted → re-check
-- =====================================================
CREATE OR REPLACE FUNCTION sync_doctor_needs_staff()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_doctor INT;
BEGIN
  target_doctor := COALESCE(NEW.doctor_id, OLD.doctor_id);
  UPDATE doctor d SET needs_staff = (
    d.approval_status = 'approved'
    AND (d.suspended_until IS NULL OR d.suspended_until <= NOW())
    AND NOT EXISTS (SELECT 1 FROM staff_assignment sa WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW()))
    AND NOT EXISTS (
      SELECT 1 FROM staff s
      WHERE s.approval_status = 'approved'
        AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
        AND NOT EXISTS (SELECT 1 FROM staff_assignment sa2 WHERE sa2.staff_id = s.staff_id AND sa2.status = 'ACTIVE' AND (sa2.end_date IS NULL OR sa2.end_date > NOW()))
    )
  ) WHERE d.doctor_id = target_doctor;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_needs_staff_on_insert ON staff_assignment;
CREATE TRIGGER trg_sync_needs_staff_on_insert AFTER INSERT ON staff_assignment FOR EACH ROW EXECUTE FUNCTION sync_doctor_needs_staff();

DROP TRIGGER IF EXISTS trg_sync_needs_staff_on_update ON staff_assignment;
CREATE TRIGGER trg_sync_needs_staff_on_update AFTER UPDATE OF status, end_date ON staff_assignment FOR EACH ROW EXECUTE FUNCTION sync_doctor_needs_staff();

DROP TRIGGER IF EXISTS trg_sync_needs_staff_on_delete ON staff_assignment;
CREATE TRIGGER trg_sync_needs_staff_on_delete AFTER DELETE ON staff_assignment FOR EACH ROW EXECUTE FUNCTION sync_doctor_needs_staff();

-- =====================================================
-- STAFF TABLE SYNC: when global pool changes (approve/suspend), re-evaluate all doctors
-- Global e available thakle ad show korbe na — tai staff approve/suspend e re-check
-- =====================================================
CREATE OR REPLACE FUNCTION sync_all_doctors_needs_staff_on_staff_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE global_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM staff s2
    WHERE s2.approval_status = 'approved'
      AND (s2.suspended_until IS NULL OR s2.suspended_until <= NOW())
      AND NOT EXISTS (SELECT 1 FROM staff_assignment sa2 WHERE sa2.staff_id = s2.staff_id AND sa2.status = 'ACTIVE' AND (sa2.end_date IS NULL OR sa2.end_date > NOW()))
  ) INTO global_available;

  IF TG_OP = 'UPDATE' AND OLD.approval_status = NEW.approval_status AND COALESCE(OLD.suspended_until::text,'') = COALESCE(NEW.suspended_until::text,'') THEN
    RETURN NEW;
  END IF;

  -- If global now has available, hide all ads; else show for those without ACTIVE
  IF global_available THEN
    UPDATE doctor SET needs_staff = FALSE WHERE needs_staff = TRUE;
  ELSE
    UPDATE doctor d SET needs_staff = (
      d.approval_status = 'approved'
      AND (d.suspended_until IS NULL OR d.suspended_until <= NOW())
      AND NOT EXISTS (SELECT 1 FROM staff_assignment sa WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW()))
    ) WHERE d.approval_status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_needs_sync ON staff;
CREATE TRIGGER trg_staff_needs_sync AFTER UPDATE OF approval_status, suspended_until ON staff FOR EACH ROW EXECUTE FUNCTION sync_all_doctors_needs_staff_on_staff_change();

-- =====================================================
-- FUNCTION: is_staff_required() — generic boolean for Home banner (no doctor details)
-- TRUE only if at least one approved active doctor has NO ACTIVE staff AND globally no available staff (shobi unavailable)
-- =====================================================
CREATE OR REPLACE FUNCTION is_staff_required()
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v BOOLEAN;
DECLARE global_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM staff s
    WHERE s.approval_status = 'approved'
      AND (s.suspended_until IS NULL OR s.suspended_until <= NOW())
      AND NOT EXISTS (SELECT 1 FROM staff_assignment sa WHERE sa.staff_id = s.staff_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW()))
  ) INTO global_available;

  IF global_available THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM doctor d
    LEFT JOIN department dep ON dep.department_id = d.department_id
    WHERE d.approval_status = 'approved'
      AND (d.suspended_until IS NULL OR d.suspended_until <= NOW())
      AND (dep.status IS NULL OR dep.status = 'active')
      AND NOT EXISTS (
        SELECT 1 FROM staff_assignment sa
        WHERE sa.doctor_id = d.doctor_id AND sa.status = 'ACTIVE' AND (sa.end_date IS NULL OR sa.end_date > NOW())
      )
  ) INTO v;
  RETURN v;
END;
$$;