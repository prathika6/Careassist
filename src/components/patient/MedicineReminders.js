import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { format, isToday, parseISO } from 'date-fns';

export default function MedicineReminders({ compact = false }) {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [medicines, setMedicines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState({});
  const mode = patientRecord?.age_mode || 'adult';

  useEffect(() => {
    if (patientRecord?.id) loadData();
  }, [patientRecord]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: meds } = await supabase.from('medicine_reminders')
        .select('*, prescription:prescription_id(diagnosis, doctor:doctor_id(full_name))')
        .eq('patient_id', patientRecord.id).eq('is_active', true)
        .order('created_at', { ascending: true });
      setMedicines(meds || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: logsData } = await supabase.from('medicine_logs')
        .select('*').eq('patient_id', patientRecord.id)
        .gte('scheduled_time', today).order('created_at', { ascending: false });
      setLogs(logsData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const logMedicine = async (medId, status) => {
    setLogging(p => ({ ...p, [medId]: true }));
    try {
      await supabase.from('medicine_logs').insert({
        reminder_id: medId, patient_id: patientRecord.id,
        scheduled_time: new Date().toISOString(),
        taken_at: status === 'taken' ? new Date().toISOString() : null,
        status, logged_by: profile.id,
      });
      const msgs = {
        child: { taken: '⭐ Amazing! You took your medicine! You are so brave!', missed: "That's okay! Don't forget next time 💛" },
        adult: { taken: '✅ Medicine marked as taken. Great job!', missed: 'Marked as missed. Let your caregiver know if you need help.' },
        elder: { taken: '🌸 Well done, dear. Medicine noted.', missed: 'Noted as missed. Please let your caregiver know.' },
      };
      toast.success(msgs[mode][status]);
      loadData();
    } catch { toast.error('Could not log medicine status'); }
    finally { setLogging(p => ({ ...p, [medId]: false })); }
  };

  const getTodayStatus = (medId) => logs.find(l => l.reminder_id === medId)?.status;

  const getEncouragingLabel = (med) => {
    if (mode === 'child') return `Hey little star! Time for ${med.medicine_name} — it makes you stronger! 💊⭐`;
    if (mode === 'elder') return `A gentle reminder to take your ${med.medicine_name}, dear. 🌸`;
    return `${med.before_food ? 'Before food' : 'After food'} · ${med.times?.join(', ') || med.frequency}`;
  };

  const FREQ_LABELS = { once:'Once daily', twice:'Twice daily', thrice:'3× daily', four:'4× daily', weekly:'Weekly', as_needed:'As needed' };

  if (loading) return <div style={{ padding:20, textAlign:'center', color:'#9ca3af' }}>Loading medicines...</div>;

  if (compact) {
    return (
      <div>
        {medicines.slice(0,3).map(med => {
          const status = getTodayStatus(med.id);
          return (
            <div key={med.id} className="medicine-item" style={{ background: status==='taken'?'#f0fdf4':status==='missed'?'#fff1f2':'#f9fafb' }}>
              <div className="medicine-icon">{status==='taken'?'✅':status==='missed'?'❌':'💊'}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{med.medicine_name}</div>
                <div style={{ fontSize:12, color:'#9ca3af' }}>{med.dosage} · {FREQ_LABELS[med.frequency]||med.frequency}</div>
              </div>
              {!status && (
                <button onClick={() => logMedicine(med.id,'taken')} disabled={logging[med.id]}
                  style={{ padding:'6px 14px', borderRadius:20, border:'none', background:'#0d9488', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  {mode==='child'?'⭐ Took it!':'✓ Taken'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          {mode==='child'?'⭐ My Medicine Heroes':mode==='elder'?'🌸 Medicine Reminders':'💊 My Medicines'}
        </h2>
        <p className="page-subtitle">
          {mode==='child'?'Each one makes you stronger!':mode==='elder'?'Your gentle daily reminders':'Stay on track with your prescriptions'}
        </p>
      </div>

      {/* Progress bar */}
      {medicines.length > 0 && (
        <div className="card mb-4" style={{ padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontWeight:700, fontSize:14 }}>
              {mode==='child'?'🌟 Today\'s Hero Score':'📊 Today\'s Progress'}
            </span>
            <span style={{ fontSize:13, color:'#9ca3af' }}>
              {logs.filter(l=>l.status==='taken').length} / {medicines.length} taken
            </span>
          </div>
          <div style={{ height:10, background:'#f3f4f6', borderRadius:10, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:10, transition:'width 0.5s ease',
              background: logs.filter(l=>l.status==='taken').length === medicines.length ? '#22c55e' : '#0d9488',
              width: `${medicines.length > 0 ? (logs.filter(l=>l.status==='taken').length / medicines.length)*100 : 0}%`,
            }}/>
          </div>
          {logs.filter(l=>l.status==='taken').length === medicines.length && medicines.length > 0 && (
            <div style={{ textAlign:'center', marginTop:12, fontSize:mode==='elder'?16:14, fontWeight:700, color:'#166534' }}>
              {mode==='child'?'🎉 All medicines taken! You\'re a superhero today!':mode==='elder'?'🌸 All medicines taken. Well done, dear!':'✅ All medicines taken today — excellent work!'}
            </div>
          )}
        </div>
      )}

      {medicines.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize:52 }}>💊</div>
          <p className="empty-state-text">No active medicines. Your doctor will add prescriptions here.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {medicines.map(med => {
            const status = getTodayStatus(med.id);
            return (
              <div key={med.id} className="card" style={{
                border: status==='taken'?'2px solid #86efac':status==='missed'?'2px solid #fca5a5':'2px solid #f3f4f6',
                background: status==='taken'?'#f0fdf4':status==='missed'?'#fff1f2':'white',
              }}>
                <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  <div style={{ width:52, height:52, borderRadius:16, flexShrink:0,
                    background:status==='taken'?'#bbf7d0':status==='missed'?'#fecdd3':'#fff9f0',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>
                    {status==='taken'?'✅':status==='missed'?'❌':'💊'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:mode==='elder'?18:16, color:'#111827', marginBottom:4 }}>
                      {med.medicine_name}
                    </div>
                    <p style={{ fontSize:mode==='elder'?14:13, color:'#6b7280', marginBottom:10, fontStyle:'italic' }}>
                      {getEncouragingLabel(med)}
                    </p>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span className="badge badge-coral">💊 {med.dosage}</span>
                      <span className="badge badge-teal">{FREQ_LABELS[med.frequency]||med.frequency}</span>
                      {med.before_food!==null && <span className="badge badge-amber">{med.before_food?'🍽️ Before food':'🍽️ After food'}</span>}
                      {med.duration_days && <span className="badge badge-sky">📅 {med.duration_days} days</span>}
                    </div>
                    {med.prescription?.diagnosis && (
                      <div style={{ fontSize:12, color:'#9ca3af', marginTop:8 }}>
                        📋 {med.prescription.diagnosis}
                        {med.prescription.doctor?.full_name&&` · Dr. ${med.prescription.doctor.full_name}`}
                      </div>
                    )}
                    {med.doctor_notes && (
                      <div style={{ fontSize:12, color:'#0d9488', marginTop:4, fontWeight:600 }}>
                        🩺 {med.doctor_notes}
                      </div>
                    )}
                  </div>
                </div>

                {!status && (
                  <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    <button className="btn btn-teal" style={{ flex:1, fontSize:mode==='elder'?15:14 }}
                      disabled={logging[med.id]} onClick={() => logMedicine(med.id,'taken')}>
                      {mode==='child'?'⭐ I Took It!':mode==='elder'?'✅ I Have Taken It':'✅ Mark as Taken'}
                    </button>
                    <button className="btn btn-outline" style={{ padding:'12px 20px', fontSize:13 }}
                      disabled={logging[med.id]} onClick={() => logMedicine(med.id,'missed')}>
                      Missed
                    </button>
                  </div>
                )}
                {status==='taken' && (
                  <div style={{ marginTop:14, background:'#f0fdf4', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:22 }}>✅</span>
                    <span style={{ fontWeight:700, color:'#166534', fontSize:mode==='elder'?15:13 }}>
                      {mode==='child'?'Amazing! You took your medicine! 🌟':mode==='elder'?'Well done, dear. Medicine taken for today. 🌸':'Taken today — great job!'}
                    </span>
                  </div>
                )}
                {status==='missed' && (
                  <div style={{ marginTop:14, background:'#fef9c3', borderRadius:12, padding:'12px 16px' }}>
                    <span style={{ fontSize:13, color:'#92400e' }}>
                      {mode==='child'?"That's okay! Don't forget next time, little star! 💛":"Missed today — please let your caregiver know if you need help."}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {logs.length > 0 && (
        <div className="card mt-6">
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>📋 Recent Medicine Log</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Medicine</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {logs.slice(0,10).map(log => {
                  const med = medicines.find(m=>m.id===log.reminder_id);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight:600 }}>{med?.medicine_name||'Medicine'}</td>
                      <td style={{ fontSize:13, color:'#9ca3af' }}>{format(new Date(log.scheduled_time),'MMM d, h:mm a')}</td>
                      <td><span className={`badge ${log.status==='taken'?'badge-green':log.status==='missed'?'badge-rose':'badge-amber'}`}>{log.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
