import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null); setProfile(null); setPatientRecord(null); setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      // First try to get existing profile
      const { data, error } = await supabase
        .from('user_profiles').select('*').eq('id', userId).maybeSingle();

      if (error) throw error;

      if (!data) {
        // Profile doesn't exist yet (email confirmation flow) — wait
        setLoading(false);
        return;
      }

      setProfile(data);

      if (data.role === 'patient') {
        // fetch or create patient record
        const { data: pr } = await supabase
          .from('patients').select('*').eq('user_id', userId).maybeSingle();
        if (pr) {
          setPatientRecord(pr);
        } else {
          // auto-create patient record if missing
          const { data: newPr } = await supabase
            .from('patients').insert({ user_id: userId, age_mode: 'adult' }).select().single();
          if (newPr) setPatientRecord(newPr);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      // Generate a unique invite code for patients
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        email,
        full_name: userData.fullName,
        role: userData.role,
        phone: userData.phone || null,
        date_of_birth: userData.dateOfBirth || null,
        gender: userData.gender || null,
      });
      if (profileError) throw profileError;

      if (userData.role === 'patient') {
        const { error: patientError } = await supabase.from('patients').insert({
          user_id: data.user.id,
          age_mode: userData.ageMode || 'adult',
          date_of_birth: userData.dateOfBirth || null,
          blood_group: userData.bloodGroup || null,
          emergency_contact_name: userData.emergencyContactName || null,
          emergency_contact_phone: userData.emergencyContactPhone || null,
          emergency_contact_relationship: userData.emergencyContactRelationship || null,
          invite_code: inviteCode,
        });
        if (patientError) throw patientError;
      }
    }
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const refreshProfile = () => { if (user) fetchProfile(user.id); };

  const updateProfile = async (updates) => {
    const { error } = await supabase.from('user_profiles').update(updates).eq('id', user.id);
    if (error) throw error;
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const updatePatientMode = async (ageMode) => {
    if (!patientRecord?.id) return;
    const { error } = await supabase.from('patients').update({ age_mode: ageMode }).eq('id', patientRecord.id);
    if (error) throw error;
    setPatientRecord(prev => ({ ...prev, age_mode: ageMode }));
  };

  return (
    <AuthContext.Provider value={{
      user, profile, patientRecord, loading,
      signUp, signIn, signOut, refreshProfile, updateProfile, updatePatientMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
