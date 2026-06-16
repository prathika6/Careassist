import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X, AlertTriangle, Activity, Pill, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const ALERT_THRESHOLDS = {
  bp_systolic: { warn: 140, danger: 160 },
  bp_diastolic: { warn: 90, danger: 100 },
  blood_sugar: { warn: 140, danger: 200 },
  oxygen_level: { warn: 94, danger: 90, reverse: true },
  heart_rate: { warn: 100, danger: 120 },
  temperature: { warn: 38.0, danger: 39.0 },
};

function getAlertLevel(records) {
  let maxLevel = 0;
  if (records.oxygen_level && records.oxygen_level < ALERT_THRESHOLDS.oxygen_level.danger) maxLevel = Math.max(maxLevel, 3);
  else if (records.oxygen_level && records.oxygen_level < ALERT_THRESHOLDS.oxygen_level.warn) maxLevel = Math.max(maxLevel, 2);
  if (records.bp_systolic) {
    if (records.bp_systolic >= ALERT_THRESHOLDS.bp_systolic.danger) maxLevel = Math.max(maxLevel, 3);
    else if (records.bp_systolic >= ALERT_THRESHOLDS.bp_systolic.warn) maxLevel = Math.max(maxLevel, 2);
  }
  if (records.temperature) {
    if (records.temperature >= ALERT_THRESHOLDS.temperature.danger) maxLevel = Math.max(maxLevel, 2);
    else if (records.temperature >= ALERT_THRESHOLDS.temperature.warn) maxLevel = Math.max(maxLevel, 1);
  }
  return maxLevel;
}

export default function CaregiverDashboard({ section = 'home' }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [healthForm, setHealthForm] = useState({
    bp_systolic: '', bp_diastolic: '', blood_sugar: '',
    oxygen_level: '', heart_rate: '', temperature: '',
    symptoms: '', food_intake: '', notes: '',
  });

  const [medicineStatuses, setMedicineStatuses] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get assigned patients
      const { data: assignments } = await supabase
        .from('patient_caregivers')
        .select('*, patient:patient_id(*, user:user_id(full_name, email))')
        .eq('caregiver_id', profile.id);

      const assignedPatients = assignments?.map(a => a.patient).filter(Boolean) || [];

      // Load latest health for each patient
      const patientsWithHealth = await Promise.all(assignedPatients.map(async (p) => {
        const { data: health } = await supabase
          .from('health_records')
          .select('*')
          .eq('patient_id', p.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        const { data: meds } = await supabase
          .from('medicine_reminders')
          .select('*')
          .eq('patient_id', p.id)
          .eq('is_active', true);

        return { ...p, latestHealth: health, medicines: meds || [] };
      }));

      setPatients(patientsWithHealth);

      // Load active alerts for all patients
      const patientIds = patientsWithHealth.map(p => p.id);
      if (patientIds.length > 0) {
        const { data: alts } = await supabase
          .from('alerts')
          .select('*, patient:patient_id(user:user_id(full_name))')
          .in('patient_id', patientIds)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false });
        setAlerts(alts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitHealthRecord = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const record = {
        patient_id: selectedPatient.id,
        recorded_by: profile.id,
        bp_systolic: healthForm.bp_systolic ? parseInt(healthForm.bp_systolic) : null,
        bp_diastolic: healthForm.bp_diastolic ? parseInt(healthForm.bp_diastolic) : null,
        blood_sugar: healthForm.blood_sugar ? parseFloat(healthForm.blood_sugar) : null,
        oxygen_level: healthForm.oxygen_level ? parseFloat(healthForm.oxygen_level) : null,
        heart_rate: healthForm.heart_rate ? parseInt(healthForm.heart_rate) : null,
        temperature: healthForm.temperature ? parseFloat(healthForm.temperature) : null,
        symptoms: healthForm.symptoms ? healthForm.symptoms.split(',').map(s => s.trim()).filter(Boolean) : [],
        food_intake: healthForm.food_intake || null,
        notes: healthForm.notes || null,
      };

      const alertLevel = getAlertLevel(record);
      record.alert_level = alertLevel;

      const { data: savedRecord, error } = await supabase
        .from('health_records')
        .insert(record)
        .select()
        .single();

      if (error) throw error;

      // Create alert if needed
      if (alertLevel > 0) {
        const alertMessages = {
          1: { caregiver: `Mild abnormality detected for ${selectedPatient.user?.full_name}. Monitor closely.`, patient: `Your care team has noted a small health update. Everything is being looked after. 🌿` },
          2: { caregiver: `Attention needed: Moderate abnormality for ${selectedPatient.user?.full_name}. Doctor notification recommended.`, patient: `Your breathing/health needs a little extra care today. Your caregiver has already been informed. Please stay calm. 💙` },
          3: { caregiver: `⚠️ EMERGENCY: Critical health reading for ${selectedPatient.user?.full_name}. Immediate action required!`, patient: `Your care team is looking after you right now. Please stay calm. You are not alone. 💙` },
        };

        await supabase.from('alerts').insert({
          patient_id: selectedPatient.id,
          health_record_id: savedRecord.id,
          alert_level: alertLevel,
          alert_type: 'health_reading',
          message_caregiver: alertMessages[alertLevel].caregiver,
          message_patient: alertMessages[alertLevel].patient,
        });
      }

      toast.success('Health record saved successfully');
      setShowHealthForm(false);
      setHealthForm({ bp_systolic: '', bp_diastolic: '', blood_sugar: '', oxygen_level: '', heart_rate: '', temperature: '', symptoms: '', food_intake: '', notes: '' });
      loadData();
    } catch (err) {
      toast.error('Could not save health record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const logMedicine = async (medId, status, patientId) => {
    try {
      await supabase.from('medicine_logs').insert({
        reminder_id: medId,
        patient_id: patientId,
        scheduled_time: new Date().toISOString(),
        taken_at: status === 'taken' ? new Date().toISOString() : null,
        status,
        logged_by: profile.id,
      });
      setMedicineStatuses(prev => ({ ...prev, [medId]: status }));
      toast.success(`Medicine marked as ${status}`);
    } catch {
      toast.error('Could not log medicine status');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await supabase.from('alerts')
        .update({ is_resolved: true, resolved_by: profile.id, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      toast.success('Alert resolved');
      loadData();
    } catch {
      toast.error('Could not resolve alert');
    }
  };

  const getAlertBadge = (level) => {
    if (level === 3) return { label: '🚨 Emergency', color: '#9f1239', bg: '#fecdd3' };
    if (level === 2) return { label: '⚠️ Attention Needed', color: '#92400e', bg: '#fed7aa' };
    return { label: '💛 Care Reminder', color: '#713f12', bg: '#fef9c3' };
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🤝 Caregiver Dashboard</h2>
        <p className="page-subtitle">Manage care for your patients with compassion and precision</p>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="card mb-6" style={{ border: '2px solid #fde68a' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#92400e' }}>
            🔔 Active Alerts ({alerts.length})
          </h3>
          {alerts.map(alert => {
            const badge = getAlertBadge(alert.alert_level);
            return (
              <div key={alert.id} style={{
                padding: 14, borderRadius: 12, background: badge.bg,
                border: `2px solid ${badge.color}30`, marginBottom: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      background: badge.bg, color: badge.color, padding: '3px 10px',
                      borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${badge.color}50`
                    }}>
                      {badge.label}
                    </span>
                    <span style={{ fontSize: 12, color: badge.color, fontWeight: 600 }}>
                      {alert.patient?.user?.full_name}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#374151' }}>{alert.message_caregiver}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <button className="btn btn-sm" style={{ background: '#166534', color: 'white', flexShrink: 0 }}
                  onClick={() => resolveAlert(alert.id)}>
                  <CheckCircle size={14} /> Resolve
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Patients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {patients.length === 0 ? (
          <div className="card empty-state" style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 48 }}>👥</div>
            <p className="empty-state-text">No patients assigned yet.</p>
            <p style={{ fontSize: 13, color: '#d1d5db' }}>
              Ask an admin to assign patients to your account.
            </p>
          </div>
        ) : patients.map(patient => {
          const alertLevel = patient.latestHealth ? getAlertLevel(patient.latestHealth) : 0;
          const badge = alertLevel > 0 ? getAlertBadge(alertLevel) : null;

          return (
            <div key={patient.id} className="card" style={{
              border: badge ? `2px solid ${badge.color}40` : '2px solid #f3f4f6'
            }}>
              {/* Patient Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#f0fdfa', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#0d9488'
                  }}>
                    {patient.user?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {patient.user?.full_name || 'Unknown Patient'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {patient.age_mode} mode · {patient.blood_group || 'Blood group not set'}
                    </div>
                  </div>
                </div>
                {badge && (
                  <span style={{
                    background: badge.bg, color: badge.color,
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
                  }}>
                    {badge.label}
                  </span>
                )}
              </div>

              {/* Latest Health */}
              {patient.latestHealth && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700, marginBottom: 8 }}>
                    Latest Vitals
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {patient.latestHealth.bp_systolic && (
                      <div style={{ background: '#f9fafb', borderRadius: 10, padding: 8, textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>
                          {patient.latestHealth.bp_systolic}/{patient.latestHealth.bp_diastolic}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>BP</div>
                      </div>
                    )}
                    {patient.latestHealth.oxygen_level && (
                      <div style={{
                        background: patient.latestHealth.oxygen_level < 90 ? '#fecdd3' : '#f0fdf4',
                        borderRadius: 10, padding: 8, textAlign: 'center'
                      }}>
                        <div style={{
                          fontWeight: 800, fontSize: 14,
                          color: patient.latestHealth.oxygen_level < 90 ? '#9f1239' : '#166534'
                        }}>
                          {patient.latestHealth.oxygen_level}%
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>O₂</div>
                        {patient.latestHealth.oxygen_level < 90 && (
                          <div style={{ fontSize: 9, color: '#9f1239', fontWeight: 700 }}>LOW ⚠️</div>
                        )}
                      </div>
                    )}
                    {patient.latestHealth.heart_rate && (
                      <div style={{ background: '#f9fafb', borderRadius: 10, padding: 8, textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>
                          {patient.latestHealth.heart_rate}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>BPM</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medicine Status */}
              {patient.medicines.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700, marginBottom: 8 }}>
                    Medicines Today
                  </div>
                  {patient.medicines.slice(0, 3).map(med => (
                    <div key={med.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0', borderBottom: '1px solid #f3f4f6'
                    }}>
                      <span style={{ fontSize: 16 }}>💊</span>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{med.medicine_name}</span>
                        <span style={{ color: '#9ca3af' }}> · {med.dosage}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => logMedicine(med.id, 'taken', patient.id)}
                          disabled={!!medicineStatuses[med.id]}
                          style={{
                            padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                            background: medicineStatuses[med.id] === 'taken' ? '#166534' : '#f0fdf4',
                            color: medicineStatuses[med.id] === 'taken' ? 'white' : '#166534',
                            fontSize: 11, fontWeight: 700
                          }}
                        >✓ Taken</button>
                        <button
                          onClick={() => logMedicine(med.id, 'missed', patient.id)}
                          disabled={!!medicineStatuses[med.id]}
                          style={{
                            padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                            background: medicineStatuses[med.id] === 'missed' ? '#9f1239' : '#fff1f2',
                            color: medicineStatuses[med.id] === 'missed' ? 'white' : '#9f1239',
                            fontSize: 11, fontWeight: 700
                          }}
                        >✗ Missed</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-teal btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => { setSelectedPatient(patient); setShowHealthForm(true); }}
                >
                  <Activity size={14} /> Log Vitals
                </button>
                {alertLevel >= 2 && (
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }}>
                    🆘 Alert Doctor
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Health Record Form Modal */}
      {showHealthForm && selectedPatient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHealthForm(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>
                📊 Log Health Data — {selectedPatient.user?.full_name}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowHealthForm(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">BP Systolic (mmHg)</label>
                <input type="number" className="form-input" placeholder="e.g. 120"
                  value={healthForm.bp_systolic}
                  onChange={e => setHealthForm(p => ({ ...p, bp_systolic: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">BP Diastolic (mmHg)</label>
                <input type="number" className="form-input" placeholder="e.g. 80"
                  value={healthForm.bp_diastolic}
                  onChange={e => setHealthForm(p => ({ ...p, bp_diastolic: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Sugar (mg/dL)</label>
                <input type="number" className="form-input" placeholder="e.g. 110"
                  value={healthForm.blood_sugar}
                  onChange={e => setHealthForm(p => ({ ...p, blood_sugar: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Oxygen Level (%)
                  {healthForm.oxygen_level && parseFloat(healthForm.oxygen_level) < 90 && (
                    <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 8 }}>⚠️ Low!</span>
                  )}
                </label>
                <input type="number" className="form-input" placeholder="e.g. 98"
                  value={healthForm.oxygen_level}
                  onChange={e => setHealthForm(p => ({ ...p, oxygen_level: e.target.value }))}
                  style={{ borderColor: healthForm.oxygen_level && parseFloat(healthForm.oxygen_level) < 90 ? '#ef4444' : '' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Heart Rate (bpm)</label>
                <input type="number" className="form-input" placeholder="e.g. 72"
                  value={healthForm.heart_rate}
                  onChange={e => setHealthForm(p => ({ ...p, heart_rate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Temperature (°C)</label>
                <input type="number" step="0.1" className="form-input" placeholder="e.g. 37.0"
                  value={healthForm.temperature}
                  onChange={e => setHealthForm(p => ({ ...p, temperature: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Symptoms (comma separated)</label>
              <input type="text" className="form-input"
                placeholder="e.g. headache, nausea, fatigue"
                value={healthForm.symptoms}
                onChange={e => setHealthForm(p => ({ ...p, symptoms: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Food Intake</label>
              <input type="text" className="form-input"
                placeholder="e.g. Breakfast eaten well, lunch half"
                value={healthForm.food_intake}
                onChange={e => setHealthForm(p => ({ ...p, food_intake: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Care Notes</label>
              <textarea className="form-input form-textarea"
                placeholder="Any observations, patient mood, additional notes..."
                value={healthForm.notes}
                onChange={e => setHealthForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Alert Preview */}
            {getAlertLevel(healthForm) > 0 && (
              <div style={{
                background: '#fef9c3', border: '2px solid #fde047',
                borderRadius: 12, padding: 14, marginBottom: 16
              }}>
                <div style={{ fontWeight: 700, color: '#713f12', fontSize: 14 }}>
                  ⚠️ Alert Level {getAlertLevel(healthForm)} will be triggered
                </div>
                <p style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
                  {getAlertLevel(healthForm) === 3 ? 'Emergency alert — caregiver, doctor, and emergency contact will be notified' :
                   getAlertLevel(healthForm) === 2 ? 'Caregiver and doctor will be notified' :
                   'Caregiver will receive a care reminder'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline flex-1" onClick={() => setShowHealthForm(false)}>
                Cancel
              </button>
              <button className="btn btn-teal flex-1" onClick={submitHealthRecord} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Health Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
