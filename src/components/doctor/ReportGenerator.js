import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportGenerator() {
  const { profile } = useAuth();
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [reportType, setReportType] = useState('visit');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ title:'', content:'', summary_for_patient:'', care_instructions:'' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: asgn } = await supabase.from('patient_doctors')
      .select('patient:patient_id(id, user:user_id(full_name))').eq('doctor_id', profile.id);
    setPatients(asgn?.map(a=>a.patient).filter(Boolean)||[]);

    const { data: rpts } = await supabase.from('doctor_reports')
      .select('*, patient:patient_id(user:user_id(full_name))').eq('doctor_id', profile.id)
      .order('created_at',{ascending:false}).limit(20);
    setReports(rpts||[]);
  };

  const REPORT_TYPES = [
    { value:'visit',       label:'📋 Visit Report' },
    { value:'monthly',     label:'📊 Monthly Health Report' },
    { value:'prescription',label:'💊 Prescription Summary' },
    { value:'progress',    label:'📈 Progress Report' },
  ];

  const generateReport = async () => {
    if (!selectedPatient) { toast.error('Select a patient'); return; }
    if (!form.title.trim()) { toast.error('Add a report title'); return; }
    setGenerating(true);
    try {
      // Auto-fetch patient data for report
      const { data: healthRecords } = await supabase.from('health_records')
        .select('*').eq('patient_id', selectedPatient)
        .order('recorded_at',{ascending:false}).limit(10);
      const { data: prescriptions } = await supabase.from('prescriptions')
        .select('*, medicines:medicine_reminders(*)').eq('patient_id', selectedPatient).eq('is_active', true);
      const { data: appointments } = await supabase.from('appointments')
        .select('*').eq('patient_id', selectedPatient).eq('doctor_id', profile.id)
        .order('appointment_date',{ascending:false}).limit(5);

      // Build auto-content if not provided
      let autoContent = form.content;
      if (!autoContent) {
        const latestVitals = healthRecords?.[0];
        autoContent = `Report Type: ${reportType}\nDate: ${format(new Date(),'MMMM d, yyyy')}\n\n`;
        if (latestVitals) {
          autoContent += `Latest Vitals (${format(new Date(latestVitals.recorded_at),'MMM d')}):\n`;
          if (latestVitals.bp_systolic) autoContent += `• BP: ${latestVitals.bp_systolic}/${latestVitals.bp_diastolic} mmHg\n`;
          if (latestVitals.oxygen_level) autoContent += `• Oxygen: ${latestVitals.oxygen_level}%\n`;
          if (latestVitals.heart_rate) autoContent += `• Heart Rate: ${latestVitals.heart_rate} bpm\n`;
          if (latestVitals.temperature) autoContent += `• Temperature: ${latestVitals.temperature}°C\n`;
        }
        if (prescriptions?.length) {
          autoContent += `\nActive Prescriptions:\n`;
          prescriptions.forEach(p => { autoContent += `• ${p.diagnosis}\n`; });
        }
        autoContent += `\nDoctor Notes:\n${form.content || '(Add notes here)'}`;
      }

      const { error } = await supabase.from('doctor_reports').insert({
        patient_id: selectedPatient, doctor_id: profile.id,
        report_type: reportType, title: form.title,
        content: autoContent,
        summary_for_patient: form.summary_for_patient || 'Your health is being monitored by your doctor. Please follow the prescribed care plan.',
        care_instructions: form.care_instructions || null,
      });
      if (error) throw error;
      toast.success('Report generated and shared with patient! 📋');
      setForm({ title:'', content:'', summary_for_patient:'', care_instructions:'' });
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setGenerating(false); }
  };

  const downloadReport = (report) => {
    const content = `
CAREASSIST MEDICAL REPORT
========================
Title: ${report.title}
Date: ${format(new Date(report.created_at), 'MMMM d, yyyy')}
Type: ${report.report_type}
Patient: ${report.patient?.user?.full_name}

CLINICAL NOTES:
${report.content || 'No clinical notes'}

PATIENT SUMMARY:
${report.summary_for_patient || 'No summary'}

CARE INSTRUCTIONS:
${report.care_instructions || 'No special instructions'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${report.title.replace(/\s+/g,'-')}.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">📋 Report Generator</h2>
        <p className="page-subtitle">Generate and share reports with patients and family</p>
      </div>

      {/* Generator */}
      <div className="card mb-5">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>✏️ Create New Report</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Patient *</label>
            <select className="form-input form-select" value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)}>
              <option value="">Select patient...</option>
              {patients.map(p=><option key={p.id} value={p.id}>{p.user?.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <select className="form-input form-select" value={reportType} onChange={e=>setReportType(e.target.value)}>
              {REPORT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Report Title *</label>
          <input type="text" className="form-input" placeholder="e.g. Monthly Progress Report — June 2026" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">Clinical Notes (optional — auto-generated from records if empty)</label>
          <textarea className="form-input form-textarea" rows={3} placeholder="Doctor's detailed observations..." value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">Patient-Friendly Summary <span style={{ color:'#9ca3af', fontSize:12 }}>(shown to patient in gentle language)</span></label>
          <textarea className="form-input form-textarea" rows={2} placeholder="Your health is progressing well. Continue the prescribed plan..." value={form.summary_for_patient} onChange={e=>setForm(p=>({...p,summary_for_patient:e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">Care Instructions</label>
          <textarea className="form-input form-textarea" rows={2} placeholder="Rest well, drink plenty of fluids, avoid..." value={form.care_instructions} onChange={e=>setForm(p=>({...p,care_instructions:e.target.value}))}/>
        </div>
        <button className="btn btn-primary btn-lg" onClick={generateReport} disabled={generating}>
          {generating ? 'Generating...' : '📋 Generate & Share Report'}
        </button>
      </div>

      {/* Past Reports */}
      <div className="card">
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📁 Generated Reports</h3>
        {reports.length === 0 ? (
          <div className="empty-state" style={{ padding:24 }}><div style={{ fontSize:40 }}>📋</div><p className="empty-state-text">No reports generated yet</p></div>
        ) : reports.map(r => (
          <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📋</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{r.title}</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                {r.patient?.user?.full_name} · {r.report_type} · {format(new Date(r.created_at),'MMM d, yyyy')}
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => downloadReport(r)}>
              <Download size={14}/> Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
