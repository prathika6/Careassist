import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const EMERGENCY_NUMBERS = [
  { label: 'Ambulance', number: '108', icon: '🚑', color: '#dc2626' },
  { label: 'Police', number: '100', icon: '🚔', color: '#1d4ed8' },
  { label: 'Fire', number: '101', icon: '🚒', color: '#ea580c' },
  { label: 'Women Helpline', number: '1091', icon: '🆘', color: '#7c3aed' },
  { label: 'Disaster', number: '1078', icon: '⛑️', color: '#065f46' },
];

export default function EmergencyScreen() {
  const { patientRecord, profile } = useAuth();
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [nearbyHospitals] = useState([
    { name: 'City Care Hospital', distance: '1.2 km', phone: '+91-80-12345678', type: 'Multi-specialty' },
    { name: 'Apollo Clinic', distance: '2.4 km', phone: '+91-80-87654321', type: 'Clinic' },
    { name: 'NIMHANS', distance: '3.1 km', phone: '+91-80-46110007', type: 'Government' },
  ]);

  useEffect(() => { if (patientRecord?.id) loadData(); }, [patientRecord]);

  const loadData = async () => {
    const [contacts, events] = await Promise.all([
      supabase.from('emergency_contacts').select('*').eq('patient_id', patientRecord.id).order('priority'),
      supabase.from('emergency_events').select('*').eq('patient_id', patientRecord.id).eq('status','active'),
    ]);
    setEmergencyContacts(contacts.data || []);
    setActiveEvents(events.data || []);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🆘 Emergency</h2>
        <p className="page-subtitle">Quick access to emergency services and contacts</p>
      </div>

      {/* Active Emergency Banner */}
      {activeEvents.length > 0 && (
        <div style={{ background:'#fef2f2', border:'3px solid #dc2626', borderRadius:20, padding:20, marginBottom:20 }}>
          <div style={{ fontWeight:800, color:'#dc2626', fontSize:16, marginBottom:4 }}>🚨 Active Emergency Alert</div>
          <p style={{ color:'#374151', fontSize:14 }}>Your emergency SOS is active. Your care team has been notified.</p>
        </div>
      )}

      {/* Emergency Numbers */}
      <div className="card mb-5">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📞 Emergency Numbers</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
          {EMERGENCY_NUMBERS.map(e => (
            <a key={e.number} href={`tel:${e.number}`}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:16, borderRadius:16, border:`2px solid ${e.color}30`, background:e.color+'08', textDecoration:'none', cursor:'pointer', transition:'all 0.2s' }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{e.icon}</div>
              <div style={{ fontWeight:800, fontSize:16, color:e.color }}>{e.number}</div>
              <div style={{ fontSize:11, color:'#6b7280', fontWeight:600, marginTop:2 }}>{e.label}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Nearby Hospitals */}
      <div className="card mb-5">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>🏥 Nearby Hospitals</h3>
        <p style={{ fontSize:12, color:'#9ca3af', marginBottom:12 }}>Based on your registered location. Enable GPS for real-time results.</p>
        {nearbyHospitals.map((h,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🏥</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{h.name}</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>{h.type} · {h.distance}</div>
            </div>
            <a href={`tel:${h.phone}`} style={{ padding:'8px 14px', borderRadius:20, background:'#dc2626', color:'white', fontWeight:700, fontSize:12, textDecoration:'none' }}>
              Call
            </a>
          </div>
        ))}
        <p style={{ fontSize:11, color:'#d1d5db', marginTop:12 }}>
          * Real hospital data: integrate Google Places API with key REACT_APP_GOOGLE_MAPS_KEY
        </p>
      </div>

      {/* Emergency Contacts */}
      <div className="card">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>👥 My Emergency Contacts</h3>
        {emergencyContacts.length === 0 ? (
          <p style={{ color:'#9ca3af', fontSize:14 }}>No emergency contacts added yet. Add them in Profile Settings.</p>
        ) : emergencyContacts.map(c => (
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'#fff9f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>❤️</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>{c.relationship} · {c.phone}</div>
            </div>
            <a href={`tel:${c.phone}`} style={{ padding:'8px 14px', borderRadius:20, background:'#166534', color:'white', fontWeight:700, fontSize:12, textDecoration:'none' }}>
              Call
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
