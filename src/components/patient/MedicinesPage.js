import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';

export default function MedicinesPage() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [medicines, setMedicines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState({});
  const mode = patientRecord?.age_mode || 'adult';

  useEffect(() => { if (patientRecord?.id) loadData(); }, [patientRecord]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: meds } = await supabase.from('medicine_reminders')
        .select('*, prescription:prescription_id(diagnosis, doctor:doctor_id(full_name))')
        .eq('patient_id', patientRecord.id).eq('is_active', true);
      setMedicines(meds || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: logsData } = await supabase.from('medicine_logs')
        .select('*').eq('patient_id', patientRecord.id)
        .gte('scheduled_time', today).order('scheduled_time', { ascending: false });
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
      toast.success(status === 'taken' ? (mode === 'child' ? '⭐ Amazing! You took your medicine!' : '✅ Medicine marked as taken!') : 'Medicine marked as missed');
      loadData();
    } catch { toast.error('Could not log medicine'); }
    finally { setLogging(p => ({ ...p, [medId]: false })); }
  };

  const getLogStatus = (medId) => logs.find(l => l.reminder_id === medId)?.status;

  const getMedicineMessage = (med) => {
    if (mode === 'child') return `Hey little hero! Time for ${med.medicine_name}. You are so brave! ⭐`;
    if (mode === 'elder') return `Dear friend, a gentle reminder to take your ${med.medicine_name}. 🌸`;
    return `Time for ${med.medicine_name} — ${med.before_food ? 'take before food' : 'take after food'}.`;
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          {mode === 'child' ? '⭐ My Medicine Heroes' : mode === 'elder' ? '🌸 Medicines & Reminders' : '💊 My Medicines'}
        </h2>
        <p className="page-subtitle">
          {mode === 'child' ? 'Each medicine makes you stronger!' : mode === 'elder' ? 'Your gentle daily reminders' : 'Track your prescriptions and daily doses'}
        </p>
      </div>

      {medicines.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 48 }}>💊</div>
          <p className="empty-state-text">No active medicines. Your doctor will add prescriptions here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {medicines.map(med => {
            const todayStatus = getLogStatus(med.id);
            return (
              <div key={med.id} className="card" style={{
                border: todayStatus === 'taken' ? '2px solid #86efac' : todayStatus === 'missed' ? '2px solid #fca5a5' : '2px solid #f3f4f6',
                background: todayStatus === 'taken' ? '#f0fdf4' : 'white',
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                    background: todayStatus === 'taken' ? '#bbf7d0' : '#fff9f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                  }}>
                    {todayStatus === 'taken' ? '✅' : '💊'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: mode === 'elder' ? 18 : 16, color: '#111827', marginBottom: 4 }}>
                      {med.medicine_name}
                    </div>
                    <p style={{ fontSize: mode === 'elder' ? 15 : 13, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>
                      {getMedicineMessage(med)}
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span className="badge badge-coral">💊 {med.dosage}</span>
                      <span className="badge badge-teal">🔄 {med.frequency}</span>
                      {med.before_food !== null && <span className="badge badge-amber">{med.before_food ? '🍽️ Before food' : '🍽️ After food'}</span>}
                      {med.times?.length > 0 && <span className="badge badge-sky">⏰ {med.times.join(', ')}</span>}
                    </div>
                    {med.prescription?.diagnosis && (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        📋 For: {med.prescription.diagnosis}
                        {med.prescription.doctor && ` · Dr. ${med.prescription.doctor.full_name}`}
                      </div>
                    )}
                    {med.doctor_notes && (
                      <div style={{ fontSize: 12, color: '#0d9488', marginTop: 4, fontWeight: 600 }}>
                        🩺 {med.doctor_notes}
                      </div>
                    )}
                  </div>
                </div>

                {!todayStatus && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                      className="btn btn-teal"
                      style={{ flex: 1, fontSize: mode === 'elder' ? 15 : 14 }}
                      disabled={logging[med.id]}
                      onClick={() => logMedicine(med.id, 'taken')}
                    >
                      {mode === 'child' ? '⭐ I Took It!' : mode === 'elder' ? '✅ I Have Taken It' : '✅ Mark as Taken'}
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '12px 20px', fontSize: 13 }}
                      disabled={logging[med.id]}
                      onClick={() => logMedicine(med.id, 'missed')}
                    >
                      Missed
                    </button>
                  </div>
                )}

                {todayStatus === 'taken' && (
                  <div style={{ marginTop: 12, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ fontWeight: 700, color: '#166534', fontSize: mode === 'elder' ? 15 : 13 }}>
                      {mode === 'child' ? "Amazing! You took your medicine today! You're a hero! 🌟" :
                       mode === 'elder' ? "Well done, dear. Medicine taken for today. 🌸" :
                       "Taken today — great job staying on track!"}
                    </span>
                  </div>
                )}

                {todayStatus === 'missed' && (
                  <div style={{ marginTop: 12, background: '#fef9c3', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, color: '#92400e' }}>
                      {mode === 'child' ? "That's okay! Don't forget next time, little star! 💛" :
                       "Missed today — please let your caregiver know if you need help remembering."}
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
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📋 Recent Medicine Log</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Medicine</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {logs.slice(0, 20).map(log => {
                  const med = medicines.find(m => m.id === log.reminder_id);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{med?.medicine_name || 'Medicine'}</td>
                      <td style={{ fontSize: 13, color: '#9ca3af' }}>{format(new Date(log.scheduled_time), 'MMM d, h:mm a')}</td>
                      <td>
                        <span className={`badge ${log.status === 'taken' ? 'badge-green' : log.status === 'missed' ? 'badge-rose' : 'badge-amber'}`}>
                          {log.status}
                        </span>
                      </td>
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
