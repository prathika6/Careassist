import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Send, Heart } from 'lucide-react';
import { format } from 'date-fns';

export default function FamilyChat({ targetPatientId }) {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  // Determine patient ID (patient uses own, family/caregiver passes target)
  const pid = patientRecord?.id || targetPatientId;
  const isPatient = profile?.role === 'patient';

  useEffect(() => {
    if (pid) {
      loadMessages();
      // Poll for new messages every 10s
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [pid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('family_chat_messages')
        .select('*, sender:sender_id(full_name, role)')
        .eq('patient_id', pid)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !pid) return;
    setSending(true);
    try {
      const { error } = await supabase.from('family_chat_messages').insert({
        patient_id: pid,
        sender_id: profile.id,
        message: input.trim(),
        message_type: 'text',
      });
      if (error) throw error;
      setInput('');
      await loadMessages();
    } catch (err) {
      toast.error('Could not send message');
    } finally {
      setSending(false);
    }
  };

  const sendWish = async (wish) => {
    setSending(true);
    try {
      const { error } = await supabase.from('family_messages').insert({
        patient_id: pid,
        sender_id: profile.id,
        message: wish,
        message_type: 'wish',
      });
      if (error) throw error;
      // Also add to chat
      await supabase.from('family_chat_messages').insert({
        patient_id: pid,
        sender_id: profile.id,
        message: '💝 ' + wish,
        message_type: 'text',
      });
      toast.success('Love sent! 💌');
      await loadMessages();
    } catch (err) {
      toast.error('Could not send wish');
    } finally {
      setSending(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = { patient: '#f97316', caregiver: '#0d9488', doctor: '#0ea5e9', family: '#8b5cf6', admin: '#374151' };
    return colors[role] || '#6b7280';
  };

  const isMe = (msg) => msg.sender_id === profile?.id;

  const quickWishes = [
    "Thinking of you and sending lots of love! 💖",
    "You are so brave and we are so proud of you! 🌟",
    "Wishing you a peaceful, restful day 🌸",
    "We are always with you in spirit 💙",
    "Get well soon — we miss you! 🌈",
  ];

  if (!pid) {
    return (
      <div className="empty-state card">
        <div style={{ fontSize: 48 }}>💬</div>
        <p className="empty-state-text">No patient connected to show chat for.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">💬 Family Chat</h2>
        <p className="page-subtitle">Stay connected with your loved ones, every day 💙</p>
      </div>

      {/* Quick Wish Buttons (for family members) */}
      {!isPatient && (
        <div className="card mb-4">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💝 Send Quick Love</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quickWishes.map(wish => (
              <button
                key={wish}
                onClick={() => sendWish(wish)}
                disabled={sending}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: '2px solid #fed7aa',
                  background: '#fff9f0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: '#c2410c', transition: 'all 0.2s',
                }}
              >
                {wish.length > 40 ? wish.slice(0, 40) + '...' : wish}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: 'white' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>💬</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Family Chat Room</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {messages.length} messages · Refreshes every 10 seconds
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner" />
        ) : (
          <div className="chat-messages" style={{ height: 420 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
                <p>No messages yet. Say hello! 👋</p>
              </div>
            ) : messages.map((msg, i) => {
              const mine = isMe(msg);
              const color = getRoleColor(msg.sender?.role);
              return (
                <div key={msg.id || i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: mine ? 'flex-end' : 'flex-start',
                }}>
                  {!mine && (
                    <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 3, paddingLeft: 4 }}>
                      {msg.sender?.full_name || 'Someone'} · {msg.sender?.role}
                    </div>
                  )}
                  <div
                    className="chat-bubble"
                    style={{
                      background: mine ? '#f97316' : 'white',
                      color: mine ? 'white' : '#111827',
                      borderBottomRightRadius: mine ? 4 : 20,
                      borderBottomLeftRadius: mine ? 20 : 4,
                      boxShadow: mine ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                      borderLeft: !mine ? `3px solid ${color}` : 'none',
                    }}
                  >
                    {msg.message}
                  </div>
                  <div style={{
                    fontSize: 10, color: '#d1d5db', marginTop: 2,
                    paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0
                  }}>
                    {msg.created_at ? format(new Date(msg.created_at), 'MMM d, h:mm a') : ''}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="chat-input-area">
          <input
            type="text"
            className="form-input"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            style={{ borderRadius: 20, flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{ borderRadius: 20, padding: '12px 20px' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 12 }}>
        Messages are visible to patient, family members, and care team 💙
      </p>
    </div>
  );
}
