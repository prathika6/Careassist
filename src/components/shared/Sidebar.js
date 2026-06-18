import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home, Heart, Pill, Calendar, MessageCircle, Star, Smile, FileText, Image, Users, Activity, AlertTriangle, Bell, Settings, LogOut, Link, Search, Phone, User } from 'lucide-react';

const NAV = {
  patient: [
    { label:'Home',           icon:Home,          key:'home' },
    { label:'My Companion',   icon:Heart,         key:'companion' },
    { label:'Find a Doctor',  icon:Search,        key:'appointments' },
    { label:'My Appointments',icon:Calendar,      key:'booked' },
    { label:'Medicines',      icon:Pill,          key:'medicines' },
    { label:'Mood Journal',   icon:Smile,         key:'mood' },
    { label:'Family Hub',     icon:MessageCircle, key:'familyhub' },
    { label:'Hope & Wellness',icon:Star,          key:'hope' },
    { label:'Memories',       icon:Image,         key:'memories' },
    { label:'Reports',        icon:FileText,      key:'reports' },
    { label:'Emergency',      icon:Phone,         key:'emergency' },
    { label:'Notifications',  icon:Bell,          key:'notifications' },
    { label:'Care Circle',    icon:Link,          key:'connections' },
    { label:'Settings',       icon:Settings,      key:'settings' },
  ],
  caregiver: [
    { label:'Dashboard',      icon:Home,          key:'home' },
    { label:'My Patients',    icon:Users,         key:'patients' },
    { label:'Health Records', icon:Activity,      key:'health' },
    { label:'Medicines',      icon:Pill,          key:'medicines' },
    { label:'Appointments',   icon:Calendar,      key:'appointments' },
    { label:'Family Hub',     icon:MessageCircle, key:'familyhub' },
    { label:'Alerts',         icon:AlertTriangle, key:'alerts' },
    { label:'Notifications',  icon:Bell,          key:'notifications' },
    { label:'Care Circle',    icon:Link,          key:'connections' },
    { label:'Settings',       icon:Settings,      key:'settings' },
  ],
  doctor: [
    { label:'Dashboard',      icon:Home,          key:'home' },
    { label:'My Patients',    icon:Users,         key:'patients' },
    { label:'Appointments',   icon:Calendar,      key:'appointments' },
    { label:'Prescriptions',  icon:Pill,          key:'prescriptions' },
    { label:'Health Records', icon:Activity,      key:'health' },
    { label:'Reports',        icon:FileText,      key:'reports' },
    { label:'Alerts',         icon:AlertTriangle, key:'alerts' },
    { label:'My Profile',     icon:User,          key:'profile' },
    { label:'Notifications',  icon:Bell,          key:'notifications' },
    { label:'Care Circle',    icon:Link,          key:'connections' },
    { label:'Settings',       icon:Settings,      key:'settings' },
  ],
  family: [
    { label:'Dashboard',      icon:Home,          key:'home' },
    { label:'Family Hub',     icon:MessageCircle, key:'familyhub' },
    { label:'Appointments',   icon:Calendar,      key:'appointments' },
    { label:'Notifications',  icon:Bell,          key:'notifications' },
    { label:'Care Circle',    icon:Link,          key:'connections' },
    { label:'Settings',       icon:Settings,      key:'settings' },
  ],
  admin: [
    { label:'Dashboard',      icon:Home,          key:'home' },
    { label:'Users',          icon:Users,         key:'users' },
    { label:'Patients',       icon:Heart,         key:'patients' },
    { label:'Alerts',         icon:AlertTriangle, key:'alerts' },
    { label:'Settings',       icon:Settings,      key:'settings' },
  ],
};

const RC = {patient:'#f97316',caregiver:'#0d9488',doctor:'#0ea5e9',family:'#8b5cf6',admin:'#374151'};
const RL = {patient:'💊 Patient',caregiver:'🤝 Caregiver',doctor:'🩺 Doctor',family:'❤️ Family',admin:'⚙️ Admin'};
const AM = {child:'🌟 Child Mode',adult:'🌿 Adult Mode',elder:'🌸 Elder Mode'};

export default function Sidebar({ activeKey, onNavigate }) {
  const { profile, patientRecord, signOut } = useAuth();
  const role = profile?.role || 'patient';
  const navItems = NAV[role] || [];
  const color = RC[role];

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="flex items-center gap-2">
          <span style={{fontSize:26}}>💙</span>
          <div>
            <div className="sidebar-logo-title">CareAssist</div>
            <div className="sidebar-logo-sub">Your Compassionate Companion</div>
          </div>
        </div>
      </div>

      <div style={{padding:'14px 18px',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color,border:`2px solid ${color}30`,flexShrink:0}}>
            {profile?.full_name?.[0]?.toUpperCase()||'?'}
          </div>
          <div style={{overflow:'hidden',flex:1}}>
            <div style={{fontWeight:700,fontSize:13,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.full_name||'User'}</div>
            <div style={{fontSize:11,color,fontWeight:700}}>{RL[role]}</div>
            {role==='patient'&&patientRecord&&<div style={{fontSize:10,color:'#9ca3af'}}>{AM[patientRecord.age_mode]||'Adult Mode'}</div>}
          </div>
        </div>
      </div>

      <div className="sidebar-nav" style={{flex:1,overflowY:'auto'}}>
        {navItems.map(item=>{
          const Icon=item.icon;
          const isActive=activeKey===item.key;
          return (
            <button key={item.key} className={`nav-item ${isActive?'active':''}`}
              onClick={()=>onNavigate(item.key)}
              style={isActive?{background:color+'18',color}:{}}>
              <Icon size={17} className="nav-icon"/>
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{padding:'12px',borderTop:'1px solid #f3f4f6'}}>
        <button className="nav-item" onClick={signOut} style={{color:'#ef4444'}}>
          <LogOut size={17} className="nav-icon"/> Sign Out
        </button>
      </div>
    </nav>
  );
}
