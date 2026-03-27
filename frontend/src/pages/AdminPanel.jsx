import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, logout, getUser } from '../services/authService';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentUser = getUser();

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'dispatcher', hospitalName: '',
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      if (editUser) {
        await updateUser(editUser._id, { name: form.name, role: form.role, hospitalName: form.hospitalName });
        setSuccess(`✅ User "${form.name}" updated`);
      } else {
        await createUser(form);
        setSuccess(`✅ User "${form.name}" created`);
      }
      setShowForm(false); setEditUser(null);
      setForm({ name: '', email: '', password: '', role: 'dispatcher', hospitalName: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, hospitalName: user.hospitalName || '' });
    setShowForm(true);
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.name}"?`)) return;
    try {
      await deleteUser(user._id);
      setSuccess(`✅ User "${user.name}" deleted`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      setSuccess(`✅ User ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) { setError('Update failed'); }
  };

  const roleColor = { admin: '#8b5cf6', dispatcher: '#3b82f6', hospital: '#22c55e' };
  const roleIcon = { admin: '👑', dispatcher: '🚑', hospital: '🏥' };

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', color: '#e2e8f5', fontFamily: "'Syne', sans-serif" }}>

      {/* Header */}
      <header style={{ background: '#0d1117', borderBottom: '1px solid #2d3748', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>👑</span>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Admin Panel</h1>
            <p style={{ fontSize: '11px', color: '#7a8bad', margin: 0, fontFamily: 'monospace' }}>
              Welcome, {currentUser?.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/" style={{ background: '#161b27', border: '1px solid #2d3748', color: '#e2e8f5', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontFamily: 'monospace' }}>
            🚑 Dispatcher
          </a>
          <a href="/analytics" style={{ background: '#161b27', border: '1px solid #2d3748', color: '#e2e8f5', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontFamily: 'monospace' }}>
            📊 Analytics
          </a>
          <button onClick={logout} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace' }}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Users', value: users.length, color: '#3b82f6', icon: '👥' },
            { label: 'Active Users', value: users.filter(u => u.isActive).length, color: '#22c55e', icon: '✅' },
            { label: 'Roles', value: '3 Types', color: '#8b5cf6', icon: '🔑' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: '#0d1117', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'monospace', color }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#7a8bad', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'monospace' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Messages */}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', color: '#f87171', marginBottom: '16px', fontSize: '13px' }}>❌ {error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px 16px', color: '#4ade80', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

        {/* Users Table */}
        <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #2d3748' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>All Users</h3>
            <button onClick={() => { setShowForm(true); setEditUser(null); setForm({ name: '', email: '', password: '', role: 'dispatcher', hospitalName: '' }); }} style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', borderRadius: '8px', color: 'white',
              padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
              fontWeight: '700', fontFamily: "'Syne', sans-serif",
            }}>
              + Add User
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7a8bad' }}>Loading users...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2d3748', background: '#161b27' }}>
                  {['Name', 'Email', 'Role', 'Hospital', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#7a8bad', fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid #161b27', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                      {roleIcon[user.role]} {user.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#7a8bad' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: `${roleColor[user.role]}18`, color: roleColor[user.role], border: `1px solid ${roleColor[user.role]}44`, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7a8bad' }}>{user.hospitalName || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: user.isActive ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontSize: '11px', fontWeight: '700' }}>
                        {user.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#7a8bad' }}>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEdit(user)} style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleToggleActive(user)} style={{ background: user.isActive ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)', border: `1px solid ${user.isActive ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`, color: user.isActive ? '#fbbf24' : '#4ade80', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }}>
                          {user.isActive ? '⏸' : '▶️'}
                        </button>
                        {user.email !== currentUser?.email && (
                          <button onClick={() => handleDelete(user)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add/Edit User Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
                {editUser ? '✏️ Edit User' : '➕ Add New User'}
              </h3>

              <form onSubmit={handleSubmit}>
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                  ...(!editUser ? [{ label: 'Email', key: 'email', type: 'email', placeholder: 'john@hospital.com' }] : []),
                  ...(!editUser ? [{ label: 'Password', key: 'password', type: 'password', placeholder: 'min 6 characters' }] : []),
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
                    <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                      style={{ width: '100%', padding: '10px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '13px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '13px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="dispatcher">🚑 Dispatcher</option>
                    <option value="hospital">🏥 Hospital Staff</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>

                {form.role === 'hospital' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hospital Name</label>
                    <input type="text" value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })} placeholder="Apollo Hospitals"
                      style={{ width: '100%', padding: '10px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '13px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>
                    {editUser ? '✅ Update' : '➕ Create'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditUser(null); }} style={{ flex: 1, padding: '12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
