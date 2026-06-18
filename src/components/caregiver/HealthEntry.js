import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { sendAppNotification } from '../../services/notifications';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

const VITALS = [
  { key:'bp_systolic',   label:'BP Systolic',   unit:'mmHg', icon:'🩸', normal:[90,139],  warn:[140,159], danger:[160,999] },
  { key:'bp_diastolic',  label:'BP Diastolic',  unit:'mmHg', icon:'🩸', normal:[60,89],   warn:[90,99],   danger:[100,999] },
  { key:'blood_sugar',   label:'Blood Sugar',   unit:'mg/dL',icon:'🍬', normal:[70,139],  warn:[140,199], danger:[200,999] },
  { key:'oxygen_level',  label:'Oxygen Level',  unit:'%',    icon:'💨', normal:[95,100],  warn:[90,94],   danger:[0,89],   reverse:true },
  { key:'heart_rate',    label:'Heart Rate',    unit:'bpm',  icon:'❤️', normal:[60,99],   warn:[100,119], danger:[120,999] },
  { key:'temperature',   label:'Temperature',   unit:'°C',   icon:'🌡️', normal:[36,37.9], warn:[38,38.9], danger:[39,999] },
];

function getVitalStatus(key, value) {
  const vital = VITALS.find(v => v.key === key);
  if (!vital || !value) return 'normal';
  const v = parseFloat(value);
  if (vital.reverse) {
    if (v <= vital.danger[1]) return 'danger';
    if (v <= vital.warn[1]) return 'warn';
    return 'normal';
  }
  if (v >= vital.danger[0]) return 'danger';
  if (v >= vital.warn[0]) return 'warn';
  return 'normal';
}

function getAlertLevel(form) {
  let max = 0;
  VITALS.forEach(v => {
    if (!form[v.key]) return;
    const s = getVitalStatus(v.key, form[v.key]);
    if (s === 'danger') max = Math.max(max, 3);
    else if (s === 'warn') max = Math.max(max, 2);
  });
  return max;
}

export default function HealthEntry({ patientId, patientName, onSaved }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ bp_systolic:'', bp_diastolic:'', blood_sugar:'', oxygen_level:'', heart_rate:'', temperature:'', symptoms:'', food_intake:'', notes:'' });
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { if (patientId) loadHistory(); }, [patientId]);

  const loadHistory = async () => {
    const { data } = await supabase.from('health_records').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }).limit(7);
    setHistory(data || []);
  };

  const save = async () => {
    setSaving(true);
    try {
      const alertLevel = getAlertLevel(form);
      const record = {
        patient_id: patientId, recorded_by: profile.id, alert_level: alertLevel,
        bp_systolic: form.bp_systolic ? parseInt(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? parseInt(form.bp_diastolic) : null,
        blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
        oxygen_level: form.oxygen_level ? parseFloat(form.oxygen_level) : null,
        heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        symptoms: form.symptoms ? form.symptoms.split(',').map(s=>s.trim()).filter(Boolean) : [],
        food_intake: form.food_intake || null,
        notes: form.notes || null,
      };

      const { data: saved, error } = await supabase.from('health_records').insert(record).select().single();
      if (error) throw error;

      // Create alert if needed
      if (alertLevel > 0) {
        const msgs = {
          1: { cg: `Mild abnormality detected for ${patientName}. Monitor closely.`,     pt: 'Your care team has noted a small health update. Everything is being looked after. 🌿' },
          2: { cg: `Attention needed for ${patientName}. Please notify the doctor.`,     pt: 'Your health needs a little extra care today. Your caregiver has already been notified. Please stay calm. 💙' },
          3: { cg: `⚠️ EMERGENCY: Critical reading for ${patientName}. Act immediately!`, pt: 'Your care team is looking after you right now. Please stay calm. You are not alone. 💙' },
        };
        await supabase.from('alerts').insert({ patient_id: patientId, health_record_id: saved.id, alert_level: alertLevel, alert_type: 'health_reading', message_caregiver: msgs[alertLevel].cg, message_patient: msgs[alertLevel].pt });

        // Notify doctor
        const { data: doctors } = await supabase.from('patient_doctors').select('doctor:doctor_id(id)').eq('patient_id', patientId);
        for (const d of doctors || []) {
          await sendAppNotification({ userId: d.doctor?.id, patientId, type: 'alert', title: `🚨 Alert Level ${alertLevel} — ${patientName}`, message: msgs[alertLevel].cg });
        }
      }

      toast.success('Health record saved!');
      setForm({ bp_systolic:'', bp_diastolic:'', blood_sugar:'', oxygen_level:'', heart_rate:'', temperature:'', symptoms:'', food_intake:'', notes:'' });
      loadHistory();
      if (onSaved) onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const alertLevel = getAlertLevel(form);
  const STATUS_STYLES = {
    normal: { bg:'#f0fdf4', color:'#166534', border:'#86efac' },
    warn:   { bg:'#fffbeb', color:'#92400e', border:'#fde68a' },
    danger: { bg:'#fef2f2', color:'#991b1b', border:'#fca5a5' },
  };

  const getTrend = (key, idx) => {
    if (idx >= history.length - 1) return null;
    const curr = parseFloat(history[idx][key]);
    const prev = parseFloat(history[idx+1]?.[key]);
    if (isNaN(curr) || isNaN(prev)) return null;
    if (curr > prev) return 'up';
    if (curr < prev) return 'down';
    return 'same';
  };

  return (
    <div>
      {/* Vitals Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {VITALS.map(v => {
          const status = getVitalStatus(v.key, form[v.key]);
          const s = STATUS_STYLES[status];
          return (
            <div key={v.key} style={{ background:s.bg, border:`2px solid ${s.border}`, borderRadius:16, padding:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{v.label}</span>
                <span>{v.icon}</span>
              </div>
              <input type="number" step="0.1"
                placeholder={`${v.normal[0]}–${v.normal[1]}`}
                value={form[v.key]}
                onChange={e => setForm(p=>({...p,[v.key]:e.target.value}))}
                style={{ width:'100%', border:'none', background:'transparent', fontSize:22, fontWeight:800, color:s.color, outline:'none', padding:0 }}
              />
              <div style={{ fontSize:11, color:s.color, marginTop:2 }}>{v.unit}</div>
            </div>
          );
        })}
      </div>

      {/* Alert preview */}
      {alertLevel > 0 && (
        <div style={{ background: alertLevel===3?'#fef2f2':alertLevel===2?'#fffbeb':'#fefce8', border:`2px solid ${alertLevel===3?'#fca5a5':alertLevel===2?'#fde68a':'#fef08a'}`, borderRadius:14, padding:14, marginBottom:16 }}>
          <div style={{ fontWeight:700, color: alertLevel===3?'#991b1b':alertLevel===2?'#92400e':'#713f12' }}>
            {alertLevel===3?'🚨 Emergency — Doctor & family will be notified':alertLevel===2?'⚠️ Attention Needed — Doctor will be notified':'💛 Care Reminder — Caregiver note'}
          </div>
        </div>
      )}

      {/* Other fields */}
      <div className="form-group">
        <label className="form-label">Symptoms (comma separated)</label>
        <input type="text" className="form-input" placeholder="e.g. headache, nausea, fatigue" value={form.symptoms} onChange={e=>setForm(p=>({...p,symptoms:e.target.value}))}/>
      </div>
      <div className="form-group">
        <label className="form-label">Food Intake</label>
        <input type="text" className="form-input" placeholder="e.g. Breakfast eaten well, lunch skipped" value={form.food_intake} onChange={e=>setForm(p=>({...p,food_intake:e.target.value}))}/>
      </div>
      <div className="form-group">
        <label className="form-label">Care Notes</label>
        <textarea className="form-input form-textarea" rows={2} placeholder="Observations, patient mood, anything important..." value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
      </div>

      <button className="btn btn-teal btn-lg w-full" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : '💾 Save Health Record'}
      </button>

      {/* Trend History */}
      {history.length > 0 && (
        <div style={{ marginTop:20 }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowHistory(!showHistory)}>
            <TrendingUp size={14}/> {showHistory?'Hide':'Show'} Recent Trends ({history.length} records)
          </button>
          {showHistory && (
            <div className="card mt-3" style={{ padding:16, overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left', padding:'6px 8px', color:'#9ca3af', fontWeight:700 }}>Date</th>
                    {VITALS.slice(0,5).map(v=><th key={v.key} style={{ textAlign:'center', padding:'6px 8px', color:'#9ca3af', fontWeight:700 }}>{v.icon} {v.label.split(' ')[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h,i) => (
                    <tr key={h.id} style={{ borderTop:'1px solid #f3f4f6' }}>
                      <td style={{ padding:'8px', color:'#6b7280' }}>{format(new Date(h.recorded_at),'MMM d, HH:mm')}</td>
                      {VITALS.slice(0,5).map(v => {
                        const val = h[v.key];
                        const status = getVitalStatus(v.key, val);
                        const trend = getTrend(v.key, i);
                        const tc = { up:'#ef4444', down:'#22c55e', same:'#9ca3af' };
                        return (
                          <td key={v.key} style={{ padding:'8px', textAlign:'center', fontWeight:700, color: status==='danger'?'#991b1b':status==='warn'?'#92400e':'#166534' }}>
                            {val || '—'}
                            {trend && val && (
                              <span style={{ marginLeft:4, color: tc[trend] }}>
                                {trend==='up'?'↑':trend==='down'?'↓':'–'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
