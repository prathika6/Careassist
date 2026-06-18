-- ============================================================
-- CareAssist v2.0 — Additional Schema
-- Run this AFTER the original supabase_schema.sql
-- ============================================================

-- ── Doctor Profiles (extended) ──────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  specialization TEXT,
  experience_years INTEGER DEFAULT 0,
  hospital_name TEXT,
  hospital_address TEXT,
  city TEXT,
  consultation_fee DECIMAL DEFAULT 0,
  rating DECIMAL DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  photo_url TEXT,
  bio TEXT,
  available_days TEXT[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
  slot_duration_minutes INTEGER DEFAULT 30,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Doctor Time Slots ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  appointment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, slot_date, slot_time)
);

-- ── Notifications (unified) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('app','sms','whatsapp','email')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Emergency Events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES user_profiles(id),
  latitude DECIMAL,
  longitude DECIMAL,
  location_address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','resolved','false_alarm')),
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Realtime Chat Messages (enhanced) ───────────────────────
ALTER TABLE family_chat_messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_to UUID;

-- ── Medicine Snooze ──────────────────────────────────────────
ALTER TABLE medicine_logs
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

-- ── Doctor Profile Seed ──────────────────────────────────────
INSERT INTO doctor_profiles (id, specialization, experience_years, hospital_name, hospital_address, city, consultation_fee, rating, bio)
SELECT id, 'General Physician', 10, 'City Care Hospital', '12 MG Road, Bangalore', 'Bangalore', 500, 4.8,
  'Compassionate general physician with 10 years of experience in patient-centered care.'
FROM user_profiles WHERE email = 'doctor@demo.com'
ON CONFLICT (id) DO NOTHING;

-- ── RLS Policies ────────────────────────────────────────────
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctor profiles viewable by all" ON doctor_profiles FOR SELECT USING (true);
CREATE POLICY "Doctors can update own profile" ON doctor_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Slots viewable by authenticated" ON doctor_slots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage slots" ON doctor_slots FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Notification logs viewable by owner" ON notification_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications" ON notification_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Emergency events by authenticated" ON emergency_events FOR ALL USING (auth.role() = 'authenticated');

-- ── Enable Realtime ──────────────────────────────────────────
-- Go to Supabase → Database → Replication → enable these tables:
-- family_chat_messages, notifications, emergency_events, medicine_logs
