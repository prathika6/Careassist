-- Run this in Supabase SQL Editor

-- Add invite_code to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate codes for existing patients
UPDATE patients SET invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)) WHERE invite_code IS NULL;

-- Connection requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('doctor','caregiver','family')),
  relationship TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, requester_id)
);

ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection requests viewable by authenticated" ON connection_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage connection requests" ON connection_requests
  FOR ALL USING (auth.role() = 'authenticated');
