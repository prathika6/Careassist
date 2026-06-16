import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState({ users:0, patients:0, doctors:0, caregivers:0, alerts:0, appointments:0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ patient_id:'', doctor_id:'', caregiver_id:'', family_id:'', relationship:'', type:'doctor' });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ loadData(); },[]);

  const loadData = async()=>{
    setLoading(true);
    try {
      const { data: allUsers } = await supabase.from('user_profiles').select('*').order('created_at',{ascending:false});
      setUsers(allUsers||[]);
      const { data: pts } = await supabase.from('patients').select('id');
      const { data: alts } = await supabase.from('alerts').select('id').eq('is_resolved',false);
      const { data: appts } = await supabase.from('appointments').select('id');
      const byRole = (allUsers||[]).reduce((acc,u)=>{ acc[u.role]=(acc[u.role]||0)+1; return acc; },{});
      setStats({ users:allUsers?.length||0, patients:pts?.length||0, doctors:byRole.doctor||0, caregivers:byRole.caregiver||0, alerts:alts?.length||0, appointments:appts?.length||0 });
    } catch(err){ console.error(err); }
    finally { setLoading(false); }
  };

  const assignRelationship = async()=>{
    if(!assignForm.patient_id){ toast.error('Select a patient'); return; }
    setSaving(true);
    try {
      if(assignForm.type==='doctor'&&assignForm.doctor_id)
        await supabase.from('patient_doctors').insert({ patient_id:assignForm.patient_id, doctor_id:assignForm.doctor_id, is_primary:true });
      else if(assignForm.type==='caregiver'&&assignForm.caregiver_id)
        await supabase.from('patient_caregivers').insert({ patient_id:assignForm.patient_id, caregiver_id:assignForm.caregiver_id, is_primary:true });
      else if(assignForm.type==='family'&&assignForm.family_id)
        await supabase.from('family_members').insert({ patient_id:assignForm.patient_id, family_user_id:assignForm.family_id, relationship:assignForm.relationship||'Family' });
      toast.success('Assignment saved!');
      setShowAssign(false);
      setAssignForm({ patient_id:'', doctor_id:'', caregiver_id:'', family_id:'', relationship:'', type:'doctor' });
    } catch(err){ toast.error('Failed: '+err.message); }
    finally { setSaving(false); }
  };

  const updateRole = async(userId, newRole)=>{
    try {
      await supabase.from('user_profiles').update({role:newRole}).eq('id',userId);
      toast.success('Role updated');
      loadData();
    } catch { toast.error('Could not update role'); }
  };

  const RC = { patient:'#f97316', caregiver:'#0d9488', doctor:'#0ea5e9', family:'#8b5cf6', admin:'#374151' };
  const patients = users.filter(u=>u.role==='patient');
  const doctors = users.filter(u=>u.role==='doctor');
  const caregivers = users.filter(u=>u.role==='caregiver');
  const family = users.filter(u=>u.role==='family');

  if(loading) return <div className="loading-spinner"/>;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h2 className="page-title">⚙️ Admin Dashboard</h2><p className="page-subtitle">Manage users, roles, and system assignments</p></div>
          <button className="btn btn-primary" onClick={()=>setShowAssign(true)}><Plus size={16}/> Assign Relationship</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
        {[
          {label:'Total Users',value:stats.users,icon:'👥',color:'#6b7280'},
          {label:'Patients',value:stats.patients,icon:'💊',color:'#f97316'},
          {label:'Doctors',value:stats.doctors,icon:'🩺',color:'#0ea5e9'},
          {label:'Caregivers',value:stats.caregivers,icon:'🤝',color:'#0d9488'},
          {label:'Active Alerts',value:stats.alerts,icon:'🔔',color:'#ef4444'},
          {label:'Appointments',value:stats.appointments,icon:'📅',color:'#8b5cf6'},
        ].map(s=>(
          <div key={s.label} className="card" style={{textAlign:'center',padding:20}}>
            <div style={{fontSize:26,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:12,color:'#9ca3af',fontWeight:700}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>👥 All Users</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Change Role</th></tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.full_name}</td>
                  <td style={{fontSize:13,color:'#9ca3af'}}>{u.email}</td>
                  <td><span style={{background:RC[u.role]+'20',color:RC[u.role],padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>{u.role}</span></td>
                  <td style={{fontSize:12,color:'#9ca3af'}}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.id!==profile.id&&(
                      <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} style={{padding:'5px 10px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:12,cursor:'pointer'}}>
                        {['patient','caregiver','doctor','family','admin'].map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAssign&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAssign(false)}>
          <div className="modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{marginBottom:0}}>🔗 Assign Relationship</h3>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowAssign(false)}><X size={16}/></button>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input form-select" value={assignForm.type} onChange={e=>setAssignForm(p=>({...p,type:e.target.value}))}>
                <option value="doctor">Doctor → Patient</option>
                <option value="caregiver">Caregiver → Patient</option>
                <option value="family">Family Member → Patient</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className="form-input form-select" value={assignForm.patient_id} onChange={e=>setAssignForm(p=>({...p,patient_id:e.target.value}))}>
                <option value="">Select patient...</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            {assignForm.type==='doctor'&&<div className="form-group"><label className="form-label">Doctor *</label><select className="form-input form-select" value={assignForm.doctor_id} onChange={e=>setAssignForm(p=>({...p,doctor_id:e.target.value}))}><option value="">Select doctor...</option>{doctors.map(d=><option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}</select></div>}
            {assignForm.type==='caregiver'&&<div className="form-group"><label className="form-label">Caregiver *</label><select className="form-input form-select" value={assignForm.caregiver_id} onChange={e=>setAssignForm(p=>({...p,caregiver_id:e.target.value}))}><option value="">Select caregiver...</option>{caregivers.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>}
            {assignForm.type==='family'&&<><div className="form-group"><label className="form-label">Family Member *</label><select className="form-input form-select" value={assignForm.family_id} onChange={e=>setAssignForm(p=>({...p,family_id:e.target.value}))}><option value="">Select family member...</option>{family.map(f=><option key={f.id} value={f.id}>{f.full_name}</option>)}</select></div><div className="form-group"><label className="form-label">Relationship</label><input type="text" className="form-input" placeholder="e.g. Son, Daughter, Spouse" value={assignForm.relationship} onChange={e=>setAssignForm(p=>({...p,relationship:e.target.value}))}/></div></>}
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-outline flex-1" onClick={()=>setShowAssign(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={assignRelationship} disabled={saving}>{saving?'Saving...':'🔗 Save Assignment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
