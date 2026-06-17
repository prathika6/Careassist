import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Copy, Check, UserPlus, X, Clock, CheckCircle, XCircle } from 'lucide-react';

// ── Connection request types and what data each role shares ──
const RELATION_INFO = {
  doctor:    { icon: '🩺', label: 'Doctor',       color: '#0ea5e9', shares: 'Full medical records, prescriptions, health history' },
  caregiver: { icon: '🤝', label: 'Caregiver',    color: '#0d9488', shares: 'Daily vitals, medicine logs, alerts' },
  family:    { icon: '❤️', label: 'Family Member', color: '#f97316', shares: 'General wellbeing, appointments, family chat, memories' },
};

export default function ConnectionHub() {
  const { profile, patientRecord, refreshProfile } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [myConnections, setMyConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [connectCode, setConnectCode] = useState('');
  const [connectRelation, setConnectRelation] = useState('family');
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myPatients, setMyPatients] = useState([]);

  const isPatient = profile?.role === 'patient';

  useEffect(() => { loadData(); }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isPatient && patientRecord) {
        // Load patient's invite code
        const { data: pr } = await supabase.from('patients').select('invite_code').eq('id', patientRecord.id).single();
        setInviteCode(pr?.invite_code || '');

        // Load incoming connection requests
        const { data: reqs } = await supabase.from('connection_requests')
          .select('*, requester:requester_id(full_name, role, email)')
          .eq('patient_id', patientRecord.id)
          .order('created_at', { ascending: false });
        setRequests(reqs || []);

        // Load existing connections
        const [docs, cgs, fms] = await Promise.all([
          supabase.from('patient_doctors').select('*, doctor:doctor_id(full_name, email)').eq('patient_id', patientRecord.id),
          supabase.from('patient_caregivers').select('*, caregiver:caregiver_id(full_name, email)').eq('patient_id', patientRecord.id),
          supabase.from('family_members').select('*, member:family_user_id(full_name, email)').eq('patient_id', patientRecord.id),
        ]);
        setMyConnections([
          ...(docs.data || []).map(d => ({ ...d, role: 'doctor', name: d.doctor?.full_name, email: d.doctor?.email })),
          ...(cgs.data || []).map(c => ({ ...c, role: 'caregiver', name: c.caregiver?.full_name, email: c.caregiver?.email })),
          ...(fms.data || []).map(f => ({ ...f, role: 'family', name: f.member?.full_name, email: f.member?.email, relationship: f.relationship })),
        ]);
      } else {
        // Doctor/Caregiver/Family: load their connected patients
        const role = profile?.role;
        let data = [];
        if (role === 'doctor') {
          const { data: d } = await supabase.from('patient_doctors')
            .select('*, patient:patient_id(*, user:user_id(full_name, email))').eq('doctor_id', profile.id);
          data = (d || []).map(x => ({ ...x.patient, relation_id: x.id }));
        } else if (role === 'caregiver') {
          const { data: d } = await supabase.from('patient_caregivers')
            .select('*, patient:patient_id(*, user:user_id(full_name, email))').eq('caregiver_id', profile.id);
          data = (d || []).map(x => ({ ...x.patient, relation_id: x.id }));
        } else if (role === 'family') {
          const { data: d } = await supabase.from('family_members')
            .select('*, patient:patient_id(*, user:user_id(full_name, email))').eq('family_user_id', profile.id);
          data = (d || []).map(x => ({ ...x.patient, relation_id: x.id, relationship: x.relationship }));
        }
        setMyPatients(data.filter(Boolean));

        // Load pending sent requests
        const { data: reqs } = await supabase.from('connection_requests')
          .select('*, patient:patient_id(user:user_id(full_name))').eq('requester_id', profile.id)
          .order('created_at', { ascending: false });
        setRequests(reqs || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite code copied!');
  };

  const regenerateCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('patients').update({ invite_code: newCode }).eq('id', patientRecord.id);
    setInviteCode(newCode);
    toast.success('New code generated!');
  };

  const sendConnectionRequest = async () => {
    if (!connectCode.trim()) { toast.error('Enter a patient invite code'); return; }
    setConnecting(true);
    try {
      // Find patient by invite code
      const { data: patient, error: findErr } = await supabase
        .from('patients').select('*, user:user_id(full_name)').eq('invite_code', connectCode.toUpperCase()).maybeSingle();

      if (!patient) { toast.error('No patient found with that code. Please check and try again.'); return; }

      // Check not already connected
      const { data: existing } = await supabase.from('connection_requests')
        .select('id').eq('patient_id', patient.id).eq('requester_id', profile.id).maybeSingle();
      if (existing) { toast.error('You already sent a request to this patient.'); return; }

      // Send request
      const { error } = await supabase.from('connection_requests').insert({
        patient_id: patient.id,
        requester_id: profile.id,
        requester_role: profile.role,
        relationship: connectRelation === 'family' ? 'Family' : null,
        status: 'pending',
      });
      if (error) throw error;

      toast.success(`Connection request sent to ${patient.user?.full_name}! Waiting for their approval.`);
      setConnectCode('');
      loadData();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setConnecting(false); }
  };

  const respondToRequest = async (requestId, requesterId, requesterRole, relationship, accept) => {
    try {
      await supabase.from('connection_requests').update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId);

      if (accept) {
        if (requesterRole === 'doctor') {
          await supabase.from('patient_doctors').insert({ patient_id: patientRecord.id, doctor_id: requesterId, is_primary: false });
        } else if (requesterRole === 'caregiver') {
          await supabase.from('patient_caregivers').insert({ patient_id: patientRecord.id, caregiver_id: requesterId, is_primary: false });
        } else if (requesterRole === 'family') {
          await supabase.from('family_members').insert({ patient_id: patientRecord.id, family_user_id: requesterId, relationship: relationship || 'Family' });
        }
        toast.success('Connection accepted! They can now see your care information.');
      } else {
        toast.info('Request declined.');
      }
      loadData();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  const removeConnection = async (conn) => {
    if (!window.confirm(`Remove ${conn.name} from your care circle?`)) return;
    try {
      if (conn.role === 'doctor') await supabase.from('patient_doctors').delete().eq('id', conn.id);
      else if (conn.role === 'caregiver') await supabase.from('patient_caregivers').delete().eq('id', conn.id);
      else if (conn.role === 'family') await supabase.from('family_members').delete().eq('id', conn.id);
      toast.success('Connection removed');
      loadData();
    } catch { toast.error('Could not remove connection'); }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🔗 My Care Circle</h2>
        <p className="page-subtitle">Connect with your doctors, caregivers, and family</p>
      </div>

      {/* ── PATIENT VIEW ── */}
      {isPatient && (
        <>
          {/* Invite Code Card */}
          <div style={{ background:'linear-gradient(135deg,#fff9f0,#fef3c7)', border:'2px solid #fed7aa', borderRadius:24, padding:28, marginBottom:24 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>🎟️ Your Invite Code</h3>
            <p style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>
              Share this code with your doctor, caregiver, or family member so they can send you a connection request.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ fontSize:36, fontWeight:900, letterSpacing:8, color:'#c2410c', background:'white', padding:'12px 24px', borderRadius:16, border:'2px dashed #fed7aa', fontFamily:'monospace' }}>
                {inviteCode || 'Loading...'}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" onClick={copyInviteCode}>
                  {copied ? <Check size={16}/> : <Copy size={16}/>}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={regenerateCode}>
                  🔄 New Code
                </button>
              </div>
            </div>
            <p style={{ fontSize:11, color:'#9ca3af', marginTop:12 }}>
              💡 Tell your doctor/caregiver/family to open CareAssist → My Care Circle → enter this code to connect.
            </p>
          </div>

          {/* Pending Requests */}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="card mb-5" style={{ border:'2px solid #fde047' }}>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>🔔 Pending Connection Requests</h3>
              {requests.filter(r => r.status === 'pending').map(req => {
                const info = RELATION_INFO[req.requester_role] || {};
                return (
                  <div key={req.id} style={{ background:'#f9fafb', borderRadius:14, padding:16, marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:20 }}>{info.icon}</span>
                          <span style={{ fontWeight:700, fontSize:15 }}>{req.requester?.full_name}</span>
                          <span style={{ background:info.color+'20', color:info.color, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{info.label}</span>
                        </div>
                        <p style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>{req.requester?.email}</p>
                        <p style={{ fontSize:12, color:'#9ca3af' }}>Will be able to see: {info.shares}</p>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-teal btn-sm"
                          onClick={() => respondToRequest(req.id, req.requester_id, req.requester_role, req.relationship, true)}>
                          <CheckCircle size={14}/> Accept
                        </button>
                        <button className="btn btn-sm" style={{ background:'#fff1f2', color:'#9f1239', border:'none', padding:'8px 14px', borderRadius:20, cursor:'pointer', fontWeight:700 }}
                          onClick={() => respondToRequest(req.id, req.requester_id, req.requester_role, req.relationship, false)}>
                          <XCircle size={14}/> Decline
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* My Connections */}
          <div className="card mb-5">
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>👥 My Care Circle ({myConnections.length})</h3>
            {myConnections.length === 0 ? (
              <div className="empty-state" style={{ padding:24 }}>
                <div style={{ fontSize:40 }}>🔗</div>
                <p style={{ color:'#9ca3af', fontSize:14 }}>No connections yet. Share your invite code to get started!</p>
              </div>
            ) : myConnections.map((conn, i) => {
              const info = RELATION_INFO[conn.role] || {};
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:info.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {info.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{conn.name}</div>
                    <div style={{ fontSize:12, color:info.color, fontWeight:600 }}>{info.label}{conn.relationship ? ` · ${conn.relationship}` : ''}</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>{conn.email}</div>
                  </div>
                  <button onClick={() => removeConnection(conn)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', padding:6 }}>
                    <X size={16}/>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── DOCTOR / CAREGIVER / FAMILY VIEW ── */}
      {!isPatient && (
        <>
          {/* Send Connection Request */}
          <div style={{ background:'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border:'2px solid #86efac', borderRadius:24, padding:28, marginBottom:24 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>🔗 Connect to a Patient</h3>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>
              Ask your patient to share their invite code from their CareAssist app, then enter it below.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:1, minWidth:180 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Patient Invite Code</label>
                <input type="text" className="form-input" placeholder="e.g. A3X7K2"
                  value={connectCode} onChange={e => setConnectCode(e.target.value.toUpperCase())}
                  style={{ fontFamily:'monospace', fontSize:18, letterSpacing:4, textTransform:'uppercase' }}
                  maxLength={6}
                />
              </div>
              {profile?.role === 'family' && (
                <div style={{ minWidth:160 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Your Relationship</label>
                  <input type="text" className="form-input" placeholder="e.g. Son, Daughter..."
                    value={connectRelation} onChange={e => setConnectRelation(e.target.value)}
                  />
                </div>
              )}
              <button className="btn btn-teal" onClick={sendConnectionRequest} disabled={connecting || !connectCode.trim()}>
                <UserPlus size={16}/> {connecting ? 'Connecting...' : 'Send Request'}
              </button>
            </div>
          </div>

          {/* My Patients */}
          {myPatients.length > 0 && (
            <div className="card mb-5">
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>👥 My Connected Patients ({myPatients.length})</h3>
              {myPatients.map((p, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:'#fff9f0', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, color:'#f97316' }}>
                    {p.user?.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{p.user?.full_name}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>{p.age_mode} mode · {p.user?.email}</div>
                    {p.relationship && <div style={{ fontSize:12, color:'#f97316' }}>{p.relationship}</div>}
                  </div>
                  <span className="badge badge-green">Connected ✓</span>
                </div>
              ))}
            </div>
          )}

          {/* Pending sent requests */}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="card">
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>⏳ Pending Requests</h3>
              {requests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <Clock size={16} color="#f59e0b"/>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>Request to {req.patient?.user?.full_name || 'Patient'}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>Waiting for patient approval...</div>
                  </div>
                  <span className="badge badge-amber" style={{ marginLeft:'auto' }}>Pending</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
