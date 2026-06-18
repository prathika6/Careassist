import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Search, Star, MapPin, Clock, DollarSign, X, ChevronLeft } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function DoctorSearch() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [consultType, setConsultType] = useState('offline');
  const [urgency, setUrgency] = useState('normal');
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState('list'); // list | doctor | book | confirm

  useEffect(() => { loadDoctors(); }, []);

  useEffect(() => {
    let f = doctors;
    if (search) f = f.filter(d => d.full_name?.toLowerCase().includes(search.toLowerCase()) || d.profile?.specialization?.toLowerCase().includes(search.toLowerCase()));
    if (filterSpec) f = f.filter(d => d.profile?.specialization?.toLowerCase().includes(filterSpec.toLowerCase()));
    if (filterCity) f = f.filter(d => d.profile?.city?.toLowerCase().includes(filterCity.toLowerCase()));
    setFiltered(f);
  }, [search, filterSpec, filterCity, doctors]);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('user_profiles')
        .select('*, profile:doctor_profiles(*)')
        .eq('role', 'doctor');
      setDoctors(data || []);
      setFiltered(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadSlots = async (doctorId, date) => {
    setSelectedDate(date);
    // Generate default slots if none exist
    const { data: existing } = await supabase.from('doctor_slots')
      .select('*').eq('doctor_id', doctorId).eq('slot_date', date);

    if (existing?.length === 0) {
      // Auto-generate slots 9am–5pm every 30 min
      const generatedSlots = [];
      for (let h = 9; h < 17; h++) {
        for (let m = 0; m < 60; m += 30) {
          const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
          generatedSlots.push({ doctor_id: doctorId, slot_date: date, slot_time: time, is_booked: false });
        }
      }
      await supabase.from('doctor_slots').insert(generatedSlots).select();
    }

    const { data: freshSlots } = await supabase.from('doctor_slots')
      .select('*').eq('doctor_id', doctorId).eq('slot_date', date).order('slot_time');
    setSlots(freshSlots || []);
  };

  const bookAppointment = async () => {
    if (!selectedSlot || !patientRecord?.id) { toast.error('Please select a time slot'); return; }
    setBooking(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: patientRecord.id,
        doctor_id: selectedDoctor.id,
        requested_by: profile.id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        reason: reason || null,
        urgency_level: urgency,
        consultation_type: consultType,
        status: 'pending',
      });
      if (error) throw error;

      // Mark slot as booked
      await supabase.from('doctor_slots').update({ is_booked: true }).eq('doctor_id', selectedDoctor.id).eq('slot_date', selectedDate).eq('slot_time', selectedSlot);

      toast.success('Appointment request sent! The doctor will confirm shortly. 📅');
      setStep('confirm');
    } catch (err) { toast.error(err.message); }
    finally { setBooking(false); }
  };

  const SPECS = [...new Set(doctors.map(d => d.profile?.specialization).filter(Boolean))];
  const CITIES = [...new Set(doctors.map(d => d.profile?.city).filter(Boolean))];

  // Date options: next 7 days
  const dateOptions = Array.from({length:7},(_,i) => {
    const d = addDays(new Date(), i+1);
    return { value: format(d,'yyyy-MM-dd'), label: format(d,'EEE, MMM d') };
  });

  if (step === 'confirm') return (
    <div>
      <div className="page-header"><h2 className="page-title">📅 Appointment Requested!</h2></div>
      <div className="card" style={{ textAlign:'center', padding:48 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
        <h3 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Request Sent!</h3>
        <p style={{ color:'#6b7280', fontSize:15, marginBottom:8 }}>Your appointment with Dr. {selectedDoctor?.full_name} on {selectedDate} at {selectedSlot?.slice(0,5)} has been requested.</p>
        <p style={{ color:'#9ca3af', fontSize:13, marginBottom:24 }}>The doctor will accept or reschedule your appointment. You will be notified.</p>
        <button className="btn btn-primary" onClick={() => { setStep('list'); setSelectedDoctor(null); setSelectedSlot(''); setReason(''); }}>
          Book Another
        </button>
      </div>
    </div>
  );

  if (step === 'book' && selectedDoctor) return (
    <div>
      <button className="btn btn-ghost mb-4" onClick={() => setStep('doctor')}><ChevronLeft size={16}/> Back to Doctor</button>
      <div className="page-header">
        <h2 className="page-title">📅 Book Appointment</h2>
        <p className="page-subtitle">with Dr. {selectedDoctor.full_name}</p>
      </div>
      <div className="card">
        {/* Date Selection */}
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>1. Select Date</h3>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24 }}>
          {dateOptions.map(d => (
            <button key={d.value} onClick={() => loadSlots(selectedDoctor.id, d.value)}
              style={{ padding:'10px 18px', borderRadius:14, border:'2px solid', fontWeight:700, fontSize:13, cursor:'pointer',
                borderColor:selectedDate===d.value?'#0ea5e9':'#e5e7eb',
                background:selectedDate===d.value?'#eff6ff':'white',
                color:selectedDate===d.value?'#0369a1':'#374151' }}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>2. Select Time Slot</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:10, marginBottom:24 }}>
              {slots.map(slot => (
                <button key={slot.id} disabled={slot.is_booked}
                  onClick={() => setSelectedSlot(slot.slot_time)}
                  style={{ padding:'10px 8px', borderRadius:12, border:'2px solid', fontWeight:700, fontSize:13, cursor:slot.is_booked?'not-allowed':'pointer', textAlign:'center',
                    borderColor:slot.is_booked?'#f3f4f6':selectedSlot===slot.slot_time?'#0ea5e9':'#e5e7eb',
                    background:slot.is_booked?'#f3f4f6':selectedSlot===slot.slot_time?'#eff6ff':'white',
                    color:slot.is_booked?'#d1d5db':selectedSlot===slot.slot_time?'#0369a1':'#374151',
                    opacity:slot.is_booked?0.5:1 }}>
                  {slot.is_booked ? '✗' : slot.slot_time.slice(0,5)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Details */}
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>3. Appointment Details</h3>
        <div className="form-group">
          <label className="form-label">Reason for Visit</label>
          <textarea className="form-input form-textarea" rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe your concern..."/>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Consultation Type</label>
            <select className="form-input form-select" value={consultType} onChange={e=>setConsultType(e.target.value)}>
              <option value="offline">In-person 🏥</option>
              <option value="online">Online 💻</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Urgency</label>
            <select className="form-input form-select" value={urgency} onChange={e=>setUrgency(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary w-full btn-lg" onClick={bookAppointment} disabled={booking||!selectedSlot||!selectedDate}>
          {booking ? 'Booking...' : '📅 Confirm Appointment Request'}
        </button>
      </div>
    </div>
  );

  if (step === 'doctor' && selectedDoctor) {
    const p = selectedDoctor.profile;
    return (
      <div>
        <button className="btn btn-ghost mb-4" onClick={()=>setStep('list')}><ChevronLeft size={16}/> Back to Search</button>
        <div className="card mb-4">
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:20 }}>
            <div style={{ width:80, height:80, borderRadius:20, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, flexShrink:0, overflow:'hidden' }}>
              {p?.photo_url ? <img src={p.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👨‍⚕️'}
            </div>
            <div style={{ flex:1 }}>
              <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Dr. {selectedDoctor.full_name}</h2>
              <div style={{ fontSize:15, color:'#0ea5e9', fontWeight:700, marginBottom:4 }}>{p?.specialization || 'General Physician'}</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:13, color:'#6b7280' }}>
                {p?.experience_years && <span>🏆 {p.experience_years} years exp.</span>}
                {p?.hospital_name && <span>🏥 {p.hospital_name}</span>}
                {p?.city && <span><MapPin size={12}/> {p.city}</span>}
              </div>
              <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
                {p?.rating && <span style={{ background:'#fef9c3', color:'#713f12', padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:700 }}>⭐ {p.rating}/5</span>}
                {p?.consultation_fee && <span style={{ background:'#f0fdf4', color:'#166534', padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:700 }}>💰 ₹{p.consultation_fee}</span>}
              </div>
            </div>
          </div>
          {p?.bio && <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.7, marginBottom:16 }}>{p.bio}</p>}
          {p?.hospital_address && <div style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>📍 {p.hospital_address}</div>}
          <button className="btn btn-primary btn-lg w-full" onClick={()=>setStep('book')}>
            📅 Book Appointment with Dr. {selectedDoctor.full_name?.split(' ')[0]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🔍 Find a Doctor</h2>
        <p className="page-subtitle">Search, filter, and book your appointment</p>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div style={{ position:'relative' }}>
            <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}/>
            <input className="form-input" placeholder="Search doctor or specialty..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:40 }}/>
          </div>
          <select className="form-input form-select" value={filterSpec} onChange={e=>setFilterSpec(e.target.value)}>
            <option value="">All Specializations</option>
            {SPECS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input form-select" value={filterCity} onChange={e=>setFilterCity(e.target.value)}>
            <option value="">All Cities</option>
            {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Doctor Cards */}
      {loading ? <div className="loading-spinner"/> : filtered.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize:48 }}>👨‍⚕️</div>
          <p className="empty-state-text">No doctors found. Try a different search.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20 }}>
          {filtered.map(doc => {
            const p = doc.profile;
            return (
              <div key={doc.id} className="card" style={{ cursor:'pointer', transition:'all 0.2s' }}
                onClick={()=>{setSelectedDoctor(doc);setStep('doctor');}}>
                <div style={{ display:'flex', gap:14, marginBottom:14 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0, overflow:'hidden' }}>
                    {p?.photo_url ? <img src={p.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👨‍⚕️'}
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>Dr. {doc.full_name}</div>
                    <div style={{ fontSize:13, color:'#0ea5e9', fontWeight:700 }}>{p?.specialization || 'General Physician'}</div>
                    {p?.hospital_name && <div style={{ fontSize:12, color:'#9ca3af' }}>🏥 {p.hospital_name}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                  {p?.rating && <span className="badge badge-amber">⭐ {p.rating}</span>}
                  {p?.experience_years && <span className="badge badge-sky">{p.experience_years} yrs exp</span>}
                  {p?.city && <span className="badge badge-teal">{p.city}</span>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  {p?.consultation_fee ? <span style={{ fontWeight:800, color:'#166534', fontSize:15 }}>₹{p.consultation_fee}</span> : <span/>}
                  <button className="btn btn-teal btn-sm">Book Now →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
