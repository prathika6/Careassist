import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { RefreshCw } from 'lucide-react';

const MOOD_OPTIONS = [
  { score: 9, label: 'Great', emoji: '😊', color: '#22c55e' },
  { score: 7, label: 'Good', emoji: '🙂', color: '#84cc16' },
  { score: 5, label: 'Okay', emoji: '😐', color: '#f59e0b' },
  { score: 3, label: 'Low', emoji: '😔', color: '#f97316' },
  { score: 1, label: 'Sad', emoji: '😢', color: '#ef4444' },
];

export default function HopeWellness() {
  const { patientRecord } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [todayMood, setTodayMood] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const mode = patientRecord?.age_mode || 'adult';

  const modeConfig = {
    child: {
      emoji: '🌟', title: 'Your Daily Sunshine', subtitle: 'Magic just for you!',
      bg: 'linear-gradient(135deg, #fff9f0, #fef3c7)', border: '#fed7aa',
      quote: '"You are loved, brave, and wonderful. Keep shining, little star! ⭐"',
    },
    adult: {
      emoji: '🌿', title: 'Hope & Wellness', subtitle: 'Fuel for your healing journey',
      bg: 'linear-gradient(135deg, #f0fdfa, #dcfce7)', border: '#86efac',
      quote: '"Every step forward — no matter how small — is still progress. Keep going. 🌿"',
    },
    elder: {
      emoji: '🌸', title: 'Daily Blessings', subtitle: 'Warmth and love, every day',
      bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fde68a',
      quote: '"You are not alone today. Your family and care team hold you in their hearts. 🌸"',
    },
  }[mode];

  useEffect(() => {
    loadData();
  }, [mode, patientRecord]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: msgs } = await supabase.from('hope_messages')
        .select('*').eq('age_mode', mode).eq('is_active', true);
      setMessages(msgs || []);

      if (patientRecord?.id) {
        const today = new Date().toISOString().split('T')[0];
        const { data: mood } = await supabase.from('mood_logs')
          .select('*').eq('patient_id', patientRecord.id)
          .gte('logged_at', today).maybeSingle();
        setTodayMood(mood);

        const { data: history } = await supabase.from('mood_logs')
          .select('*').eq('patient_id', patientRecord.id)
          .order('logged_at', { ascending: false }).limit(14);
        setMoodHistory(history || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const logMood = async (mood) => {
    if (!patientRecord?.id || todayMood) return;
    try {
      await supabase.from('mood_logs').insert({
        patient_id: patientRecord.id, mood_score: mood.score, mood_label: mood.label,
      });
      setTodayMood({ mood_score: mood.score, mood_label: mood.label });
      toast.success(`${mood.emoji} Mood logged — ${mood.label}!`);
      loadData();
    } catch { toast.error('Could not log mood'); }
  };

  const getWeekEmojis = () => {
    const EMOJI_MAP = { 9:'😊',7:'🙂',5:'😐',3:'😔',1:'😢' };
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const entry = moodHistory.find(m => m.logged_at?.startsWith(ds));
      const k = entry ? [9,7,5,3,1].reduce((a,b)=>Math.abs(b-entry.mood_score)<Math.abs(a-entry.mood_score)?b:a) : null;
      days.push({ date: d, emoji: k ? EMOJI_MAP[k] : null, label: d.toLocaleDateString('en',{weekday:'short'}) });
    }
    return days;
  };

  if (loading) return <div className="loading-spinner" />;

  const displayMessage = messages[currentIdx % Math.max(messages.length, 1)];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{modeConfig.emoji} {modeConfig.title}</h2>
        <p className="page-subtitle">{modeConfig.subtitle}</p>
      </div>

      {/* Featured hope message */}
      <div style={{ background: modeConfig.bg, border: `2px solid ${modeConfig.border}`, borderRadius: 28, padding: 36, marginBottom: 24, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position:'absolute', top:16, right:20, fontSize:40, opacity:0.12 }}>✨</div>
        <div style={{ position:'absolute', bottom:16, left:20, fontSize:36, opacity:0.10 }}>🌟</div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{modeConfig.emoji}</div>
        {displayMessage ? (
          <>
            <p style={{ fontFamily:'Lora,serif', fontSize: mode==='elder'?22:18, color:'#374151', lineHeight:1.8, fontStyle:'italic', marginBottom:16, maxWidth:560, margin:'0 auto 16px' }}>
              "{displayMessage.message}"
            </p>
            {displayMessage.author && <div style={{ fontSize:13, color:'#9ca3af', fontWeight:600 }}>— {displayMessage.author}</div>}
          </>
        ) : (
          <p style={{ fontFamily:'Lora,serif', fontSize:18, color:'#374151', fontStyle:'italic' }}>{modeConfig.quote}</p>
        )}
        {messages.length > 1 && (
          <button onClick={() => setCurrentIdx(i => (i+1) % messages.length)}
            className="btn btn-ghost btn-sm" style={{ marginTop:16, gap:6 }}>
            <RefreshCw size={14} /> Next message
          </button>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom:24 }}>
        {/* Mood check-in */}
        <div className="card">
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>
            {mode==='child'?'🌈 How do you feel today?':'💬 Today\'s Mood'}
          </h3>
          <p style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>
            {todayMood
              ? `Today: ${MOOD_OPTIONS.find(m=>m.score===todayMood.mood_score)?.emoji||'😊'} ${todayMood.mood_label}`
              : mode==='elder'?'How are you feeling today, dear?':'Let us know how you\'re doing'}
          </p>
          {!todayMood ? (
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {MOOD_OPTIONS.map(m => (
                <button key={m.score} onClick={() => logMood(m)} title={m.label}
                  style={{ width:52, height:52, borderRadius:'50%', border:`2px solid ${m.color}40`,
                    background:m.color+'12', cursor:'pointer', fontSize: mode==='elder'?26:22,
                    transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {m.emoji}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ background:'#f0fdf4', borderRadius:14, padding:16, display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:36 }}>{MOOD_OPTIONS.find(m=>m.score===todayMood.mood_score)?.emoji||'😊'}</span>
              <div>
                <div style={{ fontWeight:700, color:'#166534', fontSize:15 }}>Mood logged!</div>
                <div style={{ fontSize:12, color:'#4ade80' }}>
                  {mode==='child'?'Great job telling us how you feel! 💛':'Thank you for sharing how you feel 💙'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7-day mood tracker */}
        <div className="card">
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📅 This Week's Journey</h3>
          <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
            {getWeekEmojis().map((d,i) => (
              <div key={i} style={{ textAlign:'center', flex:1 }}>
                <div style={{ fontSize: mode==='elder'?22:18, marginBottom:4, minHeight:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {d.emoji || <div style={{ width:20, height:20, borderRadius:'50%', background:'#f3f4f6', margin:'0 auto' }}/>}
                </div>
                <div style={{ fontSize:10, color:'#9ca3af', fontWeight:600 }}>{d.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:12, color:'#d1d5db', textAlign:'center', marginTop:12 }}>
            {moodHistory.length===0 ? 'Start logging your mood daily!' : `${moodHistory.length} mood entries logged`}
          </p>
        </div>
      </div>

      {/* All hope messages */}
      {messages.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>
            {mode==='child'?'⭐ More Happy Messages!':'✨ More Hope Messages'}
          </h3>
          <div style={{ display:'grid', gap:14 }}>
            {messages.map((msg,i) => (
              <div key={msg.id} style={{
                background: ['#fff9f0','#f0fdfa','#fdf4ff','#fffbeb','#eff6ff'][i%5],
                borderRadius:16, padding:20, borderLeft:`4px solid ${['#f97316','#0d9488','#8b5cf6','#f59e0b','#0ea5e9'][i%5]}`
              }}>
                <p style={{ fontFamily:'Lora,serif', fontSize:mode==='elder'?17:15, color:'#374151', lineHeight:1.7, fontStyle:'italic', margin:0 }}>
                  "{msg.message}"
                </p>
                {msg.mood_category && (
                  <span style={{ display:'inline-block', marginTop:8, fontSize:11, background:'white', padding:'3px 10px', borderRadius:20, color:'#6b7280', fontWeight:700 }}>
                    {msg.mood_category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Affirmation footer */}
      <div style={{ background:'linear-gradient(135deg,#fdf4ff,#ede9fe)', border:'2px solid #ddd6fe', borderRadius:24, padding:28, marginTop:24, textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>💙</div>
        <p style={{ fontFamily:'Lora,serif', fontSize:mode==='elder'?19:16, color:'#374151', lineHeight:1.8, fontStyle:'italic', maxWidth:500, margin:'0 auto' }}>
          {mode==='child'&&'"Every day you are here is a gift. You are loved more than you know."'}
          {mode==='adult'&&'"Healing is not linear. Rest when you need to. Rise when you\'re ready. We believe in you."'}
          {mode==='elder'&&'"You have given so much love to the world. Today, let the world love you back."'}
        </p>
        <div style={{ fontSize:12, color:'#9ca3af', marginTop:12, fontWeight:600 }}>— The CareAssist Team 💙</div>
      </div>
    </div>
  );
}
