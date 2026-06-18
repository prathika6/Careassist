-- =============================================
-- CareAssist Demo Seed Script
-- Run AFTER creating users via Supabase Auth
-- =============================================

-- STEP 1: First create these users in Supabase Auth Dashboard:
-- Authentication → Users → Add User → Create New User
--
-- patient@demo.com      / Demo@1234
-- patient2@demo.com     / Demo@1234  (elder)
-- patient3@demo.com     / Demo@1234  (child)
-- doctor@demo.com       / Demo@1234
-- caregiver@demo.com    / Demo@1234
-- family@demo.com       / Demo@1234
-- admin@demo.com        / Demo@1234
--
-- THEN run this SQL below.
-- =============================================

-- =============================================
-- STEP 2: Insert user_profiles (roles)
-- =============================================

-- Patient 1 (Adult mode)
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'Sarah Johnson', 'patient', '+91-9876543210', 'female'
FROM auth.users WHERE email = 'patient@demo.com'
ON CONFLICT (id) DO UPDATE SET role='patient', full_name='Sarah Johnson';

-- Patient 2 (Elder mode)
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'Robert Singh', 'patient', '+91-9876543211', 'male'
FROM auth.users WHERE email = 'patient2@demo.com'
ON CONFLICT (id) DO UPDATE SET role='patient', full_name='Robert Singh';

-- Patient 3 (Child mode)
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'Maya Patel', 'patient', '+91-9876543212', 'female'
FROM auth.users WHERE email = 'patient3@demo.com'
ON CONFLICT (id) DO UPDATE SET role='patient', full_name='Maya Patel';

-- Doctor
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'Dr. Priya Nair', 'doctor', '+91-9876500001', 'female'
FROM auth.users WHERE email = 'doctor@demo.com'
ON CONFLICT (id) DO UPDATE SET role='doctor', full_name='Dr. Priya Nair';

-- Caregiver
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'James Wilson', 'caregiver', '+91-9876500002', 'male'
FROM auth.users WHERE email = 'caregiver@demo.com'
ON CONFLICT (id) DO UPDATE SET role='caregiver', full_name='James Wilson';

-- Family
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'Ananya Patel', 'family', '+91-9876500003', 'female'
FROM auth.users WHERE email = 'family@demo.com'
ON CONFLICT (id) DO UPDATE SET role='family', full_name='Ananya Patel';

-- Admin
INSERT INTO user_profiles (id, email, full_name, role, phone, gender)
SELECT id, email, 'Admin User', 'admin', '+91-9876500004', 'male'
FROM auth.users WHERE email = 'admin@demo.com'
ON CONFLICT (id) DO UPDATE SET role='admin', full_name='Admin User';

-- =============================================
-- STEP 3: Insert patient records with age modes
-- =============================================

-- Patient 1: Adult mode
INSERT INTO patients (user_id, age_mode, blood_group, invite_code,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
SELECT id, 'adult', 'O+', 'SARAH1',
  'Ananya Patel', '+91-9876500003', 'Sister'
FROM auth.users WHERE email = 'patient@demo.com'
ON CONFLICT (user_id) DO UPDATE SET age_mode='adult', invite_code='SARAH1';

-- Patient 2: Elder mode
INSERT INTO patients (user_id, age_mode, blood_group, invite_code,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
SELECT id, 'elder', 'B+', 'ROBERT',
  'James Wilson', '+91-9876500002', 'Caregiver'
FROM auth.users WHERE email = 'patient2@demo.com'
ON CONFLICT (user_id) DO UPDATE SET age_mode='elder', invite_code='ROBERT';

-- Patient 3: Child mode
INSERT INTO patients (user_id, age_mode, blood_group, invite_code,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
SELECT id, 'child', 'A+', 'MAYA12',
  'Ananya Patel', '+91-9876500003', 'Mother'
FROM auth.users WHERE email = 'patient3@demo.com'
ON CONFLICT (user_id) DO UPDATE SET age_mode='child', invite_code='MAYA12';

-- =============================================
-- STEP 4: Link doctor to all 3 patients
-- =============================================

INSERT INTO patient_doctors (patient_id, doctor_id, is_primary)
SELECT p.id, d.id, true
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users d ON d.email = 'doctor@demo.com'
WHERE pu.email IN ('patient@demo.com','patient2@demo.com','patient3@demo.com')
ON CONFLICT (patient_id, doctor_id) DO NOTHING;

-- =============================================
-- STEP 5: Link caregiver to all 3 patients
-- =============================================

INSERT INTO patient_caregivers (patient_id, caregiver_id, is_primary)
SELECT p.id, c.id, true
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users c ON c.email = 'caregiver@demo.com'
WHERE pu.email IN ('patient@demo.com','patient2@demo.com','patient3@demo.com')
ON CONFLICT (patient_id, caregiver_id) DO NOTHING;

-- =============================================
-- STEP 6: Link family to all 3 patients
-- =============================================

INSERT INTO family_members (patient_id, family_user_id, relationship)
SELECT p.id, f.id,
  CASE pu.email
    WHEN 'patient@demo.com'  THEN 'Sister'
    WHEN 'patient2@demo.com' THEN 'Daughter'
    WHEN 'patient3@demo.com' THEN 'Mother'
  END
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users f ON f.email = 'family@demo.com'
WHERE pu.email IN ('patient@demo.com','patient2@demo.com','patient3@demo.com')
ON CONFLICT (patient_id, family_user_id) DO NOTHING;

-- =============================================
-- STEP 7: Add a demo prescription + medicines
-- =============================================

INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, notes, start_date, is_active)
SELECT p.id, d.id,
  'Hypertension & Vitamin D Deficiency',
  'Monitor BP daily. Take medicines on time.',
  CURRENT_DATE, true
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users d ON d.email = 'doctor@demo.com'
WHERE pu.email = 'patient@demo.com'
LIMIT 1;

-- Add medicines to that prescription
INSERT INTO medicine_reminders (prescription_id, patient_id, medicine_name, dosage, frequency, times, before_food, duration_days, doctor_notes, is_active)
SELECT pr.id, pr.patient_id,
  'Amlodipine', '5mg', 'once', ARRAY['8:00 AM'], false, 30,
  'Take daily for blood pressure control', true
FROM prescriptions pr
JOIN patients p ON p.id = pr.patient_id
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'patient@demo.com' AND pr.diagnosis LIKE '%Hypertension%'
LIMIT 1;

INSERT INTO medicine_reminders (prescription_id, patient_id, medicine_name, dosage, frequency, times, before_food, duration_days, doctor_notes, is_active)
SELECT pr.id, pr.patient_id,
  'Vitamin D3', '60000 IU', 'weekly', ARRAY['Sunday 9:00 AM'], false, 84,
  'Take once a week with breakfast', true
FROM prescriptions pr
JOIN patients p ON p.id = pr.patient_id
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'patient@demo.com' AND pr.diagnosis LIKE '%Hypertension%'
LIMIT 1;

-- =============================================
-- STEP 8: Add demo health record
-- =============================================

INSERT INTO health_records (patient_id, recorded_by, bp_systolic, bp_diastolic,
  blood_sugar, oxygen_level, heart_rate, temperature, food_intake, notes, alert_level)
SELECT p.id, c.id,
  128, 84, 115, 97, 78, 37.1,
  'Breakfast: Idli sambar. Lunch: Rice dal.',
  'Patient is stable. Mild headache reported in the morning.', 1
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users c ON c.email = 'caregiver@demo.com'
WHERE pu.email = 'patient@demo.com'
LIMIT 1;

-- =============================================
-- STEP 9: Add a demo appointment
-- =============================================

INSERT INTO appointments (patient_id, doctor_id, requested_by,
  appointment_date, appointment_time, reason, urgency_level, consultation_type, status)
SELECT p.id, d.id, p.user_id,
  CURRENT_DATE + INTERVAL '3 days',
  '10:30:00',
  'Regular BP check-up and medication review',
  'normal', 'offline', 'accepted'
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users d ON d.email = 'doctor@demo.com'
WHERE pu.email = 'patient@demo.com'
LIMIT 1;

-- =============================================
-- STEP 10: Add demo family chat messages
-- =============================================

INSERT INTO family_chat_messages (patient_id, sender_id, message, message_type)
SELECT p.id, f.id,
  'Hi Sarah! We are all thinking of you. Stay strong! 💖', 'text'
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users f ON f.email = 'family@demo.com'
WHERE pu.email = 'patient@demo.com'
LIMIT 1;

INSERT INTO family_messages (patient_id, sender_id, message, message_type, occasion)
SELECT p.id, f.id,
  'Wishing you a peaceful and restful day. We love you so much! 🌸',
  'text', 'Just Because'
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users f ON f.email = 'family@demo.com'
WHERE pu.email = 'patient@demo.com'
LIMIT 1;

-- =============================================
-- STEP 11: Add demo mood logs
-- =============================================

INSERT INTO mood_logs (patient_id, mood_score, mood_label, logged_at)
SELECT p.id, 7, 'Good', NOW() - INTERVAL '1 day'
FROM patients p JOIN auth.users u ON u.id = p.user_id WHERE u.email = 'patient@demo.com' LIMIT 1;

INSERT INTO mood_logs (patient_id, mood_score, mood_label, logged_at)
SELECT p.id, 5, 'Okay', NOW() - INTERVAL '2 days'
FROM patients p JOIN auth.users u ON u.id = p.user_id WHERE u.email = 'patient@demo.com' LIMIT 1;

INSERT INTO mood_logs (patient_id, mood_score, mood_label, logged_at)
SELECT p.id, 9, 'Great', NOW() - INTERVAL '3 days'
FROM patients p JOIN auth.users u ON u.id = p.user_id WHERE u.email = 'patient@demo.com' LIMIT 1;

-- =============================================
-- STEP 12: Add demo memory
-- =============================================

INSERT INTO memory_vault (patient_id, added_by, title, description, memory_date, tags)
SELECT p.id, f.id,
  'Family Picnic 2024',
  'We had the most wonderful picnic at the park. Everyone was there — it was a perfect sunny day.',
  '2024-04-15',
  ARRAY['family','outdoor','summer']
FROM patients p
JOIN auth.users pu ON pu.id = p.user_id
JOIN auth.users f ON f.email = 'family@demo.com'
WHERE pu.email = 'patient@demo.com'
LIMIT 1;

-- =============================================
-- VERIFICATION: Check what was created
-- =============================================

SELECT 'user_profiles' as tbl, count(*) FROM user_profiles
UNION ALL SELECT 'patients', count(*) FROM patients
UNION ALL SELECT 'patient_doctors', count(*) FROM patient_doctors
UNION ALL SELECT 'patient_caregivers', count(*) FROM patient_caregivers
UNION ALL SELECT 'family_members', count(*) FROM family_members
UNION ALL SELECT 'medicine_reminders', count(*) FROM medicine_reminders
UNION ALL SELECT 'appointments', count(*) FROM appointments
UNION ALL SELECT 'mood_logs', count(*) FROM mood_logs;
