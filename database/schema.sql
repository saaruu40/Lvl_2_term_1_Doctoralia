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
