import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { getGeminiResponse, COMPANION_PERSONAS } from '../../services/gemini';
import { Send, RefreshCw, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const QUICK_PROMPTS = {
  child:  ["I feel happy today! 😊","I miss my family 💖","Tell me something fun! 🎉","I took my medicine! ⭐"],
  adult:  ["How can I stay positive?","I need some motivation","Talk about my recovery","I'm feeling anxious"],
  elder:  ["I'm feeling lonely 🌸","Tell me something hopeful","I miss my family","I took my medicine today"],
};

export default function AICompanion() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);
  const mode = patientRecord?.age_mode || 'adult';
  const persona = COMPANION_PERSONAS[mode];

  useEffect(() => { if (patientRecord?.id) loadHistory(); }, [patientRecord]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('ai_companion_chats')
        .select('*').eq('patient_id', patientRecord.id)
        .order('created_at', { ascending: true }).limit(50);
      if (data?.length > 0) {
        setMessages(data);
      } else {
        const greeting = { patient_id: patientRecord.id, role: 'assistant', message: getGreeting(mode, profile?.full_name), created_at: new Date().toISOString() };
        const { data: saved } = await supabase.from('ai_companion_chats').insert(greeting).select().single();
        setMessages([saved || greeting]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getGreeting = (m, name) => {
    const firstName = name?.split(' ')[0] || 'friend';
    if (m === 'child') return `Hi ${firstName}! I'm Sunny, your cheerful friend! ☀️ How are you feeling today? 🌟`;
    if (m === 'elder') return `Good day, dear ${firstName}. I'm Rose, and I'm so glad to be with you today. How are you feeling? 🌸`;
    return `Hello ${firstName}. I'm Sage, your wellness companion. I'm here to listen and support you. How are you doing today? 🌿`;
  };

  const sendMessage = async () => {
    if (!input.trim() || !patientRecord?.id || isTyping) return;
    const userText = input.trim();
    setInput('');
    setIsTyping(true);

    const userMsg = { patient_id: patientRecord.id, role: 'user', message: userText, created_at: new Date().toISOString() };
    try {
      const { data: savedUser } = await supabase.from('ai_companion_chats').insert(userMsg).select().single();
      setMessages(prev => [...prev, savedUser || userMsg]);

      // Get AI response with full history context
      const aiText = await getGeminiResponse(userText, mode, messages.slice(-10));
      await new Promise(r => setTimeout(r, 600)); // slight natural delay

      const aiMsg = { patient_id: patientRecord.id, role: 'assistant', message: aiText, created_at: new Date().toISOString() };
      const { data: savedAI } = await supabase.from('ai_companion_chats').insert(aiMsg).select().single();
      setMessages(prev => [...prev, savedAI || aiMsg]);
    } catch (err) {
      toast.error('Could not send message');
    } finally { setIsTyping(false); }
  };

  const clearChat = async () => {
    if (!window.confirm('Start a fresh conversation?')) return;
    await supabase.from('ai_companion_chats').delete().eq('patient_id', patientRecord.id);
    setMessages([]);
    loadHistory();
  };

  const hasGemini = !!process.env.REACT_APP_GEMINI_KEY;
  const colors = { child:'#f97316', adult:'#0d9488', elder:'#c2410c' };
  const bgs = { child:'#fff9f0', adult:'#f0fdfa', elder:'#fffbeb' };
  const color = colors[mode];
  const bg = bgs[mode];

  if (loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{persona?.emoji} Meet {persona?.name}</h2>
        <p className="page-subtitle">Your personal AI companion — always here for you 💙</p>
      </div>

      {/* Companion card */}
      <div style={{ background:`linear-gradient(135deg,${bg},white)`, border:`2px solid ${color}30`, borderRadius:24, padding:20, marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, border:`2px solid ${color}40`, flexShrink:0 }}>
          {persona?.emoji}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18, color }}>{persona?.name}</div>
          <div style={{ fontSize:13, color:'#6b7280' }}>
            {mode==='child'&&"Your cheerful friend who loves to listen! 🌟"}
            {mode==='adult'&&"Your thoughtful wellness companion 🌿"}
            {mode==='elder'&&"Your gentle, caring daily companion 🌸"}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: hasGemini?'#22c55e':'#f59e0b' }}/>
            <span style={{ fontSize:11, color:'#9ca3af' }}>
              {hasGemini ? 'Powered by Gemini AI' : 'Smart keyword responses (add REACT_APP_GEMINI_KEY for full AI)'}
            </span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearChat} title="Start fresh">
          <RefreshCw size={14}/> New Chat
        </button>
      </div>

      {/* Chat */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="chat-messages" style={{ minHeight:380, maxHeight:460 }}>
          {messages.map((msg,i) => (
            <div key={msg.id||i} style={{ display:'flex', flexDirection:'column', alignItems:msg.role==='user'?'flex-end':'flex-start' }}>
              {msg.role==='assistant'&&<div style={{ fontSize:11, color:'#9ca3af', marginBottom:3, paddingLeft:4 }}>{persona?.emoji} {persona?.name}</div>}
              <div style={{
                maxWidth:'78%', padding:'12px 16px', borderRadius:20, fontSize:14, lineHeight:1.6,
                background: msg.role==='user' ? color : `linear-gradient(135deg,${bg},white)`,
                color: msg.role==='user' ? 'white' : '#111827',
                borderBottomRightRadius: msg.role==='user' ? 4 : 20,
                borderBottomLeftRadius: msg.role==='user' ? 20 : 4,
                border: msg.role==='assistant' ? `1px solid ${color}30` : 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                {msg.message}
              </div>
              <div style={{ fontSize:10, color:'#d1d5db', marginTop:2, paddingLeft:msg.role==='assistant'?4:0, paddingRight:msg.role==='user'?4:0 }}>
                {msg.created_at ? format(new Date(msg.created_at),'h:mm a') : ''}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <div style={{ fontSize:11, color:'#9ca3af', marginBottom:3, paddingLeft:4 }}>{persona?.emoji} {persona?.name}</div>
              <div style={{ background:`linear-gradient(135deg,${bg},white)`, border:`1px solid ${color}30`, borderRadius:'20px 20px 20px 4px', padding:'12px 20px', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i=>(
                  <span key={i} style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', animation:`bounce 1.2s ${i*0.2}s infinite` }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>

        {/* Quick prompts */}
        <div style={{ padding:'10px 16px', borderTop:'1px solid #f3f4f6', background:'#fafafa' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {(QUICK_PROMPTS[mode]||[]).map(p=>(
              <button key={p} onClick={()=>setInput(p)} style={{ padding:'5px 14px', borderRadius:20, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input type="text" className="form-input"
            placeholder={`Talk to ${persona?.name}...`}
            value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendMessage()}
            style={{ borderRadius:20, flex:1 }}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim()||isTyping}
            style={{ borderRadius:20, background:color, padding:'12px 20px' }}>
            <Send size={16}/>
          </button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}`}</style>
    </div>
  );
}
