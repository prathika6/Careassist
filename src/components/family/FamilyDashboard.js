import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { X } from 'lucide-react';
import { format } from 'date-fns';

export function FamilyDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMsgForm, setShowMsgForm] = useState(false);
  const [selPatient, setSelPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msgForm, setMsgForm] = useState({ message:'', occasion:'' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: fm } = await supabase.from('family_members')
        .select('*, patient:patient_id(*, user:user_id(full_name))')
        .eq('family_user_id', profile.id);
      const pts = fm?.map(f => ({ ...f.patient, relationship: f.relationship })).filter(Boolean) || [];
      const withData = await Promise.all(pts.map(async p => {
        const { data: appts } = await supabase.from('appointments')
          .select('*, doctor:doctor_id(full_name)').eq('patient_id', p.id)
          .in('status',['accepted','pending']).gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date',{ascending:true}).limit(2);
        const { data: mood } = await supabase.from('mood_logs').select('*').eq('patient_id',p.id)
          .order('logged_at',{ascending:false}).limit(1).maybeSingle();
        return { ...p, upcomingAppointments: appts||[], latestMood: mood };
      }));
      setPatients(withData);
    } catch(err){ console.error(err); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!msgForm.message.trim()||!selPatient) return;
    setSaving(true);
    try {
      await supabase.from('family_messages').insert({ patient_id:selPatient.id, sender_id:profile.id, message:msgForm.message, message_type:'text', occasion: msgForm.occasion||null });
      await supabase.from('family_chat_messages').insert({ patient_id:selPatient.id, sender_id:profile.id, message:(msgForm.occasion?'💝 '+msgForm.occasion+': ':'')+msgForm.message, message_type:'text' });
      toast.success('Message sent with love! 💌');
      setShowMsgForm(false); setMsgForm({message:'',occasion:''});
    } catch{ toast.error('Could not send'); }
    finally { setSaving(false); }
  };

  const moodEmoji = (score) => {
    if(!score) return '🤔';
    const m = {9:'😊',7:'🙂',5:'😐',3:'😔',1:'😢'};
    const k = [9,7,5,3,1].reduce((a,b)=>Math.abs(b-score)<Math.abs(a-score)?b:a);
    return m[k]||'🙂';
  };

  if(loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">❤️ Family Hub</h2>
        <p className="page-subtitle">Stay connected with your loved ones</p>
      </div>
      {patients.length===0?(
        <div className="card empty-state"><div style={{fontSize:48}}>👨‍👩‍👧</div><p className="empty-state-text">Not connected to any patients yet.</p><p style={{fontSize:13,color:'#d1d5db'}}>Ask an admin to link your account.</p></div>
      ):patients.map(patient=>(
        <div key={patient.id} className="card mb-5">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:20}}>
            <div className="flex items-center gap-3">
              <div style={{width:54,height:54,borderRadius:'50%',background:'#fff9f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700,color:'#f97316',border:'2px solid #fed7aa'}}>
                {patient.user?.full_name?.[0]||'?'}
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:18}}>{patient.user?.full_name}</div>
                <div style={{fontSize:13,color:'#9ca3af'}}>Your {patient.relationship||'family member'} · {patient.age_mode} mode</div>
                {patient.latestMood&&<div style={{fontSize:13,marginTop:2}}>Feeling: {moodEmoji(patient.latestMood.mood_score)} {patient.latestMood.mood_label||'okay'}</div>}
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={()=>{setSelPatient(patient);setShowMsgForm(true);}}>💌 Send Message</button>
          </div>
          {patient.upcomingAppointments.length>0&&(
            <div style={{background:'#eff6ff',borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,color:'#1d4ed8',marginBottom:8}}>📅 Upcoming Appointments</div>
              {patient.upcomingAppointments.map(appt=>(
                <div key={appt.id} style={{fontSize:14,color:'#374151',marginBottom:4}}>
                  Dr. {appt.doctor?.full_name} — {format(new Date(appt.appointment_date),'MMM d')} at {appt.appointment_time?.slice(0,5)}
                  <span className={`badge ${appt.status==='accepted'?'badge-green':'badge-amber'}`} style={{marginLeft:8}}>{appt.status}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {[{icon:'💬',label:'Chat',desc:'Open family chat'},{icon:'🎙️',label:'Voice Note',desc:'Record a message'},{icon:'📸',label:'Memory',desc:'Add to vault'}].map(a=>(
              <div key={a.label} style={{background:'#f9fafb',borderRadius:12,padding:14,textAlign:'center',cursor:'pointer',border:'1px solid #e5e7eb'}} onClick={()=>toast.info(`Open "${a.label}" from the sidebar navigation`)}>
                <div style={{fontSize:24,marginBottom:4}}>{a.icon}</div>
                <div style={{fontWeight:700,fontSize:13}}>{a.label}</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {showMsgForm&&selPatient&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowMsgForm(false)}>
          <div className="modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{marginBottom:0}}>💌 Message to {selPatient.user?.full_name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowMsgForm(false)}><X size={16}/></button>
            </div>
            <div className="form-group">
              <label className="form-label">Occasion (optional)</label>
              <input type="text" className="form-input" placeholder="Birthday, Get Well, Just Because..." value={msgForm.occasion} onChange={e=>setMsgForm(p=>({...p,occasion:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Your Message *</label>
              <textarea className="form-input form-textarea" rows={4} placeholder="Write something warm..." value={msgForm.message} onChange={e=>setMsgForm(p=>({...p,message:e.target.value}))}/>
            </div>
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-outline flex-1" onClick={()=>setShowMsgForm(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={sendMessage} disabled={saving}>{saving?'Sending...':'💌 Send with Love'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HopePage() {
  const { patientRecord } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const mode = patientRecord?.age_mode||'adult';

  useEffect(()=>{ loadMessages(); },[mode]);

  const loadMessages = async()=>{
    setLoading(true);
    try {
      const { data } = await supabase.from('hope_messages').select('*').eq('age_mode',mode).eq('is_active',true);
      setMessages(data||[]);
    } catch{}
    finally { setLoading(false); }
  };

  const cfg = {
    child:{emoji:'🌟',title:'Your Daily Sunshine',subtitle:'A little magic just for you!',bg:'linear-gradient(135deg,#fff9f0,#fef3c7)'},
    adult:{emoji:'🌿',title:'Daily Hope & Wellness',subtitle:'Gentle encouragement for your journey',bg:'linear-gradient(135deg,#f0fdfa,#dcfce7)'},
    elder:{emoji:'🌸',title:'Your Daily Blessings',subtitle:'Warmth and love, every single day',bg:'linear-gradient(135deg,#fffbeb,#fef3c7)'},
  }[mode];

  if(loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{cfg.emoji} {cfg.title}</h2>
        <p className="page-subtitle">{cfg.subtitle}</p>
      </div>
      <div style={{display:'grid',gap:20}}>
        {messages.map((msg,i)=>(
          <div key={msg.id} style={{background:cfg.bg,border:'2px solid #fed7aa',borderRadius:24,padding:28,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',right:20,top:20,fontSize:36,opacity:0.15}}>{'✨🌟💛🌸🌿'[i%5]}</div>
            <p style={{fontFamily:'Lora,serif',fontSize:mode==='elder'?20:17,color:'#374151',lineHeight:1.8,fontStyle:'italic',marginBottom:12}}>"{msg.message}"</p>
            {msg.author&&<div style={{fontSize:13,color:'#9ca3af',fontWeight:600}}>— {msg.author}</div>}
          </div>
        ))}
        {messages.length===0&&<div className="card empty-state"><div style={{fontSize:48}}>✨</div><p className="empty-state-text">Hope messages will appear here after running the SQL schema.</p></div>}
        <div style={{background:'linear-gradient(135deg,#fdf4ff,#ede9fe)',border:'2px solid #ddd6fe',borderRadius:24,padding:28,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>💙</div>
          <p style={{fontFamily:'Lora,serif',fontSize:mode==='elder'?19:16,color:'#374151',lineHeight:1.8,fontStyle:'italic'}}>
            {mode==='child'&&'"You are loved, you are brave, and you are doing so, so well today!"'}
            {mode==='adult'&&'"Every step you take toward healing matters. You are not alone on this journey."'}
            {mode==='elder'&&'"You have lived a life full of love, wisdom, and grace. You are deeply treasured."'}
          </p>
          <div style={{fontSize:12,color:'#9ca3af',marginTop:12,fontWeight:600}}>— The CareAssist Team 💙</div>
        </div>
      </div>
    </div>
  );
}
