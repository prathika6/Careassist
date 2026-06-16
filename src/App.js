import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Sidebar from './components/shared/Sidebar';
import AuthPage from './components/auth/AuthPage';

// Patient
import PatientHome from './components/patient/PatientHome';
import AICompanion from './components/patient/AICompanion';
import MedicineReminders from './components/patient/MedicineReminders';
import MemoryVault from './components/patient/MemoryVault';
import HopeWellness from './components/patient/HopeWellness';

// Shared
import FamilyChat from './components/shared/FamilyChat';
import Appointments from './components/shared/Appointments';
import VoiceNotes from './components/shared/VoiceNotes';

// Family & Caregiver & Doctor & Admin
import { FamilyDashboard } from './components/family/FamilyDashboard';
import CaregiverDashboard from './components/caregiver/CaregiverDashboard';
import DoctorDashboard from './components/doctor/DoctorDashboard';
import AdminDashboard from './components/admin/AdminDashboard';

/* ────── Lightweight inline pages ────── */

function MoodJournal() {
  const { patientRecord } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const mode = patientRecord?.age_mode || 'adult';
  useEffect(() => {
    if (!patientRecord?.id) { setLoading(false); return; }
    supabase.from('mood_logs').select('*').eq('patient_id', patientRecord.id)
      .order('logged_at', { ascending: false }).limit(30)
      .then(({ data }) => { setEntries(data || []); setLoading(false); });
  }, [patientRecord]);
  const EMOJI = { 9:'😊',7:'🙂',5:'😐',3:'😔',1:'😢' };
  const getE = (s) => { const k=[9,7,5,3,1].reduce((a,b)=>Math.abs(b-s)<Math.abs(a-s)?b:a); return EMOJI[k]||'🙂'; };
  if (loading) return <div className="loading-spinner"/>;
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{mode==='child'?'🌈 My Feelings':'😊 Mood Journal'}</h2>
        <p className="page-subtitle">Your emotional journey over time</p>
      </div>
      {entries.length===0
        ? <div className="card empty-state"><div style={{fontSize:48}}>😊</div><p className="empty-state-text">No mood entries yet. Log your mood from the Home page!</p></div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
            {entries.map(e=>(
              <div key={e.id} className="card" style={{textAlign:'center',padding:20}}>
                <div style={{fontSize:38,marginBottom:8}}>{getE(e.mood_score)}</div>
                <div style={{fontWeight:700,fontSize:15}}>{e.mood_label||'Okay'}</div>
                <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>{new Date(e.logged_at).toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function ReportsPage() {
  const { patientRecord } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!patientRecord?.id) { setLoading(false); return; }
    supabase.from('doctor_reports').select('*, doctor:doctor_id(full_name)')
      .eq('patient_id', patientRecord.id).order('created_at', { ascending: false })
      .then(({ data }) => { setReports(data||[]); setLoading(false); });
  }, [patientRecord]);
  if (loading) return <div className="loading-spinner"/>;
  return (
    <div>
      <div className="page-header"><h2 className="page-title">📋 My Reports</h2><p className="page-subtitle">Reports and updates from your doctor</p></div>
      {reports.length===0
        ? <div className="card empty-state"><div style={{fontSize:48}}>📋</div><p className="empty-state-text">No reports yet. Your doctor will add them here.</p></div>
        : reports.map(r=>(
          <div key={r.id} className="card mb-4">
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{r.title}</div>
            <div style={{fontSize:12,color:'#9ca3af',marginBottom:10}}>Dr. {r.doctor?.full_name} · {new Date(r.created_at).toLocaleDateString()}</div>
            {r.summary_for_patient&&<div style={{background:'#f0fdf4',borderRadius:12,padding:14,marginBottom:10}}><div style={{fontWeight:700,fontSize:13,color:'#166534',marginBottom:4}}>📝 Summary for You</div><p style={{fontSize:14,color:'#374151'}}>{r.summary_for_patient}</p></div>}
            {r.care_instructions&&<div style={{background:'#eff6ff',borderRadius:12,padding:14}}><div style={{fontWeight:700,fontSize:13,color:'#1d4ed8',marginBottom:4}}>💡 Care Instructions</div><p style={{fontSize:14,color:'#374151'}}>{r.care_instructions}</p></div>}
          </div>
        ))
      }
    </div>
  );
}

function FamilyChatFinder() {
  const { profile } = useAuth();
  const [patientId, setPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('family_members').select('patient_id').eq('family_user_id', profile.id).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setPatientId(data.patient_id); setLoading(false); });
  }, []);
  if (loading) return <div className="loading-spinner"/>;
  return <FamilyChat targetPatientId={patientId}/>;
}

function NotificationsPage() {
  const { profile } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('notifications').select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { setNotifs(data||[]); setLoading(false); });
  }, []);
  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(n => n.map(x => x.id===id ? {...x,is_read:true} : x));
  };
  if (loading) return <div className="loading-spinner"/>;
  return (
    <div>
      <div className="page-header"><h2 className="page-title">🔔 Notifications</h2><p className="page-subtitle">Stay up to date with your care circle</p></div>
      {notifs.length===0
        ? <div className="card empty-state"><div style={{fontSize:48}}>🔔</div><p className="empty-state-text">No notifications yet</p></div>
        : notifs.map(n=>(
          <div key={n.id} className="card mb-3" style={{padding:18,background:n.is_read?'white':'#fff9f0',border:`2px solid ${n.is_read?'#f3f4f6':'#fed7aa'}`,cursor:'pointer'}} onClick={()=>markRead(n.id)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{n.title}</div>
                <p style={{fontSize:14,color:'#374151'}}>{n.message}</p>
                <div style={{fontSize:11,color:'#9ca3af',marginTop:6}}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.is_read&&<div style={{width:10,height:10,borderRadius:'50%',background:'#f97316',flexShrink:0,marginTop:6}}/>}
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ────── Shell wrappers per role ────── */

function PatientShell() {
  const [page, setPage] = useState('home');
  const render = (p) => {
    switch(p) {
      case 'home':         return <PatientHome onNavigate={setPage}/>;
      case 'companion':    return <AICompanion/>;
      case 'medicines':    return <MedicineReminders/>;
      case 'appointments': return <Appointments/>;
      case 'chat':         return <FamilyChat/>;
      case 'memories':     return <MemoryVault/>;
      case 'hope':         return <HopeWellness/>;
      case 'family':       return <FamilyDashboard/>;
      case 'mood':         return <MoodJournal/>;
      case 'reports':      return <ReportsPage/>;
      case 'voicenotes':   return <VoiceNotes/>;
      default:             return <PatientHome onNavigate={setPage}/>;
    }
  };
  return (
    <div className="app-shell">
      <Sidebar activeKey={page} onNavigate={setPage}/>
      <main className="main-content">{render(page)}</main>
    </div>
  );
}

function CaregiverShell() {
  const [page, setPage] = useState('home');
  const render = () => {
    if (page==='appointments') return <Appointments/>;
    if (page==='notifications') return <NotificationsPage/>;
    return <CaregiverDashboard/>;
  };
  return (
    <div className="app-shell">
      <Sidebar activeKey={page} onNavigate={setPage}/>
      <main className="main-content">{render()}</main>
    </div>
  );
}

function DoctorShell() {
  const [page, setPage] = useState('home');
  const render = () => {
    if (page==='appointments') return <Appointments/>;
    return <DoctorDashboard/>;
  };
  return (
    <div className="app-shell">
      <Sidebar activeKey={page} onNavigate={setPage}/>
      <main className="main-content">{render()}</main>
    </div>
  );
}

function FamilyShell() {
  const [page, setPage] = useState('home');
  const render = (p) => {
    switch(p) {
      case 'home':         return <FamilyDashboard/>;
      case 'chat':         return <FamilyChatFinder/>;
      case 'messages':     return <FamilyDashboard/>;
      case 'voicenotes':   return <VoiceNotes/>;
      case 'memories':     return <MemoryVault/>;
      case 'appointments': return <Appointments/>;
      case 'notifications':return <NotificationsPage/>;
      default:             return <FamilyDashboard/>;
    }
  };
  return (
    <div className="app-shell">
      <Sidebar activeKey={page} onNavigate={setPage}/>
      <main className="main-content">{render(page)}</main>
    </div>
  );
}

function AdminShell() {
  const [page, setPage] = useState('home');
  return (
    <div className="app-shell">
      <Sidebar activeKey={page} onNavigate={setPage}/>
      <main className="main-content"><AdminDashboard/></main>
    </div>
  );
}

/* ────── Root ────── */
export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff9f0'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:56,marginBottom:12}}>💙</div>
        <div style={{fontFamily:'Lora,serif',fontSize:22,color:'#f97316',marginBottom:6}}>CareAssist</div>
        <div style={{fontSize:14,color:'#9ca3af',marginBottom:20}}>Your compassionate health companion</div>
        <div className="loading-spinner" style={{margin:'0 auto'}}/>
      </div>
    </div>
  );

  if (!user || !profile) return <AuthPage/>;

  switch(profile.role) {
    case 'patient':   return <PatientShell/>;
    case 'caregiver': return <CaregiverShell/>;
    case 'doctor':    return <DoctorShell/>;
    case 'family':    return <FamilyShell/>;
    case 'admin':     return <AdminShell/>;
    default:          return <AuthPage/>;
  }
}
