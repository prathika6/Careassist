import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setPatientRecord(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);

      if (data.role === 'patient') {
        await fetchPatientRecord(userId);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientRecord = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error) setPatientRecord(data);
    } catch (err) {
      console.error('Error fetching patient record:', err);
    }
  };

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: userData.fullName,
          role: userData.role,
          phone: userData.phone || null,
          date_of_birth: userData.dateOfBirth || null,
          gender: userData.gender || null,
        });
      if (profileError) throw profileError;

      // If patient, create patient record
      if (userData.role === 'patient') {
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            user_id: data.user.id,
            age_mode: userData.ageMode || 'adult',
            date_of_birth: userData.dateOfBirth || null,
            blood_group: userData.bloodGroup || null,
            emergency_contact_name: userData.emergencyContactName || null,
            emergency_contact_phone: userData.emergencyContactPhone || null,
            emergency_contact_relationship: userData.emergencyContactRelationship || null,
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = () => {
    if (user) fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      patientRecord,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
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
