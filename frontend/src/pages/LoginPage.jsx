import { useState } from 'react';
import { login } from '../services/authService';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ||
  'https://emergency-hospital-system.onrender.com/api';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'dispatcher', hospitalName: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    try {
      const user = await login(loginForm.email, loginForm.password);
      if (user.role === 'admin') window.location.href = '/admin';
      else if (user.role === 'hospital') window.location.href = '/hospital';
      else window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword, role, hospitalName } = signupForm;
    if (!name || !email || !password || !confirmPassword) { setError('All fields are required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (role === 'hospital' && !hospitalName) { setError('Please enter your hospital name'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.post(`${BASE_URL}/auth/signup`, { name, email, password, role, hospitalName });
      setSuccess('✅ Account created! You can now sign in.');
      setMode('login');
      setLoginForm({ email, password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Try again.');
    } finally { setLoading(false); }
  };

  const quickLogin = (role) => {
    const creds = {
      admin: { email: 'admin@emergency.com', password: 'admin123' },
      dispatcher: { email: 'dispatcher@emergency.com', password: 'dispatch123' },
      hospital: { email: 'apollo@emergency.com', password: 'hospital123' },
    };
    setLoginForm(creds[role]);
  };

  const labelStyle = { display: 'block', fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' };
  const inputStyle = { width: '100%', padding: '11px 13px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '13px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #080b14 0%, #0d1117 60%, #161b27 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🚑</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#e2e8f5', margin: '0 0 6px' }}>Emergency Dispatch</h1>
          <p style={{ color: '#7a8bad', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>AI-Powered Hospital Routing System</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#161b27', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
            {['login', 'signup'].map(tab => (
              <button key={tab} onClick={() => { setMode(tab); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '10px', background: mode === tab ? '#1a73e8' : 'transparent', border: 'none', borderRadius: '8px', color: mode === tab ? 'white' : '#7a8bad', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Syne', sans-serif", transition: 'all 0.2s' }}>
                {tab === 'login' ? '🔐 Sign In' : '✏️ Sign Up'}
              </button>
            ))}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>❌ {error}</div>}
          {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#4ade80', fontSize: '13px', marginBottom: '16px' }}>{success}</div>}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={loginForm.email} placeholder="your@email.com" onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={loginForm.password} placeholder="••••••••" onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#374151' : 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(239,68,68,0.35)', fontFamily: "'Syne', sans-serif" }}>
                {loading ? '⏳ Signing in...' : '🚀 Sign In'}
              </button>

              {/* Quick demo */}
              <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #2d3748' }}>
                <p style={{ fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', textAlign: 'center', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Demo Login</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[{ role: 'admin', label: '👑 Admin', color: '#8b5cf6' }, { role: 'dispatcher', label: '🚑 Dispatch', color: '#3b82f6' }, { role: 'hospital', label: '🏥 Hospital', color: '#22c55e' }].map(({ role, label, color }) => (
                    <button key={role} type="button" onClick={() => quickLogin(role)} style={{ padding: '8px 4px', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: '8px', color, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'monospace' }}>{label}</button>
                  ))}
                </div>
              </div>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#7a8bad', marginTop: '16px', marginBottom: 0 }}>
                No account? <span onClick={() => setMode('signup')} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '700' }}>Create one →</span>
              </p>
            </form>
          )}

          {/* SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={signupForm.name} placeholder="John Doe" onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={signupForm.email} placeholder="your@email.com" onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} style={inputStyle} />
              </div>

              {/* Role selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Select Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[{ value: 'dispatcher', label: '🚑 Dispatcher', color: '#3b82f6' }, { value: 'hospital', label: '🏥 Hospital', color: '#22c55e' }, { value: 'admin', label: '👑 Admin', color: '#8b5cf6' }].map(({ value, label, color }) => (
                    <button key={value} type="button" onClick={() => setSignupForm({ ...signupForm, role: value })} style={{ padding: '10px 4px', background: signupForm.role === value ? `${color}22` : '#161b27', border: `2px solid ${signupForm.role === value ? color : '#2d3748'}`, borderRadius: '8px', color: signupForm.role === value ? color : '#7a8bad', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s' }}>{label}</button>
                  ))}
                </div>
              </div>

              {signupForm.role === 'hospital' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Hospital Name</label>
                  <input type="text" value={signupForm.hospitalName} placeholder="e.g. Apollo Hospitals" onChange={e => setSignupForm({ ...signupForm, hospitalName: e.target.value })} style={inputStyle} />
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={signupForm.password} placeholder="min 6 characters" onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={signupForm.confirmPassword} placeholder="repeat password" onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} style={inputStyle} />
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#374151' : 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.35)', fontFamily: "'Syne', sans-serif" }}>
                {loading ? '⏳ Creating account...' : '✅ Create Account'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#7a8bad', marginTop: '16px', marginBottom: 0 }}>
                Already have an account? <span onClick={() => setMode('login')} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '700' }}>Sign in →</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
