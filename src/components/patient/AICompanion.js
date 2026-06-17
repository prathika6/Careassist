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

  const getAIResponse = (userMessage) => {
    const msg = userMessage.toLowerCase();
    const responses = AI_RESPONSES[mode];

    // Keyword-based responses
    if (msg.includes('sad') || msg.includes('cry') || msg.includes('lonely')) {
      if (mode === 'child') return "Oh no! It's okay to feel sad sometimes. Want me to tell you something happy? Your family loves you so much! 💖";
      if (mode === 'elder') return "It is natural to feel lonely sometimes, dear. But please remember, you are never truly alone. Your family holds you in their hearts every day. 🌸";
      return "I hear you. It's okay to have hard days. Your feelings are valid. Is there something specific on your mind you'd like to talk about?";
    }

    if (msg.includes('medicine') || msg.includes('pill') || msg.includes('medication')) {
      if (mode === 'child') return "Your medicines are like tiny helpers fighting for you! 💊 Remember to take them — they make you stronger! ⭐";
      if (mode === 'elder') return "Your medicines are important, dear. If you ever have trouble remembering, your caregiver can help you. 🌸";
      return "Medication adherence is such an important part of recovery. Each dose brings you closer to wellness. Have you set up reminders?";
    }

    if (msg.includes('family') || msg.includes('mom') || msg.includes('dad') || msg.includes('daughter') || msg.includes('son')) {
      if (mode === 'elder') return "How wonderful to talk about your family! They love you deeply. Have you checked the family messages section? They might have sent you something. 💛";
      return "Your family connection is so important to your healing. Have you visited the Family Chat section today?";
    }

    if (msg.includes('pain') || msg.includes('hurt') || msg.includes('sick')) {
      return mode === 'child'
        ? "I'm sorry you're not feeling well. 😢 Your care friends are working hard to help you feel better! Should I let your caregiver know? 💙"
        : "I'm sorry to hear you're not feeling well. Please make sure your caregiver knows about this. Your health comes first. 💙";
    }

    if (msg.includes('memory') || msg.includes('remember') || msg.includes('past')) {
      return mode === 'elder'
        ? "Memories are such precious treasures! 🌟 Have you visited the Memory Vault? You and your family can add your most cherished memories there. 📸"
        : "Memories are beautiful. Would you like to add something to your Memory Vault? It's a wonderful place to keep your precious moments. 📸";
    }

    if (msg.includes('good') || msg.includes('great') || msg.includes('happy') || msg.includes('better')) {
      if (mode === 'child') return "YAY! 🎉 That makes me so happy to hear! You are doing AMAZING! Keep it up, superstar! 🌟⭐";
      if (mode === 'elder') return "That warms my heart to hear, dear. Every good moment is a blessing. 🌸 Keep nurturing those happy feelings!";
      return "That's wonderful to hear! Positive days like this are so important. What's been helping you feel this way? 🌿";
    }

    // Default random response
    return responses[Math.floor(Math.random() * responses.length)];
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
      const aiText = getAIResponse(input.trim());
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
