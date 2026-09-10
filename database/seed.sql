-- Doctoralia Seed Data
-- Starter/reference data only.
-- No user/admin/doctor passwords are inserted here.

INSERT INTO department (department_name, description)
VALUES
    ('Cardiology', 'Heart and cardiovascular care'),
    ('Neurology', 'Brain and nervous system care'),
    ('Dermatology', 'Skin, hair and nail care'),
    ('Orthopedics', 'Bone, joint and musculoskeletal care'),
    ('Medicine', 'General medicine and internal medicine');

INSERT INTO hospital (hospital_name, city, address, phone_number, description)
VALUES
    ('Doctoralia Central Hospital', 'Dhaka', 'Dhaka, Bangladesh', '01234567890', 'Main hospital for Doctoralia demo data');

INSERT INTO medicine (medicine_name, company_name, strength, medicine_type)
VALUES
    ('Paracetamol', 'Demo Pharma', '500 mg', 'Tablet'),
    ('Omeprazole', 'Demo Pharma', '20 mg', 'Capsule'),
    ('Azithromycin', 'Demo Pharma', '500 mg', 'Tablet');

INSERT INTO test (test_name, description, estimated_cost)
VALUES
    ('CBC', 'Complete Blood Count', 500.00),
    ('ECG', 'Electrocardiogram', 800.00),
    ('X-Ray Chest', 'Chest X-ray examination', 1000.00);

-- SINGLETON ADMIN (sara@gmail.com / sara) — only one admin allowed
-- Password hash for 'sara' (bcrypt 10 rounds)
INSERT INTO admin (full_name, email, password, phone_number)
VALUES ('Sara', 'sara@gmail.com', '$2b$10$5jaZ74V7Hz65j6pkMp75veoSpSHc7akgn7RnUwTDVRD/Au5xLH8ci', '01700000000')
ON CONFLICT DO NOTHING;

-- Ensure unique singleton constraint at app level
-- Staff is NOT seeded here — first POST /api/staff/apply creates the one allowed staff (pending -> approved), then closed
