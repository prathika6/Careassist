import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Search, ChevronLeft, Star, MapPin } from 'lucide-react';
import { format, addDays } from 'date-fns';

// More demo doctors for a richer search experience
const DEMO_DOCTORS = [
  { id:'demo1', full_name:'Arjun Mehta', specialization:'Cardiologist', hospital_name:'Heart Care Institute', hospital_address:'45 MG Road, Bangalore', city:'Bangalore', consultation_fee:800, rating:4.9, experience_years:15, bio:'Senior cardiologist with 15 years specializing in preventive cardiology and heart failure management.', photo_url:'' },
  { id:'demo2', full_name:'Sunita Rao', specialization:'Neurologist', hospital_name:'Neuro Plus Hospital', hospital_address:'12 Jayanagar, Bangalore', city:'Bangalore', consultation_fee:1000, rating:4.7, experience_years:12, bio:'Expert neurologist treating stroke, epilepsy, and movement disorders with compassionate care.', photo_url:'' },
  { id:'demo3', full_name:'Vikram Nair', specialization:'Orthopedic', hospital_name:'Bone & Joint Clinic', hospital_address:'78 Koramangala, Bangalore', city:'Bangalore', consultation_fee:600, rating:4.6, experience_years:10, bio:'Orthopedic surgeon specializing in joint replacement and sports injuries.', photo_url:'' },
  { id:'demo4', full_name:'Meena Krishnan', specialization:'Pediatrician', hospital_name:'Child Care Center', hospital_address:'23 Indiranagar, Bangalore', city:'Bangalore', consultation_fee:400, rating:4.9, experience_years:8, bio:'Warm and caring pediatrician dedicated to child health and development.', photo_url:'' },
  { id:'demo5', full_name:'Rahul Sharma', specialization:'Diabetologist', hospital_name:'Diabetes Care Clinic', hospital_address:'56 HSR Layout, Bangalore', city:'Bangalore', consultation_fee:700, rating:4.8, experience_years:14, bio:'Diabetes specialist helping patients manage blood sugar through lifestyle and medication.', photo_url:'' },
  { id:'demo6', full_name:'Deepa Thomas', specialization:'Dermatologist', hospital_name:'Skin & Hair Clinic', hospital_address:'34 Whitefield, Bangalore', city:'Bangalore', consultation_fee:500, rating:4.5, experience_years:9, bio:'Experienced dermatologist treating skin conditions, hair loss and cosmetic concerns.', photo_url:'' },
  { id:'demo7', full_name:'Priya Nair', specialization:'General Physician', hospital_name:'City Care Hospital', hospital_address:'12 MG Road, Bangalore', city:'Bangalore', consultation_fee:500, rating:4.8, experience_years:10, bio:'Compassionate general physician with 10 years of experience in patient-centered care.', photo_url:'' },
  { id:'demo8', full_name:'Anand Kumar', specialization:'Psychiatrist', hospital_name:'Mind Wellness Center', hospital_address:'90 JP Nagar, Bangalore', city:'Bangalore', consultation_fee:900, rating:4.7, experience_years:13, bio:'Mental health specialist helping patients with depression, anxiety, and emotional wellness.', photo_url:'' },
  { id:'demo9', full_name:'Lakshmi Iyer', specialization:'Gynecologist', hospital_name:"Women's Health Clinic", hospital_address:'67 Marathahalli, Bangalore', city:'Bangalore', consultation_fee:750, rating:4.8, experience_years:16, bio:'Senior gynecologist dedicated to women\'s health across all life stages.', photo_url:'' },
  { id:'demo10', full_name:'Suresh Pillai', specialization:'ENT Specialist', hospital_name:'ENT Care Hospital', hospital_address:'11 Rajajinagar, Bangalore', city:'Bangalore', consultation_fee:550, rating:4.6, experience_years:11, bio:'Experienced ENT specialist treating ear, nose, and throat conditions with precision.', photo_url:'' },
];

const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

export default function DoctorSearch() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [allDoctors, setAllDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [reason, setReason] = useState('');
  const [consultType, setConsultType] = useState('offline');
  const [urgency, setUrgency] = useState('normal');
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState('list');

  useEffect(() => { loadDoctors(); }, []);

  useEffect(() => {
    let f = allDoctors;
    if (search) f = f.filter(d => d.full_name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()) || d.hospital_name?.toLowerCase().includes(search.toLowerCase()));
    if (filterSpec) f = f.filter(d => d.specialization === filterSpec);
    if (filterCity) f = f.filter(d => d.city === filterCity);
    setFiltered(f);
  }, [search, filterSpec, filterCity, allDoctors]);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      // Merge real doctors from DB with demo doctors
      const { data: dbDocs } = await supabase.from('user_profiles')
        .select('*, profile:doctor_profiles(*)').eq('role','doctor');

      const realDoctors = (dbDocs || []).map(d => ({
        id: d.id,
        full_name: d.full_name,
        specialization: d.profile?.specialization || 'General Physician',
        hospital_name: d.profile?.hospital_name || 'CareAssist Clinic',
        hospital_address: d.profile?.hospital_address || '',
        city: d.profile?.city || 'Bangalore',
        consultation_fee: d.profile?.consultation_fee || 500,
        rating: d.profile?.rating || 4.5,
        experience_years: d.profile?.experience_years || 5,
        bio: d.profile?.bio || '',
        photo_url: d.profile?.photo_url || '',
        isReal: true,
      }));

      // Add demo doctors that don't duplicate real ones
      const demoToAdd = DEMO_DOCTORS.filter(d => !realDoctors.some(r => r.full_name === d.full_name));
      const combined = [...realDoctors, ...demoToAdd];
      setAllDoctors(combined);
      setFiltered(combined);
    } catch(err) { console.error(err); setAllDoctors(DEMO_DOCTORS); setFiltered(DEMO_DOCTORS); }
    finally { setLoading(false); }
  };

  const selectDoctor = async (doc) => {
    setSelectedDoctor(doc);
    setStep('doctor');
    setSelectedDate('');
    setSelectedSlot('');
  };

  const selectDate = async (date) => {
    setSelectedDate(date);
    setSelectedSlot('');
    if (selectedDoctor?.isReal) {
      const { data } = await supabase.from('appointments')
        .select('appointment_time').eq('doctor_id', selectedDoctor.id).eq('appointment_date', date).in('status',['pending','accepted']);
      setBookedSlots((data||[]).map(a=>a.appointment_time?.slice(0,5)));
    } else {
      // For demo doctors, randomly mark some slots as booked
      const seed = date.charCodeAt(date.length-1) + selectedDoctor.id.charCodeAt(0);
      setBookedSlots(TIME_SLOTS.filter((_,i) => (i + seed) % 4 === 0));
    }
  };

  const bookAppointment = async () => {
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
    if (!patientRecord?.id) { toast.error('Patient record not found'); return; }
    setBooking(true);
    try {
      if (selectedDoctor.isReal) {
        const { error } = await supabase.from('appointments').insert({
          patient_id: patientRecord.id, doctor_id: selectedDoctor.id,
          requested_by: profile.id, appointment_date: selectedDate,
          appointment_time: selectedSlot + ':00', reason: reason||null,
          urgency_level: urgency, consultation_type: consultType, status:'pending',
        });
        if (error) throw error;
      } else {
        // Demo booking — store as appointment with a note
        await supabase.from('appointments').insert({
          patient_id: patientRecord.id, doctor_id: null,
          requested_by: profile.id, appointment_date: selectedDate,
          appointment_time: selectedSlot + ':00', reason: reason ? `[Dr. ${selectedDoctor.full_name} - Demo] ${reason}` : `Demo appointment with Dr. ${selectedDoctor.full_name}`,
          urgency_level: urgency, consultation_type: consultType, status:'accepted',
        });
      }
      toast.success('Appointment booked successfully! 📅');
      setStep('confirm');
    } catch(err) { toast.error(err.message); }
    finally { setBooking(false); }
  };

  const SPECS = [...new Set(allDoctors.map(d=>d.specialization).filter(Boolean))].sort();
  const CITIES = [...new Set(allDoctors.map(d=>d.city).filter(Boolean))].sort();
  const dateOptions = Array.from({length:7},(_,i)=>{ const d=addDays(new Date(),i+1); return {value:format(d,'yyyy-MM-dd'),label:format(d,'EEE, MMM d')}; });

  if (step==='confirm') return (
    <div>
      <div className="page-header"><h2 className="page-title">📅 Appointment Booked!</h2></div>
      <div className="card" style={{textAlign:'center',padding:48}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <h3 style={{fontSize:22,fontWeight:700,marginBottom:8}}>You're all set!</h3>
        <p style={{color:'#6b7280',fontSize:15,marginBottom:6}}>Appointment with Dr. {selectedDoctor?.full_name}</p>
        <p style={{color:'#9ca3af',fontSize:14,marginBottom:4}}>{selectedDate} at {selectedSlot}</p>
        <p style={{color:'#0d9488',fontSize:13,marginBottom:24,fontWeight:600}}>{consultType==='online'?'💻 Online Consultation':'🏥 In-person Visit'}</p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button className="btn btn-outline" onClick={()=>{setStep('list');setSelectedDoctor(null);setSelectedSlot('');setReason('');}}>Book Another</button>
          <button className="btn btn-teal" onClick={()=>setStep('list')}>Back to Search</button>
        </div>
      </div>
    </div>
  );

  if (step==='book' && selectedDoctor) return (
    <div>
      <button className="btn btn-ghost mb-4" onClick={()=>setStep('doctor')}><ChevronLeft size={16}/> Back</button>
      <div className="page-header"><h2 className="page-title">📅 Book Appointment</h2><p className="page-subtitle">with Dr. {selectedDoctor.full_name}</p></div>
      <div className="card">
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>1. Select Date</h3>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24}}>
          {dateOptions.map(d=>(
            <button key={d.value} onClick={()=>selectDate(d.value)} style={{padding:'10px 18px',borderRadius:14,border:'2px solid',fontWeight:700,fontSize:13,cursor:'pointer',borderColor:selectedDate===d.value?'#0ea5e9':'#e5e7eb',background:selectedDate===d.value?'#eff6ff':'white',color:selectedDate===d.value?'#0369a1':'#374151'}}>
              {d.label}
            </button>
          ))}
        </div>

        {selectedDate && (
          <>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>2. Select Time Slot</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:10,marginBottom:24}}>
              {TIME_SLOTS.map(slot=>{
                const isBooked = bookedSlots.includes(slot);
                const isSelected = selectedSlot === slot;
                return (
                  <button key={slot} disabled={isBooked} onClick={()=>setSelectedSlot(slot)} style={{padding:'10px 6px',borderRadius:12,border:'2px solid',fontWeight:700,fontSize:13,cursor:isBooked?'not-allowed':'pointer',textAlign:'center',borderColor:isBooked?'#f3f4f6':isSelected?'#0ea5e9':'#e5e7eb',background:isBooked?'#f3f4f6':isSelected?'#eff6ff':'white',color:isBooked?'#d1d5db':isSelected?'#0369a1':'#374151',opacity:isBooked?0.5:1}}>
                    {isBooked?'✗':slot}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>3. Details</h3>
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
          {booking?'Booking...':'📅 Confirm Appointment'}
        </button>
      </div>
    </div>
  );

  if (step==='doctor' && selectedDoctor) return (
    <div>
      <button className="btn btn-ghost mb-4" onClick={()=>setStep('list')}><ChevronLeft size={16}/> Back to Search</button>
      <div className="card mb-4">
        <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:20}}>
          <div style={{width:80,height:80,borderRadius:20,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,flexShrink:0,overflow:'hidden'}}>
            {selectedDoctor.photo_url?<img src={selectedDoctor.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👨‍⚕️'}
          </div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Dr. {selectedDoctor.full_name}</h2>
            <div style={{fontSize:15,color:'#0ea5e9',fontWeight:700,marginBottom:6}}>{selectedDoctor.specialization}</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:13,color:'#6b7280'}}>
              <span>🏥 {selectedDoctor.hospital_name}</span>
              <span><MapPin size={12}/> {selectedDoctor.city}</span>
              <span>🏆 {selectedDoctor.experience_years} yrs exp</span>
            </div>
            <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
              <span style={{background:'#fef9c3',color:'#713f12',padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:700}}>⭐ {selectedDoctor.rating}/5</span>
              <span style={{background:'#f0fdf4',color:'#166534',padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:700}}>💰 ₹{selectedDoctor.consultation_fee}</span>
            </div>
          </div>
        </div>
        {selectedDoctor.bio && <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:16}}>{selectedDoctor.bio}</p>}
        {selectedDoctor.hospital_address && <div style={{fontSize:13,color:'#9ca3af',marginBottom:20}}>📍 {selectedDoctor.hospital_address}</div>}
        <button className="btn btn-primary btn-lg w-full" onClick={()=>setStep('book')}>
          📅 Book Appointment with Dr. {selectedDoctor.full_name?.split(' ')[0]}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🔍 Find a Doctor</h2>
        <p className="page-subtitle">{allDoctors.length} doctors available · Search, filter, and book</p>
      </div>

      <div className="card mb-5">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div style={{position:'relative'}}>
            <Search size={16} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9ca3af'}}/>
            <input className="form-input" placeholder="Search doctor or specialty..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:40}}/>
          </div>
          <select className="form-input form-select" value={filterSpec} onChange={e=>setFilterSpec(e.target.value)}>
            <option value="">All Specializations ({SPECS.length})</option>
            {SPECS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input form-select" value={filterCity} onChange={e=>setFilterCity(e.target.value)}>
            <option value="">All Cities</option>
            {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(search||filterSpec||filterCity) && (
          <div style={{marginTop:12,fontSize:13,color:'#9ca3af'}}>
            Showing {filtered.length} of {allDoctors.length} doctors
            <button onClick={()=>{setSearch('');setFilterSpec('');setFilterCity('');}} style={{marginLeft:12,background:'none',border:'none',color:'#f97316',fontWeight:700,cursor:'pointer',fontSize:13}}>Clear filters</button>
          </div>
        )}
      </div>

      {loading ? <div className="loading-spinner"/> : filtered.length===0 ? (
        <div className="card empty-state"><div style={{fontSize:48}}>👨‍⚕️</div><p className="empty-state-text">No doctors found. Try a different search.</p></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20}}>
          {filtered.map(doc=>(
            <div key={doc.id} className="card" style={{cursor:'pointer'}} onClick={()=>selectDoctor(doc)}>
              <div style={{display:'flex',gap:14,marginBottom:14}}>
                <div style={{width:56,height:56,borderRadius:16,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0,overflow:'hidden'}}>
                  {doc.photo_url?<img src={doc.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👨‍⚕️'}
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:15}}>Dr. {doc.full_name}</div>
                  <div style={{fontSize:13,color:'#0ea5e9',fontWeight:700}}>{doc.specialization}</div>
                  <div style={{fontSize:11,color:'#9ca3af'}}>🏥 {doc.hospital_name}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                <span className="badge badge-amber">⭐ {doc.rating}</span>
                <span className="badge badge-sky">{doc.experience_years} yrs</span>
                <span className="badge badge-teal">{doc.city}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontWeight:800,color:'#166534',fontSize:15}}>₹{doc.consultation_fee}</span>
                <button className="btn btn-teal btn-sm">Book Now →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
