import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

const SPECIALIZATIONS = ['General Physician','Cardiologist','Neurologist','Orthopedic','Pediatrician','Dermatologist','Psychiatrist','Oncologist','Gynecologist','ENT Specialist','Ophthalmologist','Diabetologist'];

export default function DoctorProfile() {
  const { profile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ specialization:'', experience_years:'', hospital_name:'', hospital_address:'', city:'', consultation_fee:'', bio:'', photo_url:'', available_days:['Monday','Tuesday','Wednesday','Thursday','Friday'], slot_duration_minutes:30 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data } = await supabase.from('doctor_profiles').select('*').eq('id', profile.id).maybeSingle();
    if (data) setForm({ ...form, ...data });
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, id: profile.id, experience_years: parseInt(form.experience_years)||0, consultation_fee: parseFloat(form.consultation_fee)||0, slot_duration_minutes: parseInt(form.slot_duration_minutes)||30 };
      const { error } = await supabase.from('doctor_profiles').upsert(payload);
      if (error) throw error;
      toast.success('Profile saved! Patients can now find and book you. ✅');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const toggleDay = (day) => setForm(p => ({ ...p, available_days: p.available_days.includes(day) ? p.available_days.filter(d=>d!==day) : [...p.available_days, day] }));

  if (loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🩺 My Doctor Profile</h2>
        <p className="page-subtitle">Patients discover you through this profile — keep it complete</p>
      </div>

      {/* Preview card */}
      <div className="card mb-5" style={{ background:'linear-gradient(135deg,#eff6ff,#dbeafe)', border:'2px solid #bfdbfe' }}>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ width:64, height:64, borderRadius:20, background:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, overflow:'hidden', flexShrink:0 }}>
            {form.photo_url ? <img src={form.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👨‍⚕️'}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:18 }}>Dr. {profile?.full_name}</div>
            <div style={{ color:'#0ea5e9', fontWeight:700 }}>{form.specialization || 'Add specialization'}</div>
            <div style={{ fontSize:13, color:'#6b7280' }}>{form.hospital_name || 'Add hospital'} · {form.city || 'Add city'}</div>
            <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
              {form.consultation_fee && <span className="badge badge-teal">₹{form.consultation_fee} fee</span>}
              {form.experience_years && <span className="badge badge-sky">{form.experience_years} yrs exp</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Professional Details</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Specialization</label>
            <select className="form-input form-select" value={form.specialization} onChange={e=>setForm(p=>({...p,specialization:e.target.value}))}>
              <option value="">Select specialization</option>
              {SPECIALIZATIONS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Experience (years)</label>
            <input type="number" className="form-input" value={form.experience_years} onChange={e=>setForm(p=>({...p,experience_years:e.target.value}))} placeholder="e.g. 10"/>
          </div>
          <div className="form-group">
            <label className="form-label">Hospital / Clinic Name</label>
            <input type="text" className="form-input" value={form.hospital_name} onChange={e=>setForm(p=>({...p,hospital_name:e.target.value}))} placeholder="e.g. City Care Hospital"/>
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input type="text" className="form-input" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} placeholder="e.g. Bangalore"/>
          </div>
          <div className="form-group">
            <label className="form-label">Consultation Fee (₹)</label>
            <input type="number" className="form-input" value={form.consultation_fee} onChange={e=>setForm(p=>({...p,consultation_fee:e.target.value}))} placeholder="e.g. 500"/>
          </div>
          <div className="form-group">
            <label className="form-label">Slot Duration (minutes)</label>
            <select className="form-input form-select" value={form.slot_duration_minutes} onChange={e=>setForm(p=>({...p,slot_duration_minutes:e.target.value}))}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Hospital Address</label>
          <input type="text" className="form-input" value={form.hospital_address} onChange={e=>setForm(p=>({...p,hospital_address:e.target.value}))} placeholder="Full address"/>
        </div>
        <div className="form-group">
          <label className="form-label">Photo URL</label>
          <input type="url" className="form-input" value={form.photo_url} onChange={e=>setForm(p=>({...p,photo_url:e.target.value}))} placeholder="https://... (link to your photo)"/>
        </div>
        <div className="form-group">
          <label className="form-label">Bio / About</label>
          <textarea className="form-input form-textarea" rows={3} value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} placeholder="Brief description of your practice and approach..."/>
        </div>
      </div>

      <div className="card mb-5">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>📅 Available Days</h3>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {DAYS.map(day => (
            <button key={day} onClick={() => toggleDay(day)} style={{
              padding:'8px 16px', borderRadius:20, border:'2px solid', fontWeight:700, fontSize:13, cursor:'pointer',
              borderColor: form.available_days?.includes(day) ? '#0ea5e9' : '#e5e7eb',
              background: form.available_days?.includes(day) ? '#eff6ff' : 'white',
              color: form.available_days?.includes(day) ? '#0369a1' : '#6b7280',
            }}>{day.slice(0,3)}</button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : '💾 Save Doctor Profile'}
      </button>
    </div>
  );
}
