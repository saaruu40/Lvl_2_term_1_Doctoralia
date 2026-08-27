-- Doctoralia Seed Data
-- Starter/reference data only.

-- Fixed admins only (no public registration)
-- Passwords (plain): sara, moriom — stored as bcrypt hashes
INSERT INTO admin (admin_id, full_name, email, password, phone_number)
VALUES
    (
        1,
        'Fojilatun Nessa Sara',
        'sara@gmail.com',
        '$2b$10$H4p3CJ7HJn3sd9NqcH.ZH.bLPZ8EAyB6ughZK6VwdP5cm43qoFywe',
        '01326324851'
    ),
    (
        2,
        'Moriom sultana',
        'moriom@gmail.com',
        '$2b$10$10RX0/Ng2ZNh5w.juYtDcOOdJwOf82KGY8Xk6tK1uqLQSwmU8q/sm',
        '01326324851'
    )
ON CONFLICT (admin_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    phone_number = EXCLUDED.phone_number;

SELECT setval(
    pg_get_serial_sequence('admin', 'admin_id'),
    (SELECT COALESCE(MAX(admin_id), 1) FROM admin)
);

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

-- 10 real hospitals for doctor schedule selection (insert if not exists)
INSERT INTO hospital (hospital_name, city, address, phone_number, description)
SELECT * FROM (VALUES
    ('Square Hospital', 'Dhaka', '18/F, Bir Uttam Qazi Nuruzzaman Road, Dhaka', '02-8144400', 'A private multispecialty hospital providing comprehensive healthcare services.'),
    ('Evercare Hospital Dhaka', 'Dhaka', 'Plot 81, Block E, Bashundhara R/A, Dhaka', '02-55037242', 'A modern multispecialty hospital with advanced medical and diagnostic facilities.'),
    ('United Hospital', 'Dhaka', 'Plot 15, Road 71, Gulshan, Dhaka', '02-8836446', 'A private hospital providing specialized and emergency healthcare services.'),
    ('Labaid Specialized Hospital', 'Dhaka', 'House 06, Road 04, Dhanmondi, Dhaka', '02-58610793', 'A specialized hospital offering cardiac, diagnostic, and general medical services.'),
    ('Ibn Sina Specialized Hospital', 'Dhaka', 'House 48, Road 9/A, Dhanmondi, Dhaka', '02-9126625', 'A private hospital providing diagnostic, surgical, and specialist healthcare services.'),
    ('Chattogram Medical College Hospital', 'Chattogram', 'K.B. Fazlul Kader Road, Chattogram', '031-619400', 'A major medical hospital providing general, specialized, and emergency care.'),
    ('Rajshahi Medical College Hospital', 'Rajshahi', 'Medical College Road, Rajshahi', '0721-760254', 'A major healthcare facility providing medical, surgical, and emergency services.'),
    ('Khulna Medical College Hospital', 'Khulna', 'Bypass Road, Khulna', '041-761555', 'A medical hospital providing inpatient, outpatient, and emergency healthcare.'),
    ('Sher-E-Bangla Medical College Hospital', 'Barishal', 'Band Road, Barishal', '0431-217001', 'A major hospital providing general and specialized medical services.'),
    ('Sylhet MAG Osmani Medical College Hospital', 'Sylhet', 'Medical College Road, Sylhet', '0821-716090', 'A teaching hospital providing comprehensive medical and emergency services.')
) AS v(hospital_name, city, address, phone_number, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hospital h WHERE h.hospital_name = v.hospital_name
);

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
