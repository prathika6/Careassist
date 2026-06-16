import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Eye, EyeOff, Heart } from 'lucide-react';

const ROLES = [
  { value: 'patient', label: '💊 Patient', desc: 'I am receiving care' },
  { value: 'caregiver', label: '🤝 Caregiver', desc: 'I provide daily care' },
  { value: 'doctor', label: '🩺 Doctor', desc: 'I am a medical professional' },
  { value: 'family', label: '❤️ Family Member', desc: 'I support a loved one' },
  { value: 'admin', label: '⚙️ Admin', desc: 'System administrator' },
];

const AGE_MODES = [
  { value: 'child', label: '🌟 Child Mode', desc: 'Under 18' },
  { value: 'adult', label: '🌿 Adult Mode', desc: '18–60 years' },
  { value: 'elder', label: '🌸 Elder Mode', desc: '60+ years' },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'patient',
    phone: '',
    gender: '',
    dateOfBirth: '',
    ageMode: 'adult',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(form.email, form.password);
        toast.success('Welcome back! 💙');
      } else {
        if (!form.fullName.trim()) throw new Error('Please enter your full name');
        await signUp(form.email, form.password, form);
        toast.success('Account created! Please check your email to confirm, then sign in.');
        setIsLogin(true);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Quick demo login
  const demoLogins = [
    { label: 'Patient Demo', email: 'patient@demo.com', password: 'Demo@1234' },
    { label: 'Caregiver Demo', email: 'caregiver@demo.com', password: 'Demo@1234' },
    { label: 'Doctor Demo', email: 'doctor@demo.com', password: 'Demo@1234' },
    { label: 'Family Demo', email: 'family@demo.com', password: 'Demo@1234' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff9f0 0%, #fdf4e7 50%, #f0fdfa 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💙</div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 32, color: '#f97316', marginBottom: 4 }}>
            CareAssist
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>
            Your Compassionate Health Companion
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 36 }}>
          {/* Toggle */}
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: 12,
            padding: 4,
            marginBottom: 28,
          }}>
            {['Sign In', 'Create Account'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setIsLogin(i === 0)}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                  borderRadius: 10, fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                  background: (isLogin ? i === 0 : i === 1) ? 'white' : 'transparent',
                  color: (isLogin ? i === 0 : i === 1) ? '#f97316' : '#9ca3af',
                  boxShadow: (isLogin ? i === 0 : i === 1) ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  className="form-input"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder={isLogin ? 'Your password' : 'Min 8 characters'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={isLogin ? 1 : 8}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                {/* Role Selection */}
                <div className="form-group">
                  <label className="form-label">Your Role *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, role: r.value }))}
                        style={{
                          padding: '10px 12px', borderRadius: 12, border: '2px solid',
                          borderColor: form.role === r.value ? '#f97316' : '#e5e7eb',
                          background: form.role === r.value ? '#fff9f0' : 'white',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone & Gender */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" name="phone" className="form-input"
                      placeholder="+91 xxxxx xxxxx" value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select name="gender" className="form-input form-select"
                      value={form.gender} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Patient-specific fields */}
                {form.role === 'patient' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Age Mode *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {AGE_MODES.map(m => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, ageMode: m.value }))}
                            style={{
                              padding: '12px 8px', borderRadius: 12, border: '2px solid',
                              borderColor: form.ageMode === m.value ? '#f97316' : '#e5e7eb',
                              background: form.ageMode === m.value ? '#fff9f0' : 'white',
                              cursor: 'pointer', textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: 18, marginBottom: 4 }}>
                              {m.label.split(' ')[0]}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 12 }}>
                              {m.label.split(' ').slice(1).join(' ')}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input type="date" name="dateOfBirth" className="form-input"
                          value={form.dateOfBirth} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select name="bloodGroup" className="form-input form-select"
                          value={form.bloodGroup} onChange={handleChange}>
                          <option value="">Select</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{
                      background: '#f0fdf4', border: '1px solid #86efac',
                      borderRadius: 12, padding: 16, marginBottom: 16
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 12 }}>
                        🆘 Emergency Contact
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Name</label>
                        <input type="text" name="emergencyContactName" className="form-input"
                          placeholder="Emergency contact name" value={form.emergencyContactName}
                          onChange={handleChange} />
                      </div>
                      <div className="grid-2">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 12 }}>Phone</label>
                          <input type="tel" name="emergencyContactPhone" className="form-input"
                            placeholder="+91 xxxxx xxxxx" value={form.emergencyContactPhone}
                            onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 12 }}>Relationship</label>
                          <input type="text" name="emergencyContactRelationship" className="form-input"
                            placeholder="e.g. Mother, Son" value={form.emergencyContactRelationship}
                            onChange={handleChange} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <span>Please wait...</span>
              ) : (
                <span>{isLogin ? '💙 Sign In' : '🌟 Create My Account'}</span>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          {isLogin && (
            <div style={{ marginTop: 24 }}>
              <div style={{
                textAlign: 'center', fontSize: 12, color: '#9ca3af',
                marginBottom: 12, fontWeight: 600
              }}>
                — Quick Demo Login —
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {demoLogins.map(d => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, email: d.email, password: d.password }))}
                    style={{
                      padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb',
                      background: '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      color: '#374151', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.target.style.background = '#fff9f0'}
                    onMouseLeave={e => e.target.style.background = '#f9fafb'}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', marginTop: 8 }}>
                * Add these users in Supabase first (see README)
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
          Built with care 💙 · CareAssist v1.0
        </p>
      </div>
    </div>
  );
}
