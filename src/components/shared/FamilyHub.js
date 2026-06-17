import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Send, Mic, MicOff, Play, Pause, Image, Gift, X } from 'lucide-react';
import { format } from 'date-fns';

export default function FamilyHub() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('chat');
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPatient = profile?.role === 'patient';

  useEffect(() => {
    if (isPatient && patientRecord?.id) {
      setSelectedPatientId(patientRecord.id);
      setLoading(false);
    } else {
      findPatients();
    }
  }, [profile, patientRecord]);

  const findPatients = async () => {
    setLoading(true);
    try {
      let data = [];
      if (profile?.role === 'family') {
        const { data: fm } = await supabase.from('family_members')
          .select('patient:patient_id(id, user:user_id(full_name))').eq('family_user_id', profile.id);
        data = fm?.map(f => f.patient).filter(Boolean) || [];
      } else if (profile?.role === 'caregiver') {
        const { data: cg } = await supabase.from('patient_caregivers')
          .select('patient:patient_id(id, user:user_id(full_name))').eq('caregiver_id', profile.id);
        data = cg?.map(c => c.patient).filter(Boolean) || [];
      } else if (profile?.role === 'doctor') {
        const { data: dc } = await supabase.from('patient_doctors')
          .select('patient:patient_id(id, user:user_id(full_name))').eq('doctor_id', profile.id);
        data = dc?.map(d => d.patient).filter(Boolean) || [];
      }
      setPatients(data);
      if (data.length > 0) setSelectedPatientId(data[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const TABS = [
    { key: 'chat', label: '💬 Chat', roles: ['patient','family','caregiver','doctor'] },
    { key: 'voicenotes', label: '🎙️ Voice Notes', roles: ['patient','family','caregiver'] },
    { key: 'messages', label: '💌 Love Messages', roles: ['patient','family'] },
    { key: 'memories', label: '📸 Memories', roles: ['patient','family','caregiver'] },
  ].filter(t => t.roles.includes(profile?.role));

  if (loading) return <div className="loading-spinner"/>;

  if (!selectedPatientId) return (
    <div>
      <div className="page-header"><h2 className="page-title">❤️ Family Hub</h2></div>
      <div className="card empty-state">
        <div style={{fontSize:48}}>🔗</div>
        <p className="empty-state-text">No patients connected yet.</p>
        <p style={{fontSize:13,color:'#9ca3af'}}>Go to My Care Circle to connect with a patient using their invite code.</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">❤️ Family Hub</h2>
        <p className="page-subtitle">Stay connected — chat, voice notes, memories, and more</p>
      </div>

      {/* Patient selector for non-patients with multiple patients */}
      {!isPatient && patients.length > 1 && (
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}}>
          {patients.map(p => (
            <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
              style={{padding:'8px 18px',borderRadius:20,border:'2px solid',fontWeight:700,fontSize:13,cursor:'pointer',
                borderColor: selectedPatientId===p.id?'#f97316':'#e5e7eb',
                background: selectedPatientId===p.id?'#fff9f0':'white',
                color: selectedPatientId===p.id?'#c2410c':'#374151'}}>
              {p.user?.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{padding:'10px 20px',borderRadius:20,border:'2px solid',fontWeight:700,fontSize:14,cursor:'pointer',
              borderColor: activeTab===tab.key?'#f97316':'#e5e7eb',
              background: activeTab===tab.key?'#fff9f0':'white',
              color: activeTab===tab.key?'#c2410c':'#374151'}}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && <ChatPanel patientId={selectedPatientId}/>}
      {activeTab === 'voicenotes' && <VoicePanel patientId={selectedPatientId}/>}
      {activeTab === 'messages' && <MessagesPanel patientId={selectedPatientId}/>}
      {activeTab === 'memories' && <MemoriesPanel patientId={selectedPatientId}/>}
    </div>
  );
}

// ── Chat Panel ──
function ChatPanel({ patientId }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { if(patientId) loadMsgs(); }, [patientId]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const loadMsgs = async () => {
    const { data } = await supabase.from('family_chat_messages')
      .select('*, sender:sender_id(full_name,role)').eq('patient_id', patientId)
      .order('created_at',{ascending:true}).limit(100);
    setMessages(data||[]);
  };

  useEffect(() => {
    if (!patientId) return;
    const interval = setInterval(loadMsgs, 8000);
    return () => clearInterval(interval);
  }, [patientId]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      await supabase.from('family_chat_messages').insert({patient_id:patientId,sender_id:profile.id,message:input.trim(),message_type:'text'});
      setInput('');
      loadMsgs();
    } catch { toast.error('Could not send'); }
    finally { setSending(false); }
  };

  const RC = {patient:'#f97316',caregiver:'#0d9488',doctor:'#0ea5e9',family:'#8b5cf6'};
  const isMe = (msg) => msg.sender_id === profile?.id;

  return (
    <div className="card" style={{padding:0,overflow:'hidden'}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid #f3f4f6',fontWeight:700,fontSize:15}}>
        💬 Family Chat · <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>Auto-refreshes every 8s</span>
      </div>
      <div className="chat-messages" style={{height:420}}>
        {messages.length===0
          ? <div style={{textAlign:'center',padding:40,color:'#9ca3af'}}><div style={{fontSize:36,marginBottom:8}}>💬</div>No messages yet. Say hello!</div>
          : messages.map((msg,i)=>{
            const mine=isMe(msg);
            const color=RC[msg.sender?.role]||'#6b7280';
            return (
              <div key={msg.id||i} style={{display:'flex',flexDirection:'column',alignItems:mine?'flex-end':'flex-start'}}>
                {!mine&&<div style={{fontSize:11,color,fontWeight:700,marginBottom:3,paddingLeft:4}}>{msg.sender?.full_name} · {msg.sender?.role}</div>}
                <div className="chat-bubble" style={{background:mine?'#f97316':'white',color:mine?'white':'#111827',borderBottomRightRadius:mine?4:20,borderBottomLeftRadius:mine?20:4,boxShadow:mine?'none':'0 1px 4px rgba(0,0,0,0.08)',borderLeft:!mine?`3px solid ${color}`:'none'}}>
                  {msg.message}
                </div>
                <div style={{fontSize:10,color:'#d1d5db',marginTop:2,paddingLeft:mine?0:4,paddingRight:mine?4:0}}>
                  {msg.created_at?format(new Date(msg.created_at),'h:mm a'):''}
                </div>
              </div>
            );
          })
        }
        <div ref={endRef}/>
      </div>
      <div className="chat-input-area">
        <input type="text" className="form-input" placeholder="Type a message..." value={input}
          onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          style={{borderRadius:20,flex:1}}/>
        <button className="btn btn-primary" onClick={send} disabled={!input.trim()||sending} style={{borderRadius:20,padding:'12px 20px'}}>
          <Send size={16}/>
        </button>
      </div>
    </div>
  );
}

// ── Voice Notes Panel ──
function VoicePanel({ patientId }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRefs = useRef({});

  const isPatient = profile?.role === 'patient';

  useEffect(() => { if(patientId) load(); }, [patientId]);

  const load = async () => {
    const { data } = await supabase.from('voice_notes')
      .select('*, sender:sender_id(full_name,role)').eq('patient_id',patientId)
      .order('created_at',{ascending:false});
    setNotes(data||[]);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunksRef.current=[];
      const mr=new MediaRecorder(stream);
      mrRef.current=mr;
      mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
      mr.onstop=()=>{setRecordedBlob(new Blob(chunksRef.current,{type:'audio/webm'}));stream.getTracks().forEach(t=>t.stop());};
      mr.start(); setRecording(true); setSeconds(0);
      timerRef.current=setInterval(()=>setSeconds(s=>s+1),1000);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRec = () => {
    mrRef.current?.stop(); setRecording(false); clearInterval(timerRef.current);
  };

  const save = async () => {
    if (!title.trim()) { toast.error('Add a title'); return; }
    if (!recordedBlob) { toast.error('Record audio first'); return; }
    setSaving(true);
    try {
      const audioUrl = URL.createObjectURL(recordedBlob);
      await supabase.from('voice_notes').insert({patient_id:patientId,sender_id:profile.id,title:title.trim(),audio_url:audioUrl,duration_seconds:seconds});
      toast.success('Voice note saved! 🎙️');
      setRecordedBlob(null); setTitle(''); setSeconds(0); load();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const togglePlay = (note) => {
    const audio=audioRefs.current[note.id];
    if(!audio) return;
    if(playingId===note.id){audio.pause();setPlayingId(null);}
    else{if(playingId&&audioRefs.current[playingId])audioRefs.current[playingId].pause();audio.play();setPlayingId(note.id);audio.onended=()=>setPlayingId(null);}
  };

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const RC = {patient:'#f97316',caregiver:'#0d9488',doctor:'#0ea5e9',family:'#8b5cf6'};

  return (
    <div>
      {/* Recorder — hide for patients */}
      {!isPatient && (
        <div style={{background:recording?'#fef9c3':'#f9fafb',border:`2px solid ${recording?'#fde047':'#e5e7eb'}`,borderRadius:20,padding:24,marginBottom:20}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>🎙️ Record a Voice Note</h3>
          {!recordedBlob ? (
            <div style={{textAlign:'center',padding:'10px 0'}}>
              {recording
                ? <><div style={{fontSize:32,marginBottom:8,animation:'pulse 1s infinite'}}>🔴</div><div style={{fontSize:24,fontWeight:800,marginBottom:12}}>{fmt(seconds)}</div><button className="btn btn-danger" onClick={stopRec}><MicOff size={16}/> Stop</button></>
                : <><div style={{fontSize:32,marginBottom:8}}>🎙️</div><button className="btn btn-primary" onClick={startRec}><Mic size={16}/> Start Recording</button></>
              }
            </div>
          ) : (
            <div>
              <audio controls src={URL.createObjectURL(recordedBlob)} style={{width:'100%',marginBottom:12}}/>
              <input type="text" className="form-input" placeholder="Title for this note..." value={title} onChange={e=>setTitle(e.target.value)} style={{marginBottom:10}}/>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-outline flex-1" onClick={()=>{setRecordedBlob(null);setSeconds(0);}}>Re-record</button>
                <button className="btn btn-primary flex-1" onClick={save} disabled={saving}>{saving?'Saving...':'💾 Save Note'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {notes.length===0
        ? <div className="card empty-state"><div style={{fontSize:48}}>🎙️</div><p className="empty-state-text">{isPatient?'No voice notes yet. Family will send you some soon!':'Record the first voice note above!'}</p></div>
        : notes.map(note=>(
          <div key={note.id} className="card mb-3" style={{padding:18}}>
            <div style={{display:'flex',gap:14,alignItems:'center'}}>
              <button onClick={()=>togglePlay(note)} style={{width:46,height:46,borderRadius:'50%',border:'none',cursor:'pointer',background:RC[note.sender?.role]+'20',color:RC[note.sender?.role],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>
                {playingId===note.id?<Pause size={20}/>:<Play size={20}/>}
              </button>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{note.title}</div>
                <div style={{fontSize:12,color:RC[note.sender?.role],fontWeight:600}}>From {note.sender?.full_name}</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>{format(new Date(note.created_at),'MMM d, h:mm a')}{note.duration_seconds?` · ${fmt(note.duration_seconds)}`:''}</div>
              </div>
            </div>
            {note.audio_url&&<audio ref={el=>{if(el)audioRefs.current[note.id]=el;}} src={note.audio_url} style={{display:'none'}}/>}
            <div style={{display:'flex',gap:3,marginTop:10,paddingLeft:60}}>
              {Array.from({length:20}).map((_,i)=>(
                <div key={i} style={{width:3,borderRadius:4,height:`${8+Math.abs(Math.sin(i*0.8))*16}px`,background:playingId===note.id?RC[note.sender?.role]:'#e5e7eb',transition:'background 0.3s'}}/>
              ))}
            </div>
          </div>
        ))
      }
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

// ── Love Messages Panel ──
function MessagesPanel({ patientId }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({message:'',occasion:''});
  const [saving, setSaving] = useState(false);
  const isPatient = profile?.role === 'patient';

  useEffect(() => { if(patientId) load(); }, [patientId]);

  const load = async () => {
    const { data } = await supabase.from('family_messages')
      .select('*, sender:sender_id(full_name,role)').eq('patient_id',patientId)
      .order('created_at',{ascending:false}).limit(30);
    setMessages(data||[]);
  };

  const send = async () => {
    if (!form.message.trim()) { toast.error('Write a message'); return; }
    setSaving(true);
    try {
      await supabase.from('family_messages').insert({patient_id:patientId,sender_id:profile.id,message:form.message,message_type:'text',occasion:form.occasion||null});
      await supabase.from('family_chat_messages').insert({patient_id:patientId,sender_id:profile.id,message:(form.occasion?`💝 ${form.occasion}: `:'')+form.message,message_type:'text'});
      toast.success('Message sent with love! 💌');
      setForm({message:'',occasion:''});
      load();
    } catch { toast.error('Could not send'); }
    finally { setSaving(false); }
  };

  const WISHES = ["Thinking of you and sending love! 💖","You are so brave and we are so proud! 🌟","Wishing you a peaceful, restful day 🌸","We are always with you in spirit 💙","Get well soon — we miss you! 🌈"];

  return (
    <div>
      {!isPatient && (
        <div className="card mb-4">
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>💌 Send a Love Message</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            {WISHES.map(w=>(
              <button key={w} onClick={()=>setForm(p=>({...p,message:w}))} style={{padding:'6px 14px',borderRadius:20,border:'2px solid #fed7aa',background:'#fff9f0',cursor:'pointer',fontSize:12,fontWeight:600,color:'#c2410c'}}>
                {w.length>30?w.slice(0,30)+'...':w}
              </button>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Occasion (optional)</label>
            <input type="text" className="form-input" placeholder="Birthday, Get Well, Just Because..." value={form.occasion} onChange={e=>setForm(p=>({...p,occasion:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Your Message</label>
            <textarea className="form-input form-textarea" rows={3} placeholder="Write something warm and encouraging..." value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))}/>
          </div>
          <button className="btn btn-primary w-full" onClick={send} disabled={saving}>{saving?'Sending...':'💌 Send with Love'}</button>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {messages.length===0
          ? <div className="card empty-state"><div style={{fontSize:40}}>💌</div><p className="empty-state-text">No messages yet</p></div>
          : messages.map(msg=>(
            <div key={msg.id} style={{background:'#fff9f0',border:'2px solid #fed7aa',borderRadius:16,padding:16}}>
              {msg.occasion&&<div style={{fontSize:12,fontWeight:700,color:'#c2410c',marginBottom:4}}>💝 {msg.occasion}</div>}
              <p style={{fontSize:14,color:'#374151',marginBottom:8}}>{msg.message}</p>
              <div style={{fontSize:11,color:'#9ca3af'}}>From {msg.sender?.full_name} · {format(new Date(msg.created_at),'MMM d, h:mm a')}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Memories Panel ──
function MemoriesPanel({ patientId }) {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [memories, setMemories] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({title:'',description:'',memory_date:'',image_url:'',tags:''});

  useEffect(() => { if(patientId) load(); }, [patientId]);

  const load = async () => {
    const { data } = await supabase.from('memory_vault')
      .select('*, added_by_profile:added_by(full_name)').eq('patient_id',patientId)
      .order('memory_date',{ascending:false});
    setMemories(data||[]);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Add a title'); return; }
    setSaving(true);
    try {
      await supabase.from('memory_vault').insert({patient_id:patientId,added_by:profile.id,title:form.title,description:form.description||null,memory_date:form.memory_date||null,image_url:form.image_url||null,tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[]});
      toast.success('Memory saved! 📸');
      setShowAdd(false); setForm({title:'',description:'',memory_date:'',image_url:'',tags:''});
      load();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const EMOJIS=['🌸','🌟','🎂','🎄','🌊','🏡','💐','🎓','👨‍👩‍👧','🌺','🎉','💍'];
  const getEmoji=(t)=>EMOJIS[t.charCodeAt(0)%EMOJIS.length];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{fontSize:16,fontWeight:700}}>📸 Memory Vault</h3>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}>+ Add Memory</button>
      </div>
      {memories.length===0
        ? <div className="card empty-state"><div style={{fontSize:48}}>📸</div><p className="empty-state-text">No memories yet. Add your first one!</p></div>
        : <div className="memory-grid">
            {memories.map(m=>(
              <div key={m.id} className="memory-item">
                {m.image_url?<img src={m.image_url} alt={m.title} className="memory-img" onError={e=>{e.target.style.display='none';}}/>:<div className="memory-placeholder">{getEmoji(m.title)}</div>}
                <div className="memory-info">
                  <div style={{fontWeight:700,fontSize:14}}>{m.title}</div>
                  {m.memory_date&&<div style={{fontSize:11,color:'#9ca3af'}}>{format(new Date(m.memory_date),'MMM d, yyyy')}</div>}
                </div>
              </div>
            ))}
          </div>
      }
      {showAdd&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{marginBottom:0}}>📸 Add Memory</h3>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdd(false)}><X size={16}/></button>
            </div>
            <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="What is this memory?"/></div>
            <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.memory_date} onChange={e=>setForm(p=>({...p,memory_date:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Image URL</label><input type="url" className="form-input" placeholder="https://..." value={form.image_url} onChange={e=>setForm(p=>({...p,image_url:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Tags (comma separated)</label><input type="text" className="form-input" placeholder="family, birthday, summer" value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))}/></div>
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-outline flex-1" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={save} disabled={saving}>{saving?'Saving...':'💾 Save Memory'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
