import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import {
  Heart, Sun, Pill, Calendar, MessageCircle, Star,
  Smile, Meh, Frown, AlertCircle, Mic, Image, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

const MOOD_OPTIONS = [
  { score: 9, label: 'Great', emoji: '😊', color: '#22c55e' },
  { score: 7, label: 'Good', emoji: '🙂', color: '#84cc16' },
  { score: 5, label: 'Okay', emoji: '😐', color: '#f59e0b' },
  { score: 3, label: 'Low', emoji: '😔', color: '#f97316' },
  { score: 1, label: 'Sad', emoji: '😢', color: '#ef4444' },
];

const HOPE_MESSAGES = {
  child: [
    "Hey little star! 🌟 You are doing amazing today!",
    "Every medicine you take makes you stronger, little hero! 💪",
    "You are brave and wonderful. Keep shining! ✨",
  ],
  adult: [
    "Recovery is not a race. Today's small step still matters. 🌿",
    "Every breath is progress. You are stronger than you know. 💙",
    "Healing takes time, but you are moving forward.",
  ],
  elder: [
    "You are not alone today. Your family and caregiver are with you. 🌸",
    "Your life, memories, and presence matter deeply to us. 💛",
    "Rest, reflect, and know you are deeply loved and valued. 🌼",
  ],
};

function getThemeForMode(mode) {
  if (mode === 'child') return { primary: '#f97316', bg: '#fff9f0', emoji: '🌟', greeting: 'Hey little star' };
  if (mode === 'elder') return { primary: '#c2410c', bg: '#fffbeb', emoji: '🌸', greeting: 'Good day' };
  return { primary: '#0d9488', bg: '#f0fdfa', emoji: '💙', greeting: 'Hello' };
}

export default function PatientHome({ onNavigate }) {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [todayMood, setTodayMood] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [familyMessages, setFamilyMessages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [latestHealth, setLatestHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingMood, setSubmittingMood] = useState(false);

  const mode = patientRecord?.age_mode || 'adult';
  const theme = getThemeForMode(mode);
  const hopeMsg = HOPE_MESSAGES[mode][Math.floor(Date.now() / 86400000) % HOPE_MESSAGES[mode].length];

  useEffect(() => {
    if (patientRecord?.id) loadData();
  }, [patientRecord]);

  const loadData = async () => {
    setLoading(true);
    const pid = patientRecord.id;
    try {
      // Load medicines
      const { data: meds } = await supabase
        .from('medicine_reminders')
        .select('*')
        .eq('patient_id', pid)
        .eq('is_active', true)
        .limit(5);
      setMedicines(meds || []);

      // Load appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('*, doctor:doctor_id(full_name)')
        .eq('patient_id', pid)
        .in('status', ['accepted', 'pending'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .limit(3);
      setAppointments(appts || []);

      // Load family messages (unread)
      const { data: msgs } = await supabase
        .from('family_messages')
        .select('*, sender:sender_id(full_name)')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false })
        .limit(3);
      setFamilyMessages(msgs || []);

      // Load active alerts
      const { data: alts } = await supabase
        .from('alerts')
        .select('*')
        .eq('patient_id', pid)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(2);
      setAlerts(alts || []);

      // Load latest health record
      const { data: health } = await supabase
        .from('health_records')
        .select('*')
        .eq('patient_id', pid)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      setLatestHealth(health);

      // Check today's mood
      const today = new Date().toISOString().split('T')[0];
      const { data: moodData } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('patient_id', pid)
        .gte('logged_at', today)
        .single();
      if (moodData) setTodayMood(moodData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logMood = async (mood) => {
    if (!patientRecord?.id || submittingMood) return;
    setSubmittingMood(true);
    try {
      const { error } = await supabase.from('mood_logs').insert({
        patient_id: patientRecord.id,
        mood_score: mood.score,
        mood_label: mood.label,
      });
      if (error) throw error;
      setTodayMood({ mood_score: mood.score, mood_label: mood.label });
      toast.success(`Mood logged: ${mood.emoji} ${mood.label}`);
    } catch (err) {
      toast.error('Could not log mood');
    } finally {
      setSubmittingMood(false);
    }
  };

  const getAlertMessage = (alert) => {
    // Patient sees calm version
    if (alert.message_patient) return alert.message_patient;
    if (alert.alert_level === 3) return 'Your care team is looking after you right now. Please stay calm. 💙';
    if (alert.alert_level === 2) return 'Your health needs a little extra attention today. Your caregiver has been informed. 🌿';
    return 'A small reminder from your care team. Everything is being looked after. ✨';
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className={`theme-${mode}`} style={{ background: 'transparent' }}>
      {/* Hero Greeting */}
      <div style={{
        background: `linear-gradient(135deg, ${theme.primary}15, ${theme.primary}08)`,
        border: `2px solid ${theme.primary}30`,
        borderRadius: 24, padding: 28, marginBottom: 24,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: 24, top: 24, fontSize: 48, opacity: 0.2 }}>
          {theme.emoji}
        </div>
        <div style={{ fontSize: 13, color: theme.primary, fontWeight: 700, marginBottom: 4 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: mode === 'elder' ? 26 : 22, color: '#111827', marginBottom: 8 }}>
          {timeGreeting}, {profile?.full_name?.split(' ')[0] || 'Friend'}! {theme.emoji}
        </h2>
        <p style={{ color: '#6b7280', fontSize: mode === 'elder' ? 17 : 15 }}>
          {mode === 'child' && "You are doing so well today. We are all so proud of you! 🌈"}
          {mode === 'adult' && "Here's your health update for today. You are moving forward. 🌿"}
          {mode === 'elder' && "Your family and care team are thinking of you today. 🌸"}
        </p>
      </div>

      {/* Active Alerts (calm patient version) */}
      {alerts.length > 0 && alerts.map(alert => (
        <div key={alert.id} style={{
          background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
          border: '2px solid #fde047', borderRadius: 16, padding: 18,
          marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 24 }}>🌻</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#713f12', marginBottom: 4 }}>
              A gentle note from your care team
            </div>
            <p style={{ color: '#92400e', fontSize: 14 }}>{getAlertMessage(alert)}</p>
          </div>
        </div>
      ))}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Hope Card */}
        <div className="hope-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: 13, color: '#d97706', fontWeight: 700, marginBottom: 8 }}>
            ✨ Today's Hope Message
          </div>
          <p className="hope-text">"{hopeMsg}"</p>
        </div>

        {/* Mood Check-in */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💬 How are you feeling?</h3>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14 }}>
            {todayMood ? `Today: ${MOOD_OPTIONS.find(m => m.score === todayMood.mood_score)?.emoji || '😊'} ${todayMood.mood_label}` : "Let us know how you're doing today"}
          </p>
          {!todayMood ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => logMood(m)}
                  disabled={submittingMood}
                  style={{
                    padding: '10px 14px', borderRadius: 20, border: `2px solid ${m.color}30`,
                    background: m.color + '10', cursor: 'pointer', fontSize: mode === 'elder' ? 18 : 16,
                    transition: 'all 0.2s',
                  }}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#f0fdf4', padding: 12, borderRadius: 12
            }}>
              <span style={{ fontSize: 28 }}>
                {MOOD_OPTIONS.find(m => m.score === todayMood.mood_score)?.emoji || '😊'}
              </span>
              <div>
                <div style={{ fontWeight: 700, color: '#166534' }}>Mood logged!</div>
                <div style={{ fontSize: 12, color: '#4ade80' }}>Thank you for sharing 💙</div>
              </div>
            </div>
          )}
        </div>

        {/* Latest Health */}
        {latestHealth && (
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>💚 Your Wellness Update</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {latestHealth.bp_systolic && (
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>
                    {latestHealth.bp_systolic}/{latestHealth.bp_diastolic}
                  </div>
                  <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Blood Pressure</div>
                </div>
              )}
              {latestHealth.heart_rate && (
                <div style={{ background: '#fff9f0', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#c2410c' }}>
                    {latestHealth.heart_rate} bpm
                  </div>
                  <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>Heart Rate</div>
                </div>
              )}
              {latestHealth.oxygen_level && (
                <div style={{ background: '#eff6ff', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>
                    {latestHealth.oxygen_level}%
                  </div>
                  <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>Oxygen</div>
                </div>
              )}
              {latestHealth.temperature && (
                <div style={{ background: '#fdf4ff', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#7e22ce' }}>
                    {latestHealth.temperature}°
                  </div>
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600 }}>Temp</div>
                </div>
              )}
            </div>
            {latestHealth.notes && (
              <p style={{ marginTop: 10, fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                {mode === 'child' ? `💬 Your care friend says: ${latestHealth.notes}` :
                 mode === 'elder' ? `🌸 Care note: ${latestHealth.notes}` :
                 `📋 Note: ${latestHealth.notes}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Medicine Reminders */}
      {medicines.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>💊 Medicine Reminders</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('medicines')}>
              View All
            </button>
          </div>
          {medicines.map(med => (
            <div key={med.id} className="medicine-item">
              <div className="medicine-icon">💊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{med.medicine_name}</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>
                  {med.dosage} · {med.frequency}
                  {med.times && ` · ${med.times.join(', ')}`}
                </div>
                <div style={{ fontSize: 12, color: '#0d9488', marginTop: 2 }}>
                  {mode === 'child' ? "⭐ Time for your brave medicine!" :
                   mode === 'elder' ? "🌸 Your gentle reminder" :
                   "📋 " + (med.before_food ? 'Before food' : 'After food')}
                </div>
              </div>
              <span className="badge badge-teal">{med.frequency}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>📅 Appointments</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('appointments')}>
              View All
            </button>
          </div>
          {appointments.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div style={{ fontSize: 28 }}>📅</div>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No upcoming appointments</p>
            </div>
          ) : appointments.map(appt => (
            <div key={appt.id} style={{
              padding: 12, background: '#f9fafb', borderRadius: 12, marginBottom: 8
            }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Dr. {appt.doctor?.full_name || 'Your Doctor'}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {format(new Date(appt.appointment_date), 'MMM d')} at {appt.appointment_time?.slice(0, 5)}
              </div>
              <span className={`badge ${appt.status === 'accepted' ? 'badge-green' : 'badge-amber'}`}>
                {appt.status}
              </span>
            </div>
          ))}
        </div>

        {/* Family Messages */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>💌 From Your Family</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('chat')}>
              Open Chat
            </button>
          </div>
          {familyMessages.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div style={{ fontSize: 28 }}>💌</div>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No messages yet</p>
            </div>
          ) : familyMessages.map(msg => (
            <div key={msg.id} style={{
              padding: 12, background: '#fff9f0', borderRadius: 12, marginBottom: 8,
              border: '1px solid #fed7aa'
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#c2410c' }}>
                ❤️ {msg.sender?.full_name || 'Family'}
              </div>
              <p style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
                {msg.message_type === 'text' ? msg.message : `📎 ${msg.message_type} message`}
              </p>
              <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>
                {format(new Date(msg.created_at), 'MMM d, h:mm a')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✨ Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { icon: '🤖', label: 'Companion', key: 'companion' },
            { icon: '🎙️', label: 'Voice Notes', key: 'voicenotes' },
            { icon: '📸', label: 'Memories', key: 'memories' },
            { icon: '⭐', label: 'Hope & Joy', key: 'hope' },
          ].map(action => (
            <button
              key={action.key}
              onClick={() => onNavigate(action.key)}
              style={{
                padding: 16, borderRadius: 16, border: '2px solid #f3f4f6',
                background: 'white', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.background = theme.primary + '10'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#f3f4f6'; e.currentTarget.style.background = 'white'; }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{action.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{action.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
