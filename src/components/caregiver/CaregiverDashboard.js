import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { sendAppNotification } from '../../services/notifications';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const VITALS = [
  { key:'bp_systolic',  label:'BP Systolic',  unit:'mmHg', icon:'🩸', placeholder:'e.g. 120', warn:140, danger:160 },
  { key:'bp_diastolic', label:'BP Diastolic', unit:'mmHg', icon:'🩸', placeholder:'e.g. 80',  warn:90,  danger:100 },
  { key:'blood_sugar',  label:'Blood Sugar',  unit:'mg/dL',icon:'🍬', placeholder:'e.g. 110', warn:140, danger:200 },
  { key:'oxygen_level', label:'Oxygen',       unit:'%',    icon:'💨', placeholder:'e.g. 98',  warn:94,  danger:90, reverse:true },
  { key:'heart_rate',   label:'Heart Rate',   unit:'bpm',  icon:'❤️', placeholder:'e.g. 72',  warn:100, danger:120 },
  { key:'temperature',  label:'Temperature',  unit:'°C',   icon:'🌡️', placeholder:'e.g. 37.0',warn:38,  danger:39 },
];

function vitalStatus(v, val) {
  if (!val) return 'normal';
  const n = parseFloat(val);
  if (v.reverse) return n < v.danger ? 'danger' : n < v.warn ? 'warn' : 'normal';
  return n >= v.danger ? 'danger' : n >= v.warn ? 'warn' : 'normal';
}

function calcAlertLevel(form) {
  let max = 0;
  VITALS.forEach(v => {
    const s = vitalStatus(v, form[v.key]);
    if (s === 'danger') max = Math.max(max, 3);
    else if (s === 'warn') max = Math.max(max, 2);
  });
  return max;
}

const STATUS_BG = { normal:'#f0fdf4', warn:'#fffbeb', danger:'#fef2f2' };
const STATUS_COLOR = { normal:'#166534', warn:'#92400e', danger:'#991b1b' };
const STATUS_BORDER = { normal:'#86efac', warn:'#fde68a', danger:'#fca5a5' };

export default function CaregiverDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medLogs, setMedLogs] = useState({});
  const [activeTab, setActiveTab] = useState('patients');

  const [healthForm, setHealthForm] = useState({
    bp_systolic:'', bp_diastolic:'', blood_sugar:'',
    oxygen_level:'', heart_rate:'', temperature:'',
    symptoms:'', food_intake:'', notes:'', mood:''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: asgn } = await supabase.from('patient_caregivers')
        .select('*, patient:patient_id(*, user:user_id(full_name, email, phone))')
        .eq('caregiver_id', profile.id);

      const pts = asgn?.map(a => a.patient).filter(Boolean) || [];

      const withData = await Promise.all(pts.map(async p => {
        const { data: health } = await supabase.from('health_records')
          .select('*').eq('patient_id', p.id)
          .order('recorded_at', { ascending: false }).limit(1).maybeSingle();
        const { data: meds } = await supabase.from('medicine_reminders')
          .select('*').eq('patient_id', p.id).eq('is_active', true);
        const { data: todayLogs } = await supabase.from('medicine_logs')
          .select('*').eq('patient_id', p.id)
          .gte('scheduled_time', new Date().toISOString().split('T')[0]);
        return { ...p, latestHealth: health, medicines: meds || [], todayLogs: todayLogs || [] };
      }));

      setPatients(withData);

      const patientIds = withData.map(p => p.id);
      if (patientIds.length > 0) {
        const { data: alts } = await supabase.from('alerts')
          .select('*, patient:patient_id(user:user_id(full_name))')
          .in('patient_id', patientIds).eq('is_resolved', false)
          .order('created_at', { ascending: false });
        setAlerts(alts || []);
      }
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openHealthForm = (patient) => {
    setSelectedPatient(patient);
    setHealthForm({ bp_systolic:'', bp_diastolic:'', blood_sugar:'', oxygen_level:'', heart_rate:'', temperature:'', symptoms:'', food_intake:'', notes:'', mood:'' });
    setShowHealthForm(true);
  };

  const submitHealth = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const alertLevel = calcAlertLevel(healthForm);
      const record = {
        patient_id: selectedPatient.id,
        recorded_by: profile.id,
        alert_level: alertLevel,
        bp_systolic: healthForm.bp_systolic ? parseInt(healthForm.bp_systolic) : null,
        bp_diastolic: healthForm.bp_diastolic ? parseInt(healthForm.bp_diastolic) : null,
        blood_sugar: healthForm.blood_sugar ? parseFloat(healthForm.blood_sugar) : null,
        oxygen_level: healthForm.oxygen_level ? parseFloat(healthForm.oxygen_level) : null,
        heart_rate: healthForm.heart_rate ? parseInt(healthForm.heart_rate) : null,
        temperature: healthForm.temperature ? parseFloat(healthForm.temperature) : null,
        symptoms: healthForm.symptoms ? healthForm.symptoms.split(',').map(s=>s.trim()).filter(Boolean) : [],
        food_intake: healthForm.food_intake || null,
        notes: healthForm.notes || null,
      };

      const { data: saved, error } = await supabase.from('health_records').insert(record).select().single();
      if (error) throw error;

      if (alertLevel > 0) {
        const name = selectedPatient.user?.full_name;
        const MSGS = {
          1: { cg:`Mild abnormality for ${name}. Monitor closely.`, pt:`Your care team has noted a small health update. Everything is being looked after. 🌿` },
          2: { cg:`Attention needed for ${name}. Doctor notified.`, pt:`Your health needs a little extra care today. Your caregiver has been informed. Please stay calm. 💙` },
          3: { cg:`🚨 EMERGENCY: Critical reading for ${name}!`, pt:`Your care team is with you right now. Please stay calm. You are not alone. 💙` },
        };
        await supabase.from('alerts').insert({ patient_id: selectedPatient.id, health_record_id: saved.id, alert_level: alertLevel, alert_type:'health_reading', message_caregiver: MSGS[alertLevel].cg, message_patient: MSGS[alertLevel].pt });

        // Notify assigned doctors
        const { data: docs } = await supabase.from('patient_doctors').select('doctor:doctor_id(id,full_name)').eq('patient_id', selectedPatient.id);
        for (const d of docs || []) {
          await sendAppNotification({ userId: d.doctor?.id, patientId: selectedPatient.id, type:'alert', title:`🚨 Alert Level ${alertLevel} — ${name}`, message: MSGS[alertLevel].cg });
        }
      }

      toast.success('✅ Health record saved successfully!');
      setShowHealthForm(false);
      loadData();
    } catch(err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const logMed = async (medId, patientId, status) => {
    try {
      await supabase.from('medicine_logs').insert({ reminder_id: medId, patient_id: patientId, scheduled_time: new Date().toISOString(), taken_at: status==='taken'?new Date().toISOString():null, status, logged_by: profile.id });
      setMedLogs(p => ({ ...p, [medId]: status }));
      toast.success(`Medicine marked as ${status}`);
      loadData();
    } catch { toast.error('Could not log medicine'); }
  };

  const resolveAlert = async (id) => {
    await supabase.from('alerts').update({ is_resolved: true, resolved_by: profile.id, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success('Alert resolved');
    loadData();
  };

  const alertBadge = (level) => ({
    1: { label:'💛 Care Reminder', bg:'#fef9c3', color:'#713f12' },
    2: { label:'⚠️ Attention Needed', bg:'#fed7aa', color:'#9a3412' },
    3: { label:'🚨 Emergency', bg:'#fecdd3', color:'#9f1239' },
  }[level] || {});

  if (loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🤝 Caregiver Dashboard</h2>
        <p className="page-subtitle">Monitor patients, log vitals, track medicines</p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {[
          { label:'My Patients', value:patients.length, icon:'👥', color:'#0d9488' },
          { label:'Active Alerts', value:alerts.length, icon:'🔔', color:'#ef4444' },
          { label:'Today Medicines', value:patients.reduce((a,p)=>a+p.medicines.length,0), icon:'💊', color:'#f97316' },
        ].map(s=>(
          <div key={s.label} className="card" style={{textAlign:'center',padding:20}}>
            <div style={{fontSize:28,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:12,color:'#9ca3af',fontWeight:700}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {[{key:'patients',label:'👥 Patients'},{key:'alerts',label:`🔔 Alerts${alerts.length>0?' ('+alerts.length+')':''}`}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'10px 20px',borderRadius:20,border:'2px solid',fontWeight:700,fontSize:14,cursor:'pointer',borderColor:activeTab===t.key?'#0d9488':'#e5e7eb',background:activeTab===t.key?'#f0fdfa':'white',color:activeTab===t.key?'#0f766e':'#374151'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div className="card empty-state"><div style={{fontSize:48}}>✅</div><p className="empty-state-text">No active alerts — all patients stable</p></div>
          ) : alerts.map(alert => {
            const b = alertBadge(alert.alert_level);
            return (
              <div key={alert.id} style={{background:b.bg,border:`2px solid ${b.color}40`,borderRadius:16,padding:16,marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                  <div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                      <span style={{background:b.bg,color:b.color,padding:'3px 12px',borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${b.color}50`}}>{b.label}</span>
                      <span style={{fontWeight:700,color:b.color}}>{alert.patient?.user?.full_name}</span>
                    </div>
                    <p style={{fontSize:14,color:'#374151'}}>{alert.message_caregiver}</p>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>{format(new Date(alert.created_at),'MMM d, h:mm a')}</div>
                  </div>
                  <button className="btn btn-sm" style={{background:'#166534',color:'white',flexShrink:0}} onClick={()=>resolveAlert(alert.id)}>
                    <CheckCircle size={14}/> Resolve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:20}}>
          {patients.length === 0 ? (
            <div className="card empty-state" style={{gridColumn:'1/-1'}}>
              <div style={{fontSize:48}}>👥</div>
              <p className="empty-state-text">No patients assigned yet.</p>
              <p style={{fontSize:13,color:'#9ca3af'}}>Go to My Care Circle and enter a patient's invite code to connect.</p>
            </div>
          ) : patients.map(patient => {
            const alertLevel = patient.latestHealth?.alert_level || 0;
            const b = alertBadge(alertLevel);
            return (
              <div key={patient.id} className="card" style={{border:alertLevel>0?`2px solid ${b.color}40`:'2px solid #f3f4f6'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#0d9488'}}>
                    {patient.user?.full_name?.[0]||'?'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:16}}>{patient.user?.full_name}</div>
                    <div style={{fontSize:12,color:'#9ca3af'}}>{patient.age_mode} mode · {patient.blood_group||'No blood group'}</div>
                  </div>
                  {alertLevel > 0 && <span style={{background:b.bg,color:b.color,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{b.label}</span>}
                </div>

                {/* Latest Vitals */}
                {patient.latestHealth && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:'#9ca3af',fontWeight:700,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Latest Vitals · {format(new Date(patient.latestHealth.recorded_at),'MMM d, h:mm a')}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                      {[
                        { label:'BP', value: patient.latestHealth.bp_systolic ? `${patient.latestHealth.bp_systolic}/${patient.latestHealth.bp_diastolic}` : null, vKey:'bp_systolic' },
                        { label:'O₂', value: patient.latestHealth.oxygen_level ? `${patient.latestHealth.oxygen_level}%` : null, vKey:'oxygen_level' },
                        { label:'HR', value: patient.latestHealth.heart_rate ? `${patient.latestHealth.heart_rate}` : null, vKey:'heart_rate' },
                        { label:'Temp', value: patient.latestHealth.temperature ? `${patient.latestHealth.temperature}°` : null, vKey:'temperature' },
                        { label:'Sugar', value: patient.latestHealth.blood_sugar ? `${patient.latestHealth.blood_sugar}` : null, vKey:'blood_sugar' },
                      ].filter(v=>v.value).map(v => {
                        const vital = VITALS.find(vt=>vt.key===v.vKey);
                        const s = vital ? vitalStatus(vital, patient.latestHealth[v.vKey]) : 'normal';
                        return (
                          <div key={v.label} style={{background:STATUS_BG[s],borderRadius:10,padding:'8px 6px',textAlign:'center',border:`1px solid ${STATUS_BORDER[s]}`}}>
                            <div style={{fontWeight:800,fontSize:14,color:STATUS_COLOR[s]}}>{v.value}</div>
                            <div style={{fontSize:10,color:STATUS_COLOR[s]}}>{v.label}</div>
                            {s!=='normal'&&<div style={{fontSize:9,fontWeight:700,color:STATUS_COLOR[s]}}>{s==='danger'?'⚠️ HIGH':'↑ WATCH'}</div>}
                          </div>
                        );
                      })}
                    </div>
                    {patient.latestHealth.symptoms?.length > 0 && (
                      <div style={{marginTop:8,fontSize:12,color:'#6b7280'}}>Symptoms: {patient.latestHealth.symptoms.join(', ')}</div>
                    )}
                    {patient.latestHealth.notes && <div style={{marginTop:4,fontSize:12,color:'#9ca3af',fontStyle:'italic'}}>Note: {patient.latestHealth.notes}</div>}
                  </div>
                )}

                {/* Medicine Tracking */}
                {patient.medicines.length > 0 && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:'#9ca3af',fontWeight:700,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Medicines Today</div>
                    {patient.medicines.slice(0,4).map(med => {
                      const todayStatus = patient.todayLogs.find(l=>l.reminder_id===med.id)?.status || medLogs[med.id];
                      return (
                        <div key={med.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>
                          <span style={{fontSize:16}}>{todayStatus==='taken'?'✅':todayStatus==='missed'?'❌':'💊'}</span>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:13}}>{med.medicine_name}</div>
                            <div style={{fontSize:11,color:'#9ca3af'}}>{med.dosage} · {med.frequency}</div>
                          </div>
                          {!todayStatus ? (
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>logMed(med.id,patient.id,'taken')} style={{padding:'4px 10px',borderRadius:20,border:'none',background:'#166534',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Taken</button>
                              <button onClick={()=>logMed(med.id,patient.id,'missed')} style={{padding:'4px 10px',borderRadius:20,border:'none',background:'#fef2f2',color:'#9f1239',fontSize:11,fontWeight:700,cursor:'pointer'}}>✗ Miss</button>
                            </div>
                          ) : (
                            <span className={`badge ${todayStatus==='taken'?'badge-green':'badge-rose'}`}>{todayStatus}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div style={{display:'flex',gap:10}}>
                  <button className="btn btn-teal btn-sm" style={{flex:1}} onClick={()=>openHealthForm(patient)}>
                    📊 Log Vitals
                  </button>
                  {alertLevel >= 2 && (
                    <button className="btn btn-sm btn-danger" style={{flex:1}}>
                      🚨 Alert Doctor
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Health Form Modal */}
      {showHealthForm && selectedPatient && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowHealthForm(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 className="modal-title" style={{marginBottom:0}}>📊 Log Health Data — {selectedPatient.user?.full_name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowHealthForm(false)}><X size={16}/></button>
            </div>

            {/* Vitals */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
              {VITALS.map(v => {
                const s = vitalStatus(v, healthForm[v.key]);
                return (
                  <div key={v.key} style={{background:STATUS_BG[s],borderRadius:14,padding:14,border:`2px solid ${STATUS_BORDER[s]}`}}>
                    <label style={{fontSize:11,fontWeight:700,color:STATUS_COLOR[s],display:'block',marginBottom:6}}>
                      {v.icon} {v.label} ({v.unit})
                      {s!=='normal'&&<span style={{marginLeft:6,fontSize:10}}>{s==='danger'?'⚠️ High!':'↑ Watch'}</span>}
                    </label>
                    <input type="number" step="0.1"
                      placeholder={v.placeholder}
                      value={healthForm[v.key]}
                      onChange={e=>setHealthForm(p=>({...p,[v.key]:e.target.value}))}
                      style={{width:'100%',border:'none',background:'transparent',fontSize:20,fontWeight:800,color:STATUS_COLOR[s],outline:'none',padding:0}}
                    />
                  </div>
                );
              })}
            </div>

            {/* Alert preview */}
            {calcAlertLevel(healthForm) > 0 && (() => {
              const level = calcAlertLevel(healthForm);
              const b = alertBadge(level);
              return (
                <div style={{background:b.bg,border:`2px solid ${b.color}40`,borderRadius:12,padding:12,marginBottom:14}}>
                  <div style={{fontWeight:700,color:b.color,fontSize:13}}>{b.label} will be triggered</div>
                  <div style={{fontSize:12,color:b.color,marginTop:2}}>
                    {level===3?'Doctor + family + emergency contacts will be notified':level===2?'Doctor will be notified':'Caregiver note only'}
                  </div>
                </div>
              );
            })()}

            <div className="form-group">
              <label className="form-label">Patient Mood</label>
              <select className="form-input form-select" value={healthForm.mood} onChange={e=>setHealthForm(p=>({...p,mood:e.target.value}))}>
                <option value="">Select mood...</option>
                <option value="great">😊 Great</option>
                <option value="good">🙂 Good</option>
                <option value="okay">😐 Okay</option>
                <option value="low">😔 Low</option>
                <option value="distressed">😢 Distressed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Symptoms (comma separated)</label>
              <input type="text" className="form-input" placeholder="e.g. headache, nausea, fatigue" value={healthForm.symptoms} onChange={e=>setHealthForm(p=>({...p,symptoms:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Food Intake</label>
              <input type="text" className="form-input" placeholder="e.g. Breakfast eaten well, lunch half" value={healthForm.food_intake} onChange={e=>setHealthForm(p=>({...p,food_intake:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Care Notes</label>
              <textarea className="form-input form-textarea" rows={3} placeholder="Observations, patient behaviour, anything important..." value={healthForm.notes} onChange={e=>setHealthForm(p=>({...p,notes:e.target.value}))}/>
            </div>

            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-outline flex-1" onClick={()=>setShowHealthForm(false)}>Cancel</button>
              <button className="btn btn-teal flex-1 btn-lg" onClick={submitHealth} disabled={saving}>
                {saving?'Saving...':'💾 Save Health Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
