import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Heart, Home, Users, Calendar, Pill, FileText, MessageCircle,
  Mic, Image, Star, AlertTriangle, Settings, LogOut, Activity,
  BookOpen, Gift, Bell, UserCheck, ClipboardList, TrendingUp,
  Smile, Video
} from 'lucide-react';

const NAV_ITEMS = {
  patient: [
    { label: 'Home', icon: Home, key: 'home' },
    { label: 'My Companion', icon: Heart, key: 'companion' },
    { label: 'Medicines', icon: Pill, key: 'medicines' },
    { label: 'Appointments', icon: Calendar, key: 'appointments' },
    { label: 'Mood Journal', icon: Smile, key: 'mood' },
    { label: 'Family Chat', icon: MessageCircle, key: 'chat' },
    { label: 'Family Hub', icon: Gift, key: 'family' },
    { label: 'Voice Notes', icon: Mic, key: 'voicenotes' },
    { label: 'Memory Vault', icon: Image, key: 'memories' },
    { label: 'Hope & Wellness', icon: Star, key: 'hope' },
    { label: 'Reports', icon: FileText, key: 'reports' },
  ],
  caregiver: [
    { label: 'Dashboard', icon: Home, key: 'home' },
    { label: 'My Patients', icon: Users, key: 'patients' },
    { label: 'Health Records', icon: Activity, key: 'health' },
    { label: 'Medicine Logs', icon: Pill, key: 'medicines' },
    { label: 'Appointments', icon: Calendar, key: 'appointments' },
    { label: 'Alerts', icon: AlertTriangle, key: 'alerts' },
    { label: 'Reports', icon: FileText, key: 'reports' },
    { label: 'Notifications', icon: Bell, key: 'notifications' },
  ],
  doctor: [
    { label: 'Dashboard', icon: Home, key: 'home' },
    { label: 'My Patients', icon: Users, key: 'patients' },
    { label: 'Appointments', icon: Calendar, key: 'appointments' },
    { label: 'Prescriptions', icon: Pill, key: 'prescriptions' },
    { label: 'Health Records', icon: Activity, key: 'health' },
    { label: 'Diagnoses', icon: ClipboardList, key: 'diagnoses' },
    { label: 'Reports', icon: FileText, key: 'reports' },
    { label: 'Alerts', icon: AlertTriangle, key: 'alerts' },
  ],
  family: [
    { label: 'Dashboard', icon: Home, key: 'home' },
    { label: 'Family Chat', icon: MessageCircle, key: 'chat' },
    { label: 'Send Love', icon: Gift, key: 'messages' },
    { label: 'Voice Notes', icon: Mic, key: 'voicenotes' },
    { label: 'Memory Vault', icon: Image, key: 'memories' },
    { label: 'Appointments', icon: Calendar, key: 'appointments' },
    { label: 'Notifications', icon: Bell, key: 'notifications' },
  ],
  admin: [
    { label: 'Dashboard', icon: Home, key: 'home' },
    { label: 'Users', icon: Users, key: 'users' },
    { label: 'Patients', icon: Heart, key: 'patients' },
    { label: 'Alerts', icon: AlertTriangle, key: 'alerts' },
    { label: 'Statistics', icon: TrendingUp, key: 'stats' },
    { label: 'Settings', icon: Settings, key: 'settings' },
  ],
};

const ROLE_COLORS = {
  patient: '#f97316',
  caregiver: '#0d9488',
  doctor: '#0ea5e9',
  family: '#8b5cf6',
  admin: '#374151',
};

const ROLE_LABELS = {
  patient: '💊 Patient',
  caregiver: '🤝 Caregiver',
  doctor: '🩺 Doctor',
  family: '❤️ Family',
  admin: '⚙️ Admin',
};

export default function Sidebar({ activeKey, onNavigate }) {
  const { profile, patientRecord, signOut } = useAuth();
  const role = profile?.role || 'patient';
  const navItems = NAV_ITEMS[role] || [];
  const color = ROLE_COLORS[role];

  const ageMode = patientRecord?.age_mode || 'adult';
  const ageModeLabel = { child: '🌟 Child Mode', adult: '🌿 Adult Mode', elder: '🌸 Elder Mode' }[ageMode];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: 28 }}>💙</span>
          <div>
            <div className="sidebar-logo-title">CareAssist</div>
            <div className="sidebar-logo-sub">Your Compassionate Companion</div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, marginBottom: 8
        }}>
          {profile?.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
          {profile?.full_name || 'User'}
        </div>
        <div style={{ fontSize: 12, color: color, fontWeight: 600 }}>
          {ROLE_LABELS[role]}
        </div>
        {role === 'patient' && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{ageModeLabel}</div>
        )}
      </div>

      {/* Nav Items */}
      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
              style={isActive ? {
                background: color + '20',
                color: color,
              } : {}}
            >
              <Icon className="nav-icon" size={18} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #f3f4f6' }}>
        <button
          className="nav-item"
          onClick={signOut}
          style={{ color: '#ef4444' }}
        >
          <LogOut size={18} className="nav-icon" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
