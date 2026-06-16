import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Appointments() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPatient = profile?.role === 'patient';
  const isDoctor = profile?.role === 'doctor';
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', appointment_date:'', appointment_time:'10:00', reason:'', urgency_level:'normal', consultation_type:'offline' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('appointments')
        .select('*, patient:patient_id(user:user_id(full_name)), doctor:doctor_id(full_name)')
        .order('appointment_date', { ascending: true });
      if (isPatient && patientRecord?.id) query = query.eq('patient_id', patientRecord.id);
      else if (isDoctor) query = query.eq('doctor_id', profile.id);
      else if (profile?.role === 'caregiver') {
        const { data: assigned } = await supabase.from('patient_caregivers').select('patient_id').eq('caregiver_id', profile.id);
        const ids = assigned?.map(a => a.patient_id) || [];
        if (ids.length) query = query.in('patient_id', ids); else { setAppointments([]); setLoading(false); return; }
      } else if (profile?.role === 'family') {
        const { data: fm } = await supabase.from('family_members').select('patient_id').eq('family_user_id', profile.id);
        const ids = fm?.map(a => a.patient_id) || [];
        if (ids.length) query = query.in('patient_id', ids); else { setAppointments([]); setLoading(false); return; }
      }
      const { data } = await query;
      setAppointments(data || []);
      const { data: docs } = await supabase.from('user_profiles').select('id, full_name').eq('role', 'doctor');
      setDoctors(docs || []);
      if (profile?.role === 'caregiver') {
        const { data: asgn } = await supabase.from('patient_caregivers').select('patient:patient_id(id, user:user_id(full_name))').eq('caregiver_id', profile.id);
        setPatients(asgn?.map(a => a.patient).filter(Boolean) || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const bookAppointment = async () => {
    const pid = isPatient ? patientRecord?.id : form.patient_id;
    if (!pid) { toast.error('No patient selected'); return; }
    if (!form.doctor_id) { toast.error('Please select a doctor'); return; }
    if (!form.appointment_date) { toast.error('Please select a date'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('appointments').insert({ patient_id: pid, doctor_id: form.doctor_id, requested_by: profile.id, appointment_date: form.appointment_date, appointment_time: form.appointment_time, reason: form.reason || null, urgency_level: form.urgency_level, consultation_type: form.consultation_type, status: 'pending' });
      if (error) throw error;
      toast.success('Appointment request sent! 📅');
      setShowForm(false);
      setForm({ patient_id:'', doctor_id:'', appointment_date:'', appointment_time:'10:00', reason:'', urgency_level:'normal', consultation_type:'offline' });
      loadData();
    } catch (err) { toast.error('Could not book: ' + err.message); }
    finally { setSaving(false); }
  };

  const statusBadge = (s) => ({ pending:'badge-amber', accepted:'badge-green', cancelled:'badge-rose', completed:'badge-purple', rescheduled:'badge-sky' }[s] || 'badge-gray');
  const canBook = ['patient','caregiver','family'].includes(profile?.role);

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h2 className="page-title">📅 Appointments</h2><p className="page-subtitle">Schedule and manage doctor appointments</p></div>
          {canBook && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Book Appointment</button>}
        </div>
      </div>
      {appointments.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 48 }}>📅</div>
          <p className="empty-state-text">No appointments yet</p>
          {canBook && <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}><Plus size={16} /> Book First Appointment</button>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {appointments.map(appt => (
            <div key={appt.id} className="card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{appt.consultation_type === 'online' ? '💻' : '🏥'}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>{isDoctor ? (appt.patient?.user?.full_name || 'Patient') : ('Dr. ' + (appt.doctor?.full_name || 'Doctor'))}</div>
                      <div style={{ fontSize:13, color:'#9ca3af' }}>{format(new Date(appt.appointment_date), 'EEEE, MMMM d, yyyy')} · {appt.appointment_time?.slice(0,5)}</div>
                    </div>
                  </div>
                  {appt.reason && <p style={{ fontSize:14, color:'#374151', marginBottom:6 }}>📋 {appt.reason}</p>}
                  {appt.doctor_notes && <p style={{ fontSize:13, color:'#6b7280', fontStyle:'italic' }}>Doctor's note: {appt.doctor_notes}</p>}
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    <span className={`badge ${statusBadge(appt.status)}`}>{appt.status}</span>
                    <span className={`badge ${appt.consultation_type === 'online' ? 'badge-sky' : 'badge-teal'}`}>{appt.consultation_type}</span>
                    {appt.urgency_level !== 'normal' && <span className={`badge ${appt.urgency_level === 'emergency' ? 'badge-rose' : 'badge-amber'}`}>{appt.urgency_level}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{ marginBottom:0 }}>📅 Book Appointment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            {profile?.role === 'caregiver' && (
              <div className="form-group">
                <label className="form-label">Patient *</label>
                <select className="form-input form-select" value={form.patient_id} onChange={e => setForm(p => ({...p, patient_id: e.target.value}))}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.user?.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Doctor *</label>
              <select className="form-input form-select" value={form.doctor_id} onChange={e => setForm(p => ({...p, doctor_id: e.target.value}))}>
                <option value="">Select doctor...</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.appointment_date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(p => ({...p, appointment_date: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={form.appointment_time} onChange={e => setForm(p => ({...p, appointment_time: e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Visit</label>
              <textarea className="form-input form-textarea" rows={2} placeholder="Describe the reason..." value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Urgency</label>
                <select className="form-input form-select" value={form.urgency_level} onChange={e => setForm(p => ({...p, urgency_level: e.target.value}))}>
                  <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input form-select" value={form.consultation_type} onChange={e => setForm(p => ({...p, consultation_type: e.target.value}))}>
                  <option value="offline">In-person 🏥</option><option value="online">Online 💻</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={bookAppointment} disabled={saving}>{saving ? 'Booking...' : '📅 Request Appointment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
