import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

const AGE_MODES = [
  { value:'child', label:'🌟 Child Mode', desc:'Under 18 · Playful & colorful' },
  { value:'adult', label:'🌿 Adult Mode', desc:'18–60 · Calm & motivating' },
  { value:'elder', label:'🌸 Elder Mode', desc:'60+ · Warm & large text' },
];

export default function ProfileSettings() {
  const { profile, patientRecord, updateProfile, updatePatientMode, refreshProfile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    gender: profile?.gender || '',
    date_of_birth: profile?.date_of_birth || '',
    address: profile?.address || '',
  });
  const [pwForm, setPwForm] = useState({ newPassword:'', confirm:'' });

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated! ✅');
      refreshProfile();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
      toast.success('Password updated!');
      setPwForm({ newPassword:'', confirm:'' });
    } catch(err) { toast.error(err.message); }
    finally { setChangingPw(false); }
  };

  const ROLE_COLORS = {patient:'#f97316',caregiver:'#0d9488',doctor:'#0ea5e9',family:'#8b5cf6',admin:'#374151'};
  const color = ROLE_COLORS[profile?.role] || '#6b7280';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">⚙️ Profile Settings</h2>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Avatar & Role */}
      <div className="card mb-5" style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color,border:`3px solid ${color}40`,flexShrink:0}}>
          {profile?.full_name?.[0]?.toUpperCase()||'?'}
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:20}}>{profile?.full_name}</div>
          <div style={{fontSize:13,color}}>{profile?.role?.toUpperCase()}</div>
          <div style={{fontSize:13,color:'#9ca3af'}}>{profile?.email}</div>
        </div>
      </div>

      {/* Age Mode (patient only) */}
      {profile?.role === 'patient' && patientRecord && (
        <div className="card mb-5">
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>🎨 Age Mode</h3>
          <p style={{fontSize:13,color:'#9ca3af',marginBottom:16}}>This changes your dashboard theme and companion tone</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {AGE_MODES.map(m=>(
              <button key={m.value} onClick={async()=>{ await updatePatientMode(m.value); toast.success(`Switched to ${m.label}!`); }}
                style={{padding:16,borderRadius:16,border:'2px solid',textAlign:'center',cursor:'pointer',transition:'all 0.2s',
                  borderColor:patientRecord.age_mode===m.value?'#f97316':'#e5e7eb',
                  background:patientRecord.age_mode===m.value?'#fff9f0':'white'}}>
                <div style={{fontSize:24,marginBottom:6}}>{m.label.split(' ')[0]}</div>
                <div style={{fontWeight:700,fontSize:13,color:patientRecord.age_mode===m.value?'#c2410c':'#374151'}}>{m.label.split(' ').slice(1).join(' ')}</div>
                <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Personal Info */}
      <div className="card mb-5">
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>👤 Personal Information</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="tel" className="form-input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-input form-select" value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input type="date" className="form-input" value={form.date_of_birth} onChange={e=>setForm(p=>({...p,date_of_birth:e.target.value}))}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input type="text" className="form-input" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Your address"/>
        </div>
        <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
          {saving?'Saving...':'💾 Save Changes'}
        </button>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>🔒 Change Password</h3>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input type="password" className="form-input" placeholder="Min 8 characters" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input type="password" className="form-input" placeholder="Repeat new password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}/>
        </div>
        <button className="btn btn-teal" onClick={changePassword} disabled={changingPw}>
          {changingPw?'Updating...':'🔒 Update Password'}
        </button>
      </div>
    </div>
  );
}
