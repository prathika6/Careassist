import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X } from 'lucide-react';

const AGE_MODES = [
  { value:'child', label:'🌟 Child', desc:'Under 18 · Playful' },
  { value:'adult', label:'🌿 Adult', desc:'18–60 · Calm' },
  { value:'elder', label:'🌸 Elder', desc:'60+ · Warm' },
];

export default function ProfileSettings() {
  const { profile, patientRecord, updateProfile, updatePatientMode } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    gender: profile?.gender || '',
    date_of_birth: profile?.date_of_birth || '',
    address: profile?.address || '',
  });
  const [pwForm, setPwForm] = useState({ newPassword:'', confirm:'' });
  const [newContact, setNewContact] = useState({ name:'', relationship:'', phone:'', email:'', priority:1 });
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    if (profile?.role === 'patient' && patientRecord?.id) loadEmergencyContacts();
  }, [patientRecord]);

  const loadEmergencyContacts = async () => {
    setLoadingContacts(true);
    const { data } = await supabase.from('emergency_contacts')
      .select('*').eq('patient_id', patientRecord.id).order('priority');
    setEmergencyContacts(data || []);
    setLoadingContacts(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated! ✅');
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.newPassword.length < 8) { toast.error('Minimum 8 characters'); return; }
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

  const addEmergencyContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) { toast.error('Name and phone are required'); return; }
    setAddingContact(true);
    try {
      const { error } = await supabase.from('emergency_contacts').insert({
        patient_id: patientRecord.id,
        name: newContact.name,
        relationship: newContact.relationship,
        phone: newContact.phone,
        email: newContact.email || null,
        priority: newContact.priority,
      });
      if (error) throw error;
      toast.success('Emergency contact added! 🆘');
      setNewContact({ name:'', relationship:'', phone:'', email:'', priority:1 });
      loadEmergencyContacts();
    } catch(err) { toast.error(err.message); }
    finally { setAddingContact(false); }
  };

  const removeContact = async (id) => {
    await supabase.from('emergency_contacts').delete().eq('id', id);
    toast.success('Contact removed');
    loadEmergencyContacts();
  };

  const ROLE_COLORS = {patient:'#f97316',caregiver:'#0d9488',doctor:'#0ea5e9',family:'#8b5cf6',admin:'#374151'};
  const color = ROLE_COLORS[profile?.role] || '#6b7280';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">⚙️ Profile Settings</h2>
        <p className="page-subtitle">Manage your account, preferences and emergency contacts</p>
      </div>

      {/* Avatar */}
      <div className="card mb-5" style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color,border:`3px solid ${color}40`}}>
          {profile?.full_name?.[0]?.toUpperCase()||'?'}
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:20}}>{profile?.full_name}</div>
          <div style={{fontSize:13,color}}>{profile?.role?.toUpperCase()}</div>
          <div style={{fontSize:13,color:'#9ca3af'}}>{profile?.email}</div>
        </div>
      </div>

      {/* Age Mode - patient only */}
      {profile?.role === 'patient' && patientRecord && (
        <div className="card mb-5">
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>🎨 Age Mode</h3>
          <p style={{fontSize:13,color:'#9ca3af',marginBottom:16}}>Changes your dashboard theme and companion personality</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {AGE_MODES.map(m=>(
              <button key={m.value} onClick={async()=>{ await updatePatientMode(m.value); toast.success(`Switched to ${m.label}!`); }}
                style={{padding:16,borderRadius:16,border:'2px solid',textAlign:'center',cursor:'pointer',
                  borderColor:patientRecord.age_mode===m.value?'#f97316':'#e5e7eb',
                  background:patientRecord.age_mode===m.value?'#fff9f0':'white'}}>
                <div style={{fontSize:24,marginBottom:6}}>{m.label.split(' ')[0]}</div>
                <div style={{fontWeight:700,fontSize:13,color:patientRecord.age_mode===m.value?'#c2410c':'#374151'}}>{m.label.split(' ').slice(1).join(' ')}</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>{m.desc}</div>
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
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+91 9876543210"/>
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
          <input type="text" className="form-input" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Your full address"/>
        </div>
        <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
          {saving?'Saving...':'💾 Save Changes'}
        </button>
      </div>

      {/* Emergency Contacts - patient only */}
      {profile?.role === 'patient' && (
        <div className="card mb-5">
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>🆘 Emergency Contacts</h3>
          <p style={{fontSize:13,color:'#9ca3af',marginBottom:16}}>These people will be called when you press SOS</p>

          {/* Existing contacts */}
          {loadingContacts ? <div className="loading-spinner"/> : emergencyContacts.length === 0 ? (
            <div style={{background:'#fef9c3',borderRadius:12,padding:14,marginBottom:16}}>
              <p style={{fontSize:13,color:'#92400e',fontWeight:600}}>⚠️ No emergency contacts added yet. Add at least one below.</p>
            </div>
          ) : emergencyContacts.map(c => (
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'#fff9f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>❤️</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{c.relationship} · {c.phone}</div>
                {c.email && <div style={{fontSize:11,color:'#9ca3af'}}>{c.email}</div>}
              </div>
              <span style={{background:'#eff6ff',color:'#0369a1',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>Priority {c.priority}</span>
              <button onClick={() => removeContact(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#d1d5db',padding:4}}>
                <X size={16}/>
              </button>
            </div>
          ))}

          {/* Add new contact */}
          <div style={{background:'#f9fafb',borderRadius:16,padding:16,marginTop:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>➕ Add Emergency Contact</div>
            <div className="grid-2">
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label" style={{fontSize:12}}>Name *</label>
                <input type="text" className="form-input" placeholder="Contact name" value={newContact.name} onChange={e=>setNewContact(p=>({...p,name:e.target.value}))}/>
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label" style={{fontSize:12}}>Relationship</label>
                <input type="text" className="form-input" placeholder="e.g. Mother, Son" value={newContact.relationship} onChange={e=>setNewContact(p=>({...p,relationship:e.target.value}))}/>
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label" style={{fontSize:12}}>Phone *</label>
                <input type="tel" className="form-input" placeholder="+91 9876543210" value={newContact.phone} onChange={e=>setNewContact(p=>({...p,phone:e.target.value}))}/>
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label" style={{fontSize:12}}>Email (optional)</label>
                <input type="email" className="form-input" placeholder="email@example.com" value={newContact.email} onChange={e=>setNewContact(p=>({...p,email:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:12}}>
              <label className="form-label" style={{fontSize:12}}>Priority</label>
              <select className="form-input form-select" value={newContact.priority} onChange={e=>setNewContact(p=>({...p,priority:parseInt(e.target.value)}))}>
                <option value={1}>1 — First to call</option>
                <option value={2}>2 — Second</option>
                <option value={3}>3 — Third</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={addEmergencyContact} disabled={addingContact}>
              {addingContact ? 'Adding...' : '🆘 Add Emergency Contact'}
            </button>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="card">
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>🔒 Change Password</h3>
        <div className="form-group">
          <label className="form-label">New Password (min 8 characters)</label>
          <input type="password" className="form-input" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} placeholder="New password"/>
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input type="password" className="form-input" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} placeholder="Repeat password"/>
        </div>
        <button className="btn btn-teal" onClick={changePassword} disabled={changingPw}>
          {changingPw ? 'Updating...' : '🔒 Update Password'}
        </button>
      </div>
    </div>
  );
}
