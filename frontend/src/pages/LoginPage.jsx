import { useState } from 'react';
import { login, seedUsers } from '../services/authService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true); setError('');
    try {
      const user = await login(email, password);
      // Redirect based on role
      if (user.role === 'admin') window.location.href = '/admin';
      else if (user.role === 'hospital') window.location.href = '/hospital';
      else window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedUsers();
      setError('');
      alert('✅ Default users created!\n\nadmin@emergency.com / admin123\ndispatcher@emergency.com / dispatch123\napollo@emergency.com / hospital123');
    } catch (err) {
      setError('Seed failed: ' + (err.response?.data?.error || err.message));
    } finally { setSeeding(false); }
  };

  const quickLogin = (role) => {
    const creds = {
      admin: { email: 'admin@emergency.com', password: 'admin123' },
      dispatcher: { email: 'dispatcher@emergency.com', password: 'dispatch123' },
      hospital: { email: 'apollo@emergency.com', password: 'hospital123' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080b14 0%, #0d1117 60%, #161b27 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Syne', sans-serif", padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🚑</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#e2e8f5', margin: '0 0 6px' }}>
            Emergency Dispatch
          </h1>
          <p style={{ color: '#7a8bad', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
            AI-Powered Hospital Routing System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: '#0d1117', border: '1px solid #2d3748',
          borderRadius: '16px', padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f5', margin: '0 0 24px', textAlign: 'center' }}>
            Sign In
          </h2>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Email
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: '#161b27', border: '1px solid #2d3748',
                  borderRadius: '8px', color: '#e2e8f5',
                  fontSize: '14px', fontFamily: 'monospace',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Password
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: '#161b27', border: '1px solid #2d3748',
                  borderRadius: '8px', color: '#e2e8f5',
                  fontSize: '14px', fontFamily: 'monospace',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 14px', color: '#f87171',
                fontSize: '13px', marginBottom: '16px',
              }}>❌ {error}</div>
            )}

            {/* Login Button */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#374151' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none', borderRadius: '10px', color: 'white',
              fontSize: '16px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(239,68,68,0.4)',
              fontFamily: "'Syne', sans-serif",
              transition: 'all 0.2s',
            }}>
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          {/* Quick Login Buttons */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #2d3748' }}>
            <p style={{ fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', textAlign: 'center', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Quick Demo Login
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { role: 'admin', label: '👑 Admin', color: '#8b5cf6' },
                { role: 'dispatcher', label: '🚑 Dispatch', color: '#3b82f6' },
                { role: 'hospital', label: '🏥 Hospital', color: '#22c55e' },
              ].map(({ role, label, color }) => (
                <button key={role} onClick={() => quickLogin(role)} style={{
                  padding: '8px 4px',
                  background: `${color}18`,
                  border: `1px solid ${color}44`,
                  borderRadius: '8px', color,
                  fontSize: '11px', fontWeight: '700',
                  cursor: 'pointer', fontFamily: 'monospace',
                  transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Seed users button */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button onClick={handleSeed} disabled={seeding} style={{
              background: 'none', border: 'none',
              color: '#4a5568', fontSize: '11px',
              cursor: 'pointer', fontFamily: 'monospace',
              textDecoration: 'underline',
            }}>
              {seeding ? 'Creating users...' : 'First time? Create default users'}
            </button>
          </div>
        </div>

        {/* Role info */}
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { icon: '👑', role: 'Admin', desc: 'Manage all users & system' },
            { icon: '🚑', role: 'Dispatcher', desc: 'Send emergency alerts' },
            { icon: '🏥', role: 'Hospital', desc: 'Receive & manage alerts' },
          ].map(({ icon, role, desc }) => (
            <div key={role} style={{
              background: '#0d1117', border: '1px solid #2d3748',
              borderRadius: '10px', padding: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#e2e8f5', marginBottom: '2px' }}>{role}</div>
              <div style={{ fontSize: '10px', color: '#7a8bad' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
