-- =============================================
-- Extra doctors seed for CareAssist
-- Run in Supabase SQL Editor
-- =============================================

-- First create these users in Supabase Auth → Users → Add User:
-- doctor2@demo.com / Demo@1234
-- doctor3@demo.com / Demo@1234
-- doctor4@demo.com / Demo@1234
-- doctor5@demo.com / Demo@1234
-- Then run this SQL

INSERT INTO user_profiles (id, email, full_name, role, phone)
SELECT id, email, 'Dr. Arjun Mehta', 'doctor', '+91-9876500010'
FROM auth.users WHERE email = 'doctor2@demo.com'
ON CONFLICT (id) DO UPDATE SET role='doctor', full_name='Dr. Arjun Mehta';

INSERT INTO user_profiles (id, email, full_name, role, phone)
SELECT id, email, 'Dr. Sunita Rao', 'doctor', '+91-9876500011'
FROM auth.users WHERE email = 'doctor3@demo.com'
ON CONFLICT (id) DO UPDATE SET role='doctor', full_name='Dr. Sunita Rao';

INSERT INTO user_profiles (id, email, full_name, role, phone)
SELECT id, email, 'Dr. Meena Krishnan', 'doctor', '+91-9876500012'
FROM auth.users WHERE email = 'doctor4@demo.com'
ON CONFLICT (id) DO UPDATE SET role='doctor', full_name='Dr. Meena Krishnan';

INSERT INTO user_profiles (id, email, full_name, role, phone)
SELECT id, email, 'Dr. Rahul Sharma', 'doctor', '+91-9876500013'
FROM auth.users WHERE email = 'doctor5@demo.com'
ON CONFLICT (id) DO UPDATE SET role='doctor', full_name='Dr. Rahul Sharma';

-- Doctor profiles
INSERT INTO doctor_profiles (id, specialization, experience_years, hospital_name, hospital_address, city, consultation_fee, rating, bio)
SELECT id, 'Cardiologist', 15, 'Heart Care Institute', '45 MG Road, Bangalore', 'Bangalore', 800, 4.9,
  'Senior cardiologist with 15 years specializing in preventive cardiology and heart failure management.'
FROM auth.users WHERE email = 'doctor2@demo.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctor_profiles (id, specialization, experience_years, hospital_name, hospital_address, city, consultation_fee, rating, bio)
SELECT id, 'Neurologist', 12, 'Neuro Plus Hospital', '12 Jayanagar, Bangalore', 'Bangalore', 1000, 4.7,
  'Expert neurologist treating stroke, epilepsy, and movement disorders with compassionate care.'
FROM auth.users WHERE email = 'doctor3@demo.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctor_profiles (id, specialization, experience_years, hospital_name, hospital_address, city, consultation_fee, rating, bio)
SELECT id, 'Pediatrician', 8, 'Child Care Center', '23 Indiranagar, Bangalore', 'Bangalore', 400, 4.9,
  'Warm and caring pediatrician dedicated to child health and development.'
FROM auth.users WHERE email = 'doctor4@demo.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctor_profiles (id, specialization, experience_years, hospital_name, hospital_address, city, consultation_fee, rating, bio)
SELECT id, 'Diabetologist', 14, 'Diabetes Care Clinic', '56 HSR Layout, Bangalore', 'Bangalore', 700, 4.8,
  'Diabetes specialist helping patients manage blood sugar through lifestyle and medication.'
FROM auth.users WHERE email = 'doctor5@demo.com'
ON CONFLICT (id) DO NOTHING;

SELECT 'Doctors seeded: ' || count(*) FROM doctor_profiles;
