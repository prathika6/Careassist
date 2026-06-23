import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { MapPin, Phone, Navigation } from 'lucide-react';

const EMERGENCY_NUMBERS = [
  { label:'Ambulance',      number:'108', icon:'🚑', color:'#dc2626', desc:'Medical emergency' },
  { label:'Police',         number:'100', icon:'🚔', color:'#1d4ed8', desc:'Law & safety' },
  { label:'Fire',           number:'101', icon:'🚒', color:'#ea580c', desc:'Fire emergency' },
  { label:'Disaster',       number:'108', icon:'⛑️', color:'#065f46', desc:'NDRF helpline' },
  { label:'Women Helpline', number:'1091',icon:'🆘', color:'#7c3aed', desc:'Women in distress' },
  { label:'Child Helpline', number:'1098',icon:'🧒', color:'#0891b2', desc:'Child in danger' },
  { label:'Senior Citizen', number:'14567',icon:'👴',color:'#92400e', desc:'Elder helpline' },
  { label:'Mental Health',  number:'iCall: 9152987821',icon:'🧠',color:'#6d28d9', desc:'Crisis support' },
];

const NEARBY_HOSPITALS = [
  { name:'Apollo Hospitals',       distance:'1.2 km', phone:'+91-80-26304050', type:'Multi-specialty', emergency:true,  address:'Bannerghatta Road, Bangalore' },
  { name:'Fortis Hospital',        distance:'2.1 km', phone:'+91-80-66214444', type:'Multi-specialty', emergency:true,  address:'Bannerghatta Road, Bangalore' },
  { name:'Manipal Hospital',       distance:'2.8 km', phone:'+91-80-25024444', type:'Super-specialty', emergency:true,  address:'HAL Airport Road, Bangalore' },
  { name:'Narayana Health City',   distance:'3.4 km', phone:'+91-80-71222200', type:'Cardiac center',  emergency:true,  address:'Hosur Road, Bangalore' },
  { name:'Columbia Asia Hospital', distance:'4.1 km', phone:'+91-80-71787878', type:'Multi-specialty', emergency:true,  address:'Kirloskar Business Park, Bangalore' },
  { name:'Sakra World Hospital',   distance:'4.6 km', phone:'+91-80-49694969', type:'Multi-specialty', emergency:false, address:'Devarabisanahalli, Bangalore' },
];

export default function EmergencyScreen() {
  const { patientRecord, profile } = useAuth();
  const toast = useToast();
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState('numbers');

  useEffect(() => { if (patientRecord?.id) loadData(); }, [patientRecord]);

  const loadData = async () => {
    const [contacts, events] = await Promise.all([
      supabase.from('emergency_contacts').select('*').eq('patient_id', patientRecord.id).order('priority'),
      supabase.from('emergency_events').select('*').eq('patient_id', patientRecord.id).eq('status','active'),
    ]);
    setEmergencyContacts(contacts.data || []);
    setActiveEvents(events.data || []);
  };

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
        toast.success('Location captured!');
      },
      () => { toast.error('Could not get location. Please enable GPS.'); setGettingLocation(false); }
    );
  };

  const TABS = [
    { key:'numbers',   label:'📞 Emergency Numbers' },
    { key:'hospitals', label:'🏥 Nearby Hospitals' },
    { key:'contacts',  label:'👥 My Contacts' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🆘 Emergency</h2>
        <p className="page-subtitle">Quick access to emergency services, hospitals and contacts</p>
      </div>

      {/* Active Emergency Banner */}
      {activeEvents.length > 0 && (
        <div style={{background:'#fef2f2',border:'3px solid #dc2626',borderRadius:20,padding:20,marginBottom:20,animation:'pulse 2s infinite'}}>
          <div style={{fontWeight:800,color:'#dc2626',fontSize:18,marginBottom:4}}>🚨 SOS Active</div>
          <p style={{color:'#374151',fontSize:14}}>Your emergency alert is active. Your care team and contacts have been notified.</p>
          <p style={{fontSize:12,color:'#9ca3af',marginTop:4}}>Press the SOS button again to resolve.</p>
        </div>
      )}

      {/* Location Card */}
      <div style={{background:'linear-gradient(135deg,#eff6ff,#dbeafe)',border:'2px solid #bfdbfe',borderRadius:20,padding:20,marginBottom:24,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📍 Your Location</div>
          {location ? (
            <div>
              <div style={{fontSize:13,color:'#1d4ed8',fontWeight:600}}>GPS captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>
              <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:'#0ea5e9',display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                <Navigation size={12}/> Open in Google Maps
              </a>
            </div>
          ) : (
            <div style={{fontSize:13,color:'#6b7280'}}>Enable GPS to share your location with emergency services</div>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={getLocation} disabled={gettingLocation}>
          <MapPin size={14}/> {gettingLocation ? 'Getting...' : location ? 'Refresh Location' : 'Get My Location'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'10px 18px',borderRadius:20,border:'2px solid',fontWeight:700,fontSize:13,cursor:'pointer',borderColor:activeTab===t.key?'#dc2626':'#e5e7eb',background:activeTab===t.key?'#fef2f2':'white',color:activeTab===t.key?'#dc2626':'#374151'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Emergency Numbers */}
      {activeTab==='numbers' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
          {EMERGENCY_NUMBERS.map(e=>(
            <a key={e.number} href={`tel:${e.number}`}
              style={{display:'flex',flexDirection:'column',alignItems:'center',padding:20,borderRadius:20,border:`2px solid ${e.color}30`,background:e.color+'08',textDecoration:'none',transition:'all 0.2s',cursor:'pointer'}}>
              <div style={{fontSize:32,marginBottom:8}}>{e.icon}</div>
              <div style={{fontWeight:900,fontSize:20,color:e.color,marginBottom:2}}>{e.number}</div>
              <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:2}}>{e.label}</div>
              <div style={{fontSize:11,color:'#9ca3af',textAlign:'center'}}>{e.desc}</div>
            </a>
          ))}
        </div>
      )}

      {/* Nearby Hospitals */}
      {activeTab==='hospitals' && (
        <div>
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:12,marginBottom:16,fontSize:13,color:'#92400e'}}>
            💡 Showing hospitals near Bangalore. For real-time distances, add <code style={{background:'#fef3c7',padding:'1px 6px',borderRadius:4}}>REACT_APP_GOOGLE_MAPS_KEY</code> to your .env
          </div>
          {NEARBY_HOSPITALS.map((h,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:16,background:'white',borderRadius:16,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid #f3f4f6'}}>
              <div style={{width:50,height:50,borderRadius:14,background:h.emergency?'#fef2f2':'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🏥</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <div style={{fontWeight:700,fontSize:15}}>{h.name}</div>
                  {h.emergency && <span style={{background:'#fef2f2',color:'#dc2626',fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:700}}>24/7 ER</span>}
                </div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{h.type} · {h.distance}</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>{h.address}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <a href={`tel:${h.phone}`} style={{padding:'8px 14px',borderRadius:20,background:'#dc2626',color:'white',fontWeight:700,fontSize:12,textDecoration:'none',textAlign:'center',display:'flex',alignItems:'center',gap:4}}>
                  <Phone size={12}/> Call
                </a>
                {location && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(h.name+' '+h.address)}`} target="_blank" rel="noreferrer"
                    style={{padding:'6px 12px',borderRadius:20,background:'#eff6ff',color:'#1d4ed8',fontWeight:700,fontSize:11,textDecoration:'none',textAlign:'center'}}>
                    Map
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emergency Contacts */}
      {activeTab==='contacts' && (
        <div>
          {emergencyContacts.length===0 ? (
            <div className="card empty-state">
              <div style={{fontSize:48}}>👥</div>
              <p className="empty-state-text">No emergency contacts added yet.</p>
              <p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>Go to Settings → Emergency Contacts to add them.</p>
            </div>
          ) : emergencyContacts.map(c=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:14,padding:16,background:'white',borderRadius:16,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'2px solid #fed7aa'}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'#fff9f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>❤️</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{c.name}</div>
                <div style={{fontSize:13,color:'#f97316',fontWeight:600}}>{c.relationship}</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{c.phone}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <a href={`tel:${c.phone}`} style={{padding:'8px 16px',borderRadius:20,background:'#166534',color:'white',fontWeight:700,fontSize:13,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>
                  <Phone size={12}/> Call
                </a>
                <span style={{background:'#eff6ff',color:'#0369a1',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,textAlign:'center'}}>Priority {c.priority}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
    </div>
  );
}
