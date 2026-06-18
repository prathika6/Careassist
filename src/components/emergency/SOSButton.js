import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { triggerEmergencyAlerts } from '../../services/notifications';

export default function SOSButton() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [activating, setActivating] = useState(false);

  // Only show for patients
  if (profile?.role !== 'patient') return null;

  const startSOS = () => {
    setShowModal(true);
    setCountdown(5);
  };

  useEffect(() => {
    if (!showModal || countdown === 0) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown, showModal]);

  useEffect(() => {
    if (showModal && countdown === 0 && !activating && !active) {
      activateSOS();
    }
  }, [countdown, showModal]);

  const cancelSOS = () => { setShowModal(false); setCountdown(0); };

  const activateSOS = async () => {
    setActivating(true);
    try {
      // Get GPS location
      let lat = null, lng = null, address = null;
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        address = `https://maps.google.com/?q=${lat},${lng}`;
      } catch { address = 'Location unavailable'; }

      // Save emergency event
      const { data: event } = await supabase.from('emergency_events').insert({
        patient_id: patientRecord.id,
        triggered_by: profile.id,
        latitude: lat, longitude: lng,
        location_address: address,
        status: 'active',
      }).select().single();

      // Get emergency contacts
      const { data: contacts } = await supabase.from('emergency_contacts')
        .select('*').eq('patient_id', patientRecord.id);

      // Get caregivers
      const { data: caregivers } = await supabase.from('patient_caregivers')
        .select('caregiver:caregiver_id(full_name,phone,id)').eq('patient_id', patientRecord.id);

      const allContacts = [
        ...(contacts || []),
        ...(caregivers || []).map(c => ({ name: c.caregiver?.full_name, phone: c.caregiver?.phone, user_id: c.caregiver?.id }))
      ].filter(c => c?.phone);

      await triggerEmergencyAlerts({
        patientId: patientRecord.id,
        patient: { full_name: profile.full_name },
        location: { latitude: lat, longitude: lng, address },
        emergencyContacts: allContacts,
      });

      setActive(true);
      setShowModal(false);
      toast.error('🚨 SOS Activated! Your care team has been alerted.');
    } catch (err) {
      toast.error('Could not activate SOS: ' + err.message);
    } finally { setActivating(false); }
  };

  const resolveEmergency = async () => {
    try {
      await supabase.from('emergency_events')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: profile.id })
        .eq('patient_id', patientRecord.id).eq('status', 'active');
      setActive(false);
      toast.success('Emergency resolved. Your care team has been notified.');
    } catch { toast.error('Could not resolve emergency'); }
  };

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={active ? resolveEmergency : startSOS}
        style={{
          position: 'fixed', bottom: 30, right: 24, zIndex: 999,
          width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: active ? '#166534' : '#dc2626',
          color: 'white', fontWeight: 900, fontSize: 13,
          boxShadow: active ? '0 0 0 8px #bbf7d030, 0 8px 32px rgba(22,101,52,0.4)' : '0 0 0 8px #fca5a530, 0 8px 32px rgba(220,38,38,0.4)',
          animation: active ? 'none' : 'sosPulse 2s infinite',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2,
          transition: 'all 0.3s',
        }}
        title={active ? 'Emergency active — tap to resolve' : 'Emergency SOS'}
      >
        {active ? <>✓<div style={{ fontSize:9 }}>SAFE</div></> : <>🆘<div style={{ fontSize:9 }}>SOS</div></>}
      </button>

      {/* Countdown Modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:28, padding:40, textAlign:'center', maxWidth:340, width:'100%' }}>
            <div style={{ fontSize:64, marginBottom:12 }}>🚨</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:'#dc2626', marginBottom:8 }}>SOS Activating</h2>
            <p style={{ color:'#6b7280', marginBottom:24, fontSize:14 }}>Your caregiver, family, and emergency contacts will be alerted with your location.</p>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'#fef2f2', border:'4px solid #dc2626', margin:'0 auto 24px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, fontWeight:900, color:'#dc2626' }}>
              {countdown}
            </div>
            <button onClick={cancelSOS} style={{ width:'100%', padding:'16px', borderRadius:20, border:'2px solid #e5e7eb', background:'white', fontWeight:800, fontSize:16, cursor:'pointer', color:'#374151' }}>
              Cancel — I'm Okay
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sosPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5), 0 8px 32px rgba(220,38,38,0.4); }
          50% { box-shadow: 0 0 0 16px rgba(220,38,38,0), 0 8px 32px rgba(220,38,38,0.4); }
        }
      `}</style>
    </>
  );
}
