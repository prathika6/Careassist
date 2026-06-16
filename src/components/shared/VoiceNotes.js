import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X, Play, Pause, Mic, MicOff, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function VoiceNotes() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRefs = useRef({});
  const [form, setForm] = useState({ title: '', audio_url: '' });

  const isPatient = profile?.role === 'patient';
  const mode = patientRecord?.age_mode || 'adult';

  // determine patient ID
  const [targetPatientId, setTargetPatientId] = useState(null);

  useEffect(() => {
    if (patientRecord?.id) {
      setTargetPatientId(patientRecord.id);
    } else {
      // family/caregiver: find linked patient
      const findPatient = async () => {
        if (profile?.role === 'family') {
          const { data } = await supabase.from('family_members').select('patient_id').eq('family_user_id', profile.id).limit(1).maybeSingle();
          if (data) setTargetPatientId(data.patient_id);
        } else if (profile?.role === 'caregiver') {
          const { data } = await supabase.from('patient_caregivers').select('patient_id').eq('caregiver_id', profile.id).limit(1).maybeSingle();
          if (data) setTargetPatientId(data.patient_id);
        }
      };
      findPatient();
    }
  }, [profile, patientRecord]);

  useEffect(() => {
    if (targetPatientId) loadNotes();
  }, [targetPatientId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('voice_notes')
        .select('*, sender:sender_id(full_name, role)')
        .eq('patient_id', targetPatientId)
        .order('created_at', { ascending: false });
      setNotes(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const saveVoiceNote = async () => {
    if (!form.title.trim()) { toast.error('Please add a title'); return; }
    if (!recordedBlob && !form.audio_url.trim()) { toast.error('Please record audio or provide a URL'); return; }
    setSaving(true);
    try {
      let audioUrl = form.audio_url.trim();

      // If we have a recorded blob, create an object URL (in production upload to Supabase Storage)
      if (recordedBlob && !audioUrl) {
        // For demo: create a local blob URL. In production: upload to supabase.storage.from('voice-notes').upload(...)
        audioUrl = URL.createObjectURL(recordedBlob);
        toast.info('Note: In production, configure Supabase Storage for persistent audio. Using local blob for demo.');
      }

      const { error } = await supabase.from('voice_notes').insert({
        patient_id: targetPatientId,
        sender_id: profile.id,
        title: form.title.trim(),
        audio_url: audioUrl,
        duration_seconds: recordingSeconds || null,
        is_played: false,
      });
      if (error) throw error;
      toast.success(mode === 'child' ? '🎙️ Voice note sent with love!' : '🎙️ Voice note saved!');
      setShowAdd(false);
      setForm({ title: '', audio_url: '' });
      setRecordedBlob(null);
      setRecordingSeconds(0);
      loadNotes();
    } catch (err) { toast.error('Could not save: ' + err.message); }
    finally { setSaving(false); }
  };

  const togglePlay = (note) => {
    const audio = audioRefs.current[note.id];
    if (!audio) return;
    if (playingId === note.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) audioRefs.current[playingId].pause();
      audio.play();
      setPlayingId(note.id);
      audio.onended = () => setPlayingId(null);
      // mark as played
      supabase.from('voice_notes').update({ is_played: true }).eq('id', note.id);
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this voice note?')) return;
    await supabase.from('voice_notes').delete().eq('id', id);
    toast.success('Deleted');
    loadNotes();
  };

  const formatSecs = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const getRoleColor = (role) => ({ patient:'#f97316', caregiver:'#0d9488', doctor:'#0ea5e9', family:'#8b5cf6' }[role] || '#6b7280');

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 className="page-title">
              {mode === 'child' ? '🎙️ Love Messages' : mode === 'elder' ? '🎙️ Voice Messages' : '🎙️ Voice Notes'}
            </h2>
            <p className="page-subtitle">
              {mode === 'child' ? 'Hear the voices of people who love you!' : mode === 'elder' ? 'Listen to messages from your family' : 'Audio messages from your care circle'}
            </p>
          </div>
          {!isPatient && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Mic size={16} /> Record Note
            </button>
          )}
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 52 }}>🎙️</div>
          <p className="empty-state-text">
            {isPatient
              ? (mode === 'child' ? 'No voice messages yet! Your family will send you some soon 💖' : 'No voice notes yet. Your family and caregivers will record messages here.')
              : 'No voice notes yet. Record one for your patient!'}
          </p>
          {!isPatient && (
            <button className="btn btn-primary mt-4" onClick={() => setShowAdd(true)}>
              <Mic size={16} /> Record First Note
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notes.map(note => (
            <div key={note.id} className="card" style={{
              padding: 20,
              border: !note.is_played && isPatient ? '2px solid #fed7aa' : '2px solid #f3f4f6',
              background: !note.is_played && isPatient ? '#fff9f0' : 'white',
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {/* Play button */}
                <button
                  onClick={() => togglePlay(note)}
                  style={{
                    width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: playingId === note.id ? '#0d9488' : getRoleColor(note.sender?.role) + '20',
                    color: playingId === note.id ? 'white' : getRoleColor(note.sender?.role),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s',
                    fontSize: 22,
                  }}
                >
                  {playingId === note.id ? <Pause size={22} /> : <Play size={22} />}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: mode === 'elder' ? 17 : 15, color: '#111827' }}>
                      {note.title}
                    </span>
                    {!note.is_played && isPatient && (
                      <span style={{ background: '#fed7aa', color: '#c2410c', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>NEW</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: getRoleColor(note.sender?.role), fontWeight: 600, marginBottom: 4 }}>
                    {mode === 'child' ? '💖 ' : ''}From {note.sender?.full_name || 'Someone'} ({note.sender?.role})
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      {format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
                    </span>
                    {note.duration_seconds && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>⏱ {formatSecs(note.duration_seconds)}</span>
                    )}
                  </div>
                </div>

                {note.sender_id === profile.id && (
                  <button onClick={() => deleteNote(note.id)} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Hidden audio element */}
              {note.audio_url && (
                <audio
                  ref={el => { if (el) audioRefs.current[note.id] = el; }}
                  src={note.audio_url}
                  style={{ display: 'none' }}
                />
              )}

              {/* Waveform bar (decorative) */}
              <div style={{ marginTop: 12, display: 'flex', gap: 3, alignItems: 'center', paddingLeft: 66 }}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 4,
                    height: `${8 + Math.abs(Math.sin(i * 0.8 + (note.id?.charCodeAt(0) || 0))) * 20}px`,
                    background: playingId === note.id ? '#0d9488' : '#e5e7eb',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>🎙️ Record Voice Note</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input type="text" className="form-input" placeholder="e.g. Good morning message, Thinking of you..."
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            {/* Recorder */}
            <div style={{ background: recording ? '#fef9c3' : '#f9fafb', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 16, border: `2px solid ${recording ? '#fde047' : '#e5e7eb'}` }}>
              {recordedBlob ? (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>Recording captured!</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Duration: {formatSecs(recordingSeconds)}</div>
                  <audio controls src={URL.createObjectURL(recordedBlob)} style={{ width: '100%', marginBottom: 12 }} />
                  <button className="btn btn-outline btn-sm" onClick={() => { setRecordedBlob(null); setRecordingSeconds(0); }}>
                    Re-record
                  </button>
                </div>
              ) : recording ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 8, animation: 'pulse 1s infinite' }}>🔴</div>
                  <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 18, marginBottom: 4 }}>Recording...</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#374151', marginBottom: 16 }}>{formatSecs(recordingSeconds)}</div>
                  <button className="btn btn-danger" onClick={stopRecording}><MicOff size={16} /> Stop Recording</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎙️</div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Click to start recording your voice message</div>
                  <button className="btn btn-primary" onClick={startRecording}><Mic size={16} /> Start Recording</button>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginBottom: 12 }}>— or paste an audio URL —</div>

            <div className="form-group">
              <label className="form-label">Audio URL (optional)</label>
              <input type="url" className="form-input" placeholder="https://... (mp3, wav, ogg)"
                value={form.audio_url} onChange={e => setForm(p => ({ ...p, audio_url: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={saveVoiceNote} disabled={saving || recording}>
                {saving ? 'Saving...' : '💾 Save Voice Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
