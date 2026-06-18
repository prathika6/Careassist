import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  appointment_reminder: { icon: '📅', color: '#0ea5e9', bg: '#eff6ff' },
  medicine_reminder:    { icon: '💊', color: '#0d9488', bg: '#f0fdfa' },
  emergency:            { icon: '🚨', color: '#dc2626', bg: '#fef2f2' },
  alert:                { icon: '⚠️', color: '#f59e0b', bg: '#fffbeb' },
  family_message:       { icon: '💌', color: '#8b5cf6', bg: '#fdf4ff' },
  connection_request:   { icon: '🔗', color: '#f97316', bg: '#fff9f0' },
  general:              { icon: '🔔', color: '#6b7280', bg: '#f9fafb' },
};

export default function NotificationCenter() {
  const { profile } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');

  useEffect(() => { loadData(); }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile?.id}`
      }, payload => {
        setNotifs(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [n, l] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('notification_logs').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(30),
      ]);
      setNotifs(n.data || []);
      setLogs(l.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const CHANNEL_COLORS = { sms: '#22c55e', whatsapp: '#16a34a', app: '#0ea5e9', email: '#8b5cf6' };
  const CHANNEL_ICONS  = { sms: '📱', whatsapp: '💬', app: '🔔', email: '📧' };

  if (loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 className="page-title">🔔 Notification Center</h2>
            <p className="page-subtitle">All your alerts, reminders and messages in one place</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}>
              <CheckCheck size={14}/> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[
          { key:'inbox', label:`📥 Inbox ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
          { key:'delivery', label:'📊 Delivery Log' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding:'10px 20px', borderRadius:20, border:'2px solid', fontWeight:700, fontSize:14, cursor:'pointer',
            borderColor: activeTab === tab.key ? '#f97316' : '#e5e7eb',
            background: activeTab === tab.key ? '#fff9f0' : 'white',
            color: activeTab === tab.key ? '#c2410c' : '#374151',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Inbox Tab */}
      {activeTab === 'inbox' && (
        notifs.length === 0 ? (
          <div className="card empty-state">
            <div style={{ fontSize:48 }}>🔔</div>
            <p className="empty-state-text">No notifications yet</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
              return (
                <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                  style={{ background: n.is_read ? 'white' : cfg.bg, border:`2px solid ${n.is_read ? '#f3f4f6' : cfg.color+'40'}`, borderRadius:16, padding:16, cursor: n.is_read ? 'default' : 'pointer', transition:'all 0.2s' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:cfg.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{n.title}</div>
                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                          {!n.is_read && <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, marginTop:4 }}/>}
                          <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#d1d5db', padding:2 }}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize:13, color:'#374151', marginTop:3, lineHeight:1.5 }}>{n.message}</p>
                      <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
                        {format(new Date(n.created_at), 'MMM d, h:mm a')}
                        {n.is_read && <span style={{ marginLeft:8, color:'#22c55e' }}>✓ Read</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Delivery Log Tab */}
      {activeTab === 'delivery' && (
        logs.length === 0 ? (
          <div className="card empty-state">
            <div style={{ fontSize:48 }}>📊</div>
            <p className="empty-state-text">No delivery logs yet</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Type</th><th>Channel</th><th>Message</th><th>Status</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td>{TYPE_CONFIG[l.type]?.icon || '🔔'} {l.type?.replace(/_/g,' ')}</td>
                      <td>
                        <span style={{ background: CHANNEL_COLORS[l.channel]+'20', color: CHANNEL_COLORS[l.channel], padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                          {CHANNEL_ICONS[l.channel]} {l.channel}
                        </span>
                      </td>
                      <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13, color:'#6b7280' }}>{l.message}</td>
                      <td>
                        <span className={`badge ${l.status==='delivered'?'badge-green':l.status==='failed'?'badge-rose':'badge-amber'}`}>{l.status}</span>
                      </td>
                      <td style={{ fontSize:12, color:'#9ca3af' }}>{format(new Date(l.created_at), 'MMM d, h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
