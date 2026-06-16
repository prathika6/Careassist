import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X, CheckCircle, XCircle, Pill } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  const [rxForm, setRxForm] = useState({
    diagnosis: '', notes: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    medicines: [{ medicine_name: '', dosage: '', frequency: 'once', times: '', before_food: false, duration_days: '', doctor_notes: '' }],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: assignments } = await supabase
        .from('patient_doctors')
        .select('*, patient:patient_id(*, user:user_id(full_name, email, phone))')
        .eq('doctor_id', profile.id);

      const pts = assignments?.map(a => a.patient).filter(Boolean) || [];

      const withData = await Promise.all(pts.map(async p => {
        const { data: health } = await supabase.from('health_records').select('*').eq('patient_id', p.id).order('recorded_at', { ascending: false }).limit(3);
        const { data: prescriptions } = await supabase.from('prescriptions').select('*').eq('patient_id', p.id).eq('is_active', true).limit(3);
        return { ...p, healthHistory: health || [], activePrescriptions: prescriptions || [] };
      }));
      setPatients(withData);

      const { data: appts } = await supabase
        .from('appointments')
        .select('*, patient:patient_id(user:user_id(full_name))')
        .eq('doctor_id', profile.id)
        .order('appointment_date', { ascending: true });
      setAppointments(appts || []);

      const patientIds = withData.map(p => p.id);
      if (patientIds.length > 0) {
        const { data: alts } = await supabase.from('alerts')
          .select('*, patient:patient_id(user:user_id(full_name))')
          .in('patient_id', patientIds).eq('is_resolved', false)
          .order('created_at', { ascending: false });
        setAlerts(alts || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateAppointment = async (id, status) => {
    try {
      await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      toast.success('Appointment ' + status);
      loadData();
    } catch { toast.error('Could not update appointment'); }
  };

  const savePrescription = async () => {
    if (!selectedPatient || !rxForm.diagnosis.trim()) { toast.error('Please enter a diagnosis'); return; }
    setSaving(true);
    try {
      const { data: rx, error: rxErr } = await supabase.from('prescriptions').insert({
        patient_id: selectedPatient.id, doctor_id: profile.id,
        diagnosis: rxForm.diagnosis, notes: rxForm.notes || null,
        start_date: rxForm.start_date, end_date: rxForm.end_date || null,
      }).select().single();
      if (rxErr) throw rxErr;

      for (const med of rxForm.medicines) {
        if (!med.medicine_name.trim()) continue;
        await supabase.from('medicine_reminders').insert({
          prescription_id: rx.id, patient_id: selectedPatient.id,
          medicine_name: med.medicine_name, dosage: med.dosage,
          frequency: med.frequency,
          times: med.times ? med.times.split(',').map(t => t.trim()) : [],
          before_food: med.before_food,
          duration_days: med.duration_days ? parseInt(med.duration_days) : null,
          doctor_notes: med.doctor_notes || null,
        });
      }
      toast.success('Prescription saved! Medicine reminders created automatically.');
      setShowPrescriptionForm(false);
      setRxForm({ diagnosis: '', notes: '', start_date: new Date().toISOString().split('T')[0], end_date: '', medicines: [{ medicine_name: '', dosage: '', frequency: 'once', times: '', before_food: false, duration_days: '', doctor_notes: '' }] });
      loadData();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const updateMed = (idx, field, val) => setRxForm(p => ({ ...p, medicines: p.medicines.map((m, i) => i === idx ? { ...m, [field]: val } : m) }));

  const TABS = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'patients', label: '👥 Patients' },
    { key: 'appointments', label: '📅 Appointments' },
    { key: 'alerts', label: `🔔 Alerts${alerts.length > 0 ? ' (' + alerts.length + ')' : ''}` },
  ];

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🩺 Doctor Dashboard</h2>
        <p className="page-subtitle">Manage patients, prescriptions and appointments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Patients', value: patients.length, icon: '👥', color: '#0ea5e9' },
          { label: 'Pending Appts', value: appointments.filter(a => a.status === 'pending').length, icon: '📅', color: '#f59e0b' },
          { label: 'Active Alerts', value: alerts.length, icon: '🔔', color: '#ef4444' },
          { label: "Today's Appts", value: appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length, icon: '✅', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 20px', borderRadius: 20, border: '2px solid',
            borderColor: activeTab === tab.key ? '#0ea5e9' : '#e5e7eb',
            background: activeTab === tab.key ? '#eff6ff' : 'white',
            color: activeTab === tab.key ? '#0369a1' : '#374151',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📅 Upcoming Appointments</h3>
            {appointments.filter(a => ['pending','accepted'].includes(a.status)).slice(0,5).length === 0
              ? <p style={{ color: '#9ca3af', fontSize: 14 }}>No pending appointments</p>
              : appointments.filter(a => ['pending','accepted'].includes(a.status)).slice(0,5).map(appt => (
              <div key={appt.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{appt.patient?.user?.full_name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{format(new Date(appt.appointment_date), 'MMM d')} · {appt.appointment_time?.slice(0,5)}</div>
                <span className={`badge ${appt.status === 'accepted' ? 'badge-green' : 'badge-amber'}`}>{appt.status}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>👥 My Patients</h3>
            {patients.slice(0,6).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0369a1', fontSize: 14 }}>
                  {p.user?.full_name?.[0] || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.user?.full_name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.age_mode} mode</div>
                </div>
                <button className="btn btn-sm btn-teal" onClick={() => { setSelectedPatient(p); setShowPrescriptionForm(true); }}>
                  <Pill size={12} /> Rx
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {patients.length === 0 ? (
            <div className="card empty-state"><div style={{ fontSize: 48 }}>👥</div><p className="empty-state-text">No patients assigned yet</p></div>
          ) : patients.map(patient => (
            <div key={patient.id} className="card">
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#0369a1' }}>
                  {patient.user?.full_name?.[0] || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{patient.user?.full_name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{patient.age_mode} · {patient.blood_group || 'No BG set'}</div>
                  {patient.medical_conditions?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#f97316' }}>{patient.medical_conditions.join(', ')}</div>
                  )}
                </div>
              </div>
              {patient.healthHistory[0] && (
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: 10, marginBottom: 12, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#6b7280', fontSize: 11, marginBottom: 6 }}>LATEST VITALS</div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {patient.healthHistory[0].bp_systolic && <span>BP: <b>{patient.healthHistory[0].bp_systolic}/{patient.healthHistory[0].bp_diastolic}</b></span>}
                    {patient.healthHistory[0].oxygen_level && <span style={{ color: patient.healthHistory[0].oxygen_level < 90 ? '#ef4444' : '#166534' }}>O₂: <b>{patient.healthHistory[0].oxygen_level}%</b></span>}
                    {patient.healthHistory[0].heart_rate && <span>HR: <b>{patient.healthHistory[0].heart_rate}</b></span>}
                    {patient.healthHistory[0].temperature && <span>Temp: <b>{patient.healthHistory[0].temperature}°C</b></span>}
                  </div>
                </div>
              )}
              {patient.activePrescriptions.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {patient.activePrescriptions.map(rx => (
                    <div key={rx.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                      📋 {rx.diagnosis}
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-teal btn-sm w-full" onClick={() => { setSelectedPatient(patient); setShowPrescriptionForm(true); }}>
                <Pill size={13} /> Write Prescription
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📅 All Appointments</h3>
          {appointments.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 40 }}>📅</div><p className="empty-state-text">No appointments yet</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Patient</th><th>Date & Time</th><th>Reason</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {appointments.map(appt => (
                    <tr key={appt.id}>
                      <td style={{ fontWeight: 600 }}>{appt.patient?.user?.full_name}</td>
                      <td>{format(new Date(appt.appointment_date), 'MMM d')} · {appt.appointment_time?.slice(0,5)}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.reason || '—'}</td>
                      <td><span className={`badge ${appt.consultation_type === 'online' ? 'badge-sky' : 'badge-teal'}`}>{appt.consultation_type}</span></td>
                      <td><span className={`badge ${appt.status === 'accepted' ? 'badge-green' : appt.status === 'cancelled' ? 'badge-rose' : appt.status === 'completed' ? 'badge-purple' : 'badge-amber'}`}>{appt.status}</span></td>
                      <td>
                        {appt.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm" style={{ background: '#166534', color: 'white', padding: '5px 12px' }} onClick={() => updateAppointment(appt.id, 'accepted')}><CheckCircle size={12} /> Accept</button>
                            <button className="btn btn-sm btn-danger" style={{ padding: '5px 12px' }} onClick={() => updateAppointment(appt.id, 'cancelled')}><XCircle size={12} /> Decline</button>
                          </div>
                        )}
                        {appt.status === 'accepted' && (
                          <button className="btn btn-sm" style={{ background: '#7e22ce', color: 'white', padding: '5px 12px' }} onClick={() => updateAppointment(appt.id, 'completed')}>Complete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔔 Patient Alerts</h3>
          {alerts.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 40 }}>✅</div><p className="empty-state-text">No active alerts</p></div>
          ) : alerts.map(alert => {
            const c = { 1: { bg: '#fef9c3', color: '#713f12', border: '#fde047' }, 2: { bg: '#fed7aa', color: '#9a3412', border: '#fb923c' }, 3: { bg: '#fecdd3', color: '#9f1239', border: '#f43f5e' } }[alert.alert_level] || {};
            return (
              <div key={alert.id} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: c.color, fontSize: 15 }}>Level {alert.alert_level} — {alert.patient?.user?.full_name}</div>
                <p style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{alert.message_caregiver}</p>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{format(new Date(alert.created_at), 'MMM d, h:mm a')}</div>
              </div>
            );
          })}
        </div>
      )}

      {showPrescriptionForm && selectedPatient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPrescriptionForm(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>📋 New Prescription — {selectedPatient.user?.full_name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPrescriptionForm(false)}><X size={16} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Diagnosis *</label>
              <input type="text" className="form-input" placeholder="Primary diagnosis" value={rxForm.diagnosis} onChange={e => setRxForm(p => ({ ...p, diagnosis: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={rxForm.start_date} onChange={e => setRxForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={rxForm.end_date} onChange={e => setRxForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>💊 Medicines</div>
            {rxForm.medicines.map((med, idx) => (
              <div key={idx} style={{ background: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Medicine #{idx + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Name *</label>
                    <input type="text" className="form-input" placeholder="e.g. Paracetamol" value={med.medicine_name} onChange={e => updateMed(idx, 'medicine_name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Dosage</label>
                    <input type="text" className="form-input" placeholder="e.g. 500mg" value={med.dosage} onChange={e => updateMed(idx, 'dosage', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Frequency</label>
                    <select className="form-input form-select" value={med.frequency} onChange={e => updateMed(idx, 'frequency', e.target.value)}>
                      <option value="once">Once daily</option>
                      <option value="twice">Twice daily</option>
                      <option value="thrice">Three times daily</option>
                      <option value="four">Four times daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="as_needed">As needed</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Times (comma sep.)</label>
                    <input type="text" className="form-input" placeholder="8:00 AM, 8:00 PM" value={med.times} onChange={e => updateMed(idx, 'times', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Duration (days)</label>
                    <input type="number" className="form-input" placeholder="e.g. 7" value={med.duration_days} onChange={e => updateMed(idx, 'duration_days', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
                    <input type="checkbox" id={`bf-${idx}`} checked={med.before_food} onChange={e => updateMed(idx, 'before_food', e.target.checked)} style={{ width: 18, height: 18 }} />
                    <label htmlFor={`bf-${idx}`} style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Before food</label>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Special Instructions</label>
                  <input type="text" className="form-input" placeholder="Any special instructions..." value={med.doctor_notes} onChange={e => updateMed(idx, 'doctor_notes', e.target.value)} />
                </div>
              </div>
            ))}
            <button className="btn btn-outline btn-sm mb-3" onClick={() => setRxForm(p => ({ ...p, medicines: [...p.medicines, { medicine_name: '', dosage: '', frequency: 'once', times: '', before_food: false, duration_days: '', doctor_notes: '' }] }))}>
              <Plus size={14} /> Add Medicine
            </button>
            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea className="form-input form-textarea" rows={2} placeholder="General notes..." value={rxForm.notes} onChange={e => setRxForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline flex-1" onClick={() => setShowPrescriptionForm(false)}>Cancel</button>
              <button className="btn btn-teal flex-1" onClick={savePrescription} disabled={saving}>{saving ? 'Saving...' : '💊 Save Prescription'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
