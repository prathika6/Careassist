import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home, Heart, Pill, Calendar, MessageCircle, Star, Smile, FileText, Mic, Image, Users, Activity, AlertTriangle, Bell, ClipboardList, TrendingUp, Settings, LogOut, Link } from 'lucide-react';

const NAV = {
  patient: [
    { label:'Home', icon:Home, key:'home' },
    { label:'My Companion', icon:Heart, key:'companion' },
    { label:'Medicines', icon:Pill, key:'medicines' },
    { label:'Appointments', icon:Calendar, key:'appointments' },
    { label:'Mood Journal', icon:Smile, key:'mood' },
    { label:'Family Hub', icon:MessageCircle, key:'familyhub' },
    { label:'Hope & Wellness', icon:Star, key:'hope' },
    { label:'Reports', icon:FileText, key:'reports' },
    { label:'My Care Circle', icon:Link, key:'connections' },
    { label:'Settings', icon:Settings, key:'settings' },
  ],
  caregiver: [
    { label:'Dashboard', icon:Home, key:'home' },
    { label:'My Patients', icon:Users, key:'patients' },
    { label:'Health Records', icon:Activity, key:'health' },
    { label:'Medicine Logs', icon:Pill, key:'medicines' },
    { label:'Appointments', icon:Calendar, key:'appointments' },
    { label:'Family Hub', icon:MessageCircle, key:'familyhub' },
    { label:'Alerts', icon:AlertTriangle, key:'alerts' },
    { label:'My Care Circle', icon:Link, key:'connections' },
    { label:'Settings', icon:Settings, key:'settings' },
  ],
  doctor: [
    { label:'Dashboard', icon:Home, key:'home' },
    { label:'My Patients', icon:Users, key:'patients' },
    { label:'Appointments', icon:Calendar, key:'appointments' },
    { label:'Prescriptions', icon:Pill, key:'prescriptions' },
    { label:'Health Records', icon:Activity, key:'health' },
    { label:'Reports', icon:FileText, key:'reports' },
    { label:'Alerts', icon:AlertTriangle, key:'alerts' },
    { label:'My Care Circle', icon:Link, key:'connections' },
    { label:'Settings', icon:Settings, key:'settings' },
  ],
  family: [
    { label:'Dashboard', icon:Home, key:'home' },
    { label:'Family Hub', icon:MessageCircle, key:'familyhub' },
    { label:'Appointments', icon:Calendar, key:'appointments' },
    { label:'Notifications', icon:Bell, key:'notifications' },
    { label:'My Care Circle', icon:Link, key:'connections' },
    { label:'Settings', icon:Settings, key:'settings' },
  ],
  admin: [
    { label:'Dashboard', icon:Home, key:'home' },
    { label:'Users', icon:Users, key:'users' },
    { label:'Patients', icon:Heart, key:'patients' },
    { label:'Alerts', icon:AlertTriangle, key:'alerts' },
    { label:'Statistics', icon:TrendingUp, key:'stats' },
    { label:'Settings', icon:Settings, key:'settings' },
  ],
};

const ROLE_COLORS = {patient:'#f97316',caregiver:'#0d9488',doctor:'#0ea5e9',family:'#8b5cf6',admin:'#374151'};
const ROLE_LABELS = {patient:'💊 Patient',caregiver:'🤝 Caregiver',doctor:'🩺 Doctor',family:'❤️ Family',admin:'⚙️ Admin'};
const AGE_LABELS = {child:'🌟 Child Mode',adult:'🌿 Adult Mode',elder:'🌸 Elder Mode'};

export default function Sidebar({ activeKey, onNavigate }) {
  const { profile, patientRecord, signOut } = useAuth();
  const role = profile?.role || 'patient';
  const navItems = NAV[role] || [];
  const color = ROLE_COLORS[role];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="flex items-center gap-2">
          <span style={{fontSize:26}}>💙</span>
          <div>
            <div className="sidebar-logo-title">CareAssist</div>
            <div className="sidebar-logo-sub">Your Compassionate Companion</div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div style={{padding:'14px 18px',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color,border:`2px solid ${color}30`,flexShrink:0}}>
            {profile?.full_name?.[0]?.toUpperCase()||'?'}
          </div>
          <div style={{overflow:'hidden'}}>
            <div style={{fontWeight:700,fontSize:13,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.full_name||'User'}</div>
            <div style={{fontSize:11,color,fontWeight:700}}>{ROLE_LABELS[role]}</div>
            {role==='patient'&&patientRecord&&<div style={{fontSize:10,color:'#9ca3af'}}>{AGE_LABELS[patientRecord.age_mode]||'Adult Mode'}</div>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav" style={{flex:1}}>
        {navItems.map(item=>{
          const Icon=item.icon;
          const isActive=activeKey===item.key;
          return (
            <button key={item.key} className={`nav-item ${isActive?'active':''}`}
              onClick={()=>onNavigate(item.key)}
              style={isActive?{background:color+'18',color}:{}}>
              <Icon size={18} className="nav-icon"/>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div style={{padding:'12px',borderTop:'1px solid #f3f4f6'}}>
        <button className="nav-item" onClick={signOut} style={{color:'#ef4444'}}>
          <LogOut size={18} className="nav-icon"/> Sign Out
        </button>
      </div>
    </nav>
  );
}
