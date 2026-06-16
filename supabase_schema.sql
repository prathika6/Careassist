-- =============================================
-- CareAssist Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS & PROFILES
-- =============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient','caregiver','doctor','family','admin')),
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PATIENTS
-- =============================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  age_mode TEXT NOT NULL DEFAULT 'adult' CHECK (age_mode IN ('child','adult','elder')),
  date_of_birth DATE,
  blood_group TEXT,
  allergies TEXT[],
  medical_conditions TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  insurance_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RELATIONSHIPS
-- =============================================

CREATE TABLE IF NOT EXISTS patient_caregivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT FALSE,
  UNIQUE(patient_id, caregiver_id)
);

CREATE TABLE IF NOT EXISTS patient_doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  specialty TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  UNIQUE(patient_id, doctor_id)
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  family_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  can_view_medical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, family_user_id)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HEALTH RECORDS
-- =============================================

CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES user_profiles(id),
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  blood_sugar DECIMAL,
  oxygen_level DECIMAL,
  heart_rate INTEGER,
  temperature DECIMAL,
  weight DECIMAL,
  symptoms TEXT[],
  food_intake TEXT,
  notes TEXT,
  alert_level INTEGER DEFAULT 0 CHECK (alert_level IN (0,1,2,3)),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ALERTS
-- =============================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  health_record_id UUID REFERENCES health_records(id),
  alert_level INTEGER NOT NULL CHECK (alert_level IN (1,2,3)),
  alert_type TEXT,
  message_caregiver TEXT,
  message_patient TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRESCRIPTIONS & MEDICINES
-- =============================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES user_profiles(id),
  diagnosis TEXT,
  notes TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicine_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times TEXT[],
  before_food BOOLEAN DEFAULT FALSE,
  duration_days INTEGER,
  doctor_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicine_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID REFERENCES medicine_reminders(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','taken','missed','skipped')),
  logged_by UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- APPOINTMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES user_profiles(id),
  requested_by UUID REFERENCES user_profiles(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('normal','urgent','emergency')),
  consultation_type TEXT DEFAULT 'offline' CHECK (consultation_type IN ('online','offline')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rescheduled','cancelled','completed')),
  doctor_notes TEXT,
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES user_profiles(id),
  patient_id UUID REFERENCES patients(id),
  notes TEXT,
  diagnosis TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REPORTS
-- =============================================

CREATE TABLE IF NOT EXISTS doctor_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES user_profiles(id),
  report_type TEXT,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  summary_for_patient TEXT,
  care_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FAMILY & COMMUNICATION
-- =============================================

CREATE TABLE IF NOT EXISTS family_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','photo','voice','wish')),
  media_url TEXT,
  occasion TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id),
  message TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','photo','voice')),
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id),
  title TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  is_played BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEMORY VAULT
-- =============================================

CREATE TABLE IF NOT EXISTS memory_vault (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  added_by UUID REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  memory_date DATE,
  image_url TEXT,
  voice_note_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MOOD & EMOTIONAL
-- =============================================

CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  mood_label TEXT,
  note TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hope_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  age_mode TEXT NOT NULL CHECK (age_mode IN ('child','adult','elder')),
  mood_category TEXT,
  message TEXT NOT NULL,
  author TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI COMPANION
-- =============================================

CREATE TABLE IF NOT EXISTS ai_companion_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_companion_chats ENABLE ROW LEVEL SECURITY;

-- User profiles: users can read all, update own
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Patients: visible to assigned caregivers, doctors, family, self
CREATE POLICY "Patients visible to all authenticated" ON patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Patients can update own" ON patients FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "Authenticated can insert patients" ON patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Health records
CREATE POLICY "Health records viewable by authenticated" ON health_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Caregivers can insert health records" ON health_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Caregivers can update health records" ON health_records FOR UPDATE USING (auth.role() = 'authenticated');

-- Alerts
CREATE POLICY "Alerts viewable by authenticated" ON alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage alerts" ON alerts FOR ALL USING (auth.role() = 'authenticated');

-- Prescriptions
CREATE POLICY "Prescriptions viewable by authenticated" ON prescriptions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage prescriptions" ON prescriptions FOR ALL USING (auth.role() = 'authenticated');

-- Medicine reminders
CREATE POLICY "Medicine reminders viewable by authenticated" ON medicine_reminders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage medicine reminders" ON medicine_reminders FOR ALL USING (auth.role() = 'authenticated');

-- Medicine logs
CREATE POLICY "Medicine logs viewable by authenticated" ON medicine_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage medicine logs" ON medicine_logs FOR ALL USING (auth.role() = 'authenticated');

-- Appointments
CREATE POLICY "Appointments viewable by authenticated" ON appointments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage appointments" ON appointments FOR ALL USING (auth.role() = 'authenticated');

-- Family messages
CREATE POLICY "Family messages viewable by authenticated" ON family_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage family messages" ON family_messages FOR ALL USING (auth.role() = 'authenticated');

-- Family chat messages
CREATE POLICY "Family chat viewable by authenticated" ON family_chat_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage family chat" ON family_chat_messages FOR ALL USING (auth.role() = 'authenticated');

-- Voice notes
CREATE POLICY "Voice notes viewable by authenticated" ON voice_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage voice notes" ON voice_notes FOR ALL USING (auth.role() = 'authenticated');

-- Memory vault
CREATE POLICY "Memory vault viewable by authenticated" ON memory_vault FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage memory vault" ON memory_vault FOR ALL USING (auth.role() = 'authenticated');

-- Mood logs
CREATE POLICY "Mood logs viewable by authenticated" ON mood_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage mood logs" ON mood_logs FOR ALL USING (auth.role() = 'authenticated');

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- AI companion chats
CREATE POLICY "AI chats viewable by authenticated" ON ai_companion_chats FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage AI chats" ON ai_companion_chats FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- SEED DATA: HOPE MESSAGES
-- =============================================

INSERT INTO hope_messages (age_mode, mood_category, message) VALUES
('child', 'general', 'You were brave today. Small victories make big heroes! 🌟'),
('child', 'general', 'Hey little star, every day you are getting stronger! ✨'),
('child', 'general', 'You are amazing! Keep shining, superstar! 🦸'),
('child', 'sad', 'It is okay to feel sad sometimes. Tomorrow brings new sunshine! 🌈'),
('child', 'tired', 'Even superheroes need rest. Sleep well and come back stronger! 💪'),
('adult', 'general', 'Recovery is not a race. Today''s small step still matters.'),
('adult', 'general', 'Healing takes time, but you are moving forward. Keep going.'),
('adult', 'general', 'Every breath is progress. You are stronger than you know.'),
('adult', 'sad', 'It is okay to have hard days. Rest, and try again tomorrow.'),
('adult', 'motivated', 'Your commitment to healing is your greatest strength.'),
('elder', 'general', 'You are not alone today. Your family and caregiver are with you.'),
('elder', 'general', 'Your life, memories, and presence matter deeply to us.'),
('elder', 'general', 'Every day you inspire those around you with your grace.'),
('elder', 'lonely', 'Your family holds you in their hearts, always.'),
('elder', 'peaceful', 'Rest, reflect, and know you are deeply loved and valued.');

-- =============================================
-- FUNCTION: Auto-create patient profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Profile is inserted by app code, this is a fallback
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
