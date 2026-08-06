CREATE TABLE doctor (
    doctor_id SERIAL PRIMARY KEY,

    department_id INTEGER,
    approved_by INTEGER,

    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,

    qualification VARCHAR(100) NOT NULL,
    specification VARCHAR(100) NOT NULL,
    medical_registration_no VARCHAR(100) UNIQUE NOT NULL,

    new_patient_fee DECIMAL(10,2) NOT NULL,
    followup_fee DECIMAL(10,2) NOT NULL,
    max_patient_num INTEGER NOT NULL,

    profile_photo TEXT
);

CREATE TABLE admin (
    admin_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL
);

CREATE TABLE department (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);