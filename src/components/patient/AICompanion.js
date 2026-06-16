import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Send, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const COMPANION_PERSONAS = {
  child: {
    name: 'Sunny',
    emoji: '☀️',
    greeting: "Hi there, superstar! I'm Sunny, your cheerful friend! How are you feeling today? 🌟",
    color: '#f97316',
    bg: '#fff9f0',
  },
  adult: {
    name: 'Sage',
    emoji: '🌿',
    greeting: "Hello. I'm Sage, your wellness companion. I'm here to listen and support you. How are you doing today?",
    color: '#0d9488',
    bg: '#f0fdfa',
  },
  elder: {
    name: 'Rose',
    emoji: '🌸',
    greeting: "Good day, dear friend. I'm Rose, and I'm so glad to be with you today. How are you feeling? 🌸",
    color: '#c2410c',
    bg: '#fffbeb',
  },
};

const AI_RESPONSES = {
  child: [
    "You're doing so well! Every day you are becoming stronger and braver! 🦸⭐",
    "That's okay! Even superheroes have tough days. Remember, tomorrow is a brand new adventure! 🌈",
    "Your family loves you SO much! They are always thinking about you. 💖",
    "Did you take your medicine today? You're so brave for doing that! It helps you get stronger! 💊⭐",
    "Tell me about your favorite memory! I love hearing happy stories. 😊",
    "You are amazing! Don't forget how special you are! 🌟✨",
  ],
  adult: [
    "Recovery takes patience and persistence. You're showing remarkable resilience. 🌿",
    "It's completely normal to have challenging days. What matters is that you keep going. 💙",
    "Have you connected with your family today? Those connections are medicine for the soul.",
    "Remember to take your medications as prescribed. Each dose is a step toward wellness.",
    "Progress isn't always visible day-to-day, but it's happening. Trust the process.",
    "Your mental health matters as much as your physical health. Be gentle with yourself.",
  ],
  elder: [
    "Your wisdom and life experience are a gift to everyone around you. 🌸",
    "Your family thinks of you often, even when they're not there in person. You are so loved.",
    "It's wonderful to take things slowly and appreciate each moment. There's no rush, dear.",
    "Please don't hesitate to ask your caregiver if you need anything. That's what they're there for.",
    "Sharing a happy memory can brighten any day. What's one of your favorite memories?",
    "You have lived a beautiful life, and there are still beautiful moments ahead. 🌼",
  ],
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

  useEffect(() => {
    if (patientRecord?.id) loadHistory();
  }, [patientRecord]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_companion_chats')
        .select('*')
        .eq('patient_id', patientRecord.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        setMessages(data);
      } else {
        // Add greeting message
        const greeting = {
          patient_id: patientRecord.id,
          role: 'assistant',
          message: persona.greeting,
          created_at: new Date().toISOString(),
        };
        const { data: saved } = await supabase
          .from('ai_companion_chats')
          .insert(greeting)
          .select()
          .single();
        setMessages([saved || greeting]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAIResponse = async (userMessage) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are ${persona.name}, a compassionate health companion for a ${mode} mode patient. Be warm, encouraging, and avoid medical jargon.`,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || 'I am here for you. 💙';
  };

  const sendMessage = async () => {
    if (!input.trim() || !patientRecord?.id) return;

    const userMsg = {
      patient_id: patientRecord.id,
      role: 'user',
      message: input.trim(),
      created_at: new Date().toISOString(),
    };

    setInput('');
    setIsTyping(true);

    try {
      // Save user message
      const { data: savedUser } = await supabase
        .from('ai_companion_chats')
        .insert(userMsg)
        .select()
        .single();
      setMessages(prev => [...prev, savedUser || userMsg]);

      // Simulate AI thinking
      await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

      // Generate and save AI response
      const aiText = await getAIResponse(input.trim());
      const aiMsg = {
        patient_id: patientRecord.id,
        role: 'assistant',
        message: aiText,
        created_at: new Date().toISOString(),
      };

      const { data: savedAI } = await supabase
        .from('ai_companion_chats')
        .insert(aiMsg)
        .select()
        .single();
      setMessages(prev => [...prev, savedAI || aiMsg]);
    } catch (err) {
      toast.error('Could not send message');
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = async () => {
    if (!patientRecord?.id) return;
    if (!window.confirm('Start a fresh conversation?')) return;
    try {
      await supabase
        .from('ai_companion_chats')
        .delete()
        .eq('patient_id', patientRecord.id);
      setMessages([]);
      loadHistory();
    } catch (err) {
      toast.error('Could not clear history');
    }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          {persona.emoji} Meet {persona.name}
        </h2>
        <p className="page-subtitle">Your personal AI companion — always here for you 💙</p>
      </div>

      {/* Companion Card */}
      <div style={{
        background: `linear-gradient(135deg, ${persona.bg}, white)`,
        border: `2px solid ${persona.color}30`,
        borderRadius: 24, padding: 20, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: persona.color + '20', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 32,
          border: `2px solid ${persona.color}40`,
          flexShrink: 0,
        }}>
          {persona.emoji}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: persona.color }}>
            {persona.name}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {mode === 'child' && "Your cheerful friend who loves to listen! 🌟"}
            {mode === 'adult' && "Your thoughtful wellness companion"}
            {mode === 'elder' && "Your gentle, caring daily companion 🌸"}
          </div>
          <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>
            {messages.length} messages shared together
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={clearHistory}
          style={{ marginLeft: 'auto' }}
          title="Start fresh"
        >
          <RefreshCw size={14} />
          {mode === 'elder' ? 'New Chat' : 'Fresh Start'}
        </button>
      </div>

      {/* Chat Interface */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Messages */}
        <div className="chat-messages" style={{ minHeight: 400, maxHeight: 500 }}>
          {messages.map((msg, i) => (
            <div key={msg.id || i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, paddingLeft: 4 }}>
                  {persona.emoji} {persona.name}
                </div>
              )}
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-sent' : 'chat-bubble-ai'}`}
                style={msg.role === 'user' ? { background: persona.color } : {}}>
                {msg.message}
              </div>
              <div style={{ fontSize: 10, color: '#d1d5db', marginTop: 2,
                paddingLeft: msg.role === 'assistant' ? 4 : 0,
                paddingRight: msg.role === 'user' ? 4 : 0,
              }}>
                {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{persona.emoji} {persona.name}</div>
              <div className="chat-bubble chat-bubble-ai" style={{ display: 'flex', gap: 4, padding: '12px 20px' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: persona.color,
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    display: 'inline-block',
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested prompts */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {(mode === 'child'
              ? ["I feel happy today! 😊", "I miss my family 💖", "Tell me something fun! 🎉"]
              : mode === 'elder'
              ? ["I'm feeling okay today 🌸", "I miss my family", "Share some hope 🌼"]
              : ["How can I feel better?", "I need some motivation", "Talk about recovery"]
            ).map(prompt => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid #e5e7eb',
                  background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: '#374151', transition: 'all 0.2s',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            type="text"
            className="form-input"
            placeholder={mode === 'child' ? "Tell Sunny how you feel..." :
                        mode === 'elder' ? "Share with Rose..." :
                        "Share your thoughts with Sage..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            style={{ borderRadius: 20 }}
          />
          <button
            className="btn btn-primary"
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            style={{ borderRadius: 20, background: persona.color, padding: '12px 20px' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
