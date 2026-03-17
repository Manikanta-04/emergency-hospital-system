import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AnalyticsDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/alert/logs?limit=100').then(res => {
      setLogs(res.data.logs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080b14', color:'#fff', fontFamily:'sans-serif', fontSize:'18px' }}>
      Loading analytics...
    </div>
  );

  // ── Compute stats ─────────────────────────────────────────────────────────
  const total = logs.length;
  const today = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const successRate = total > 0 ? Math.round((logs.filter(l => l.webhookStatus === 'sent').length / total) * 100) : 0;
  const avgEta = total > 0 ? Math.round(logs.reduce((s, l) => s + (l.eta || 0), 0) / total) : 0;

  // Emergency type counts
  const typeCounts = logs.reduce((acc, l) => {
    acc[l.emergencyType] = (acc[l.emergencyType] || 0) + 1;
    return acc;
  }, {});

  // Hospital counts
  const hospitalCounts = logs.reduce((acc, l) => {
    acc[l.hospitalName] = (acc[l.hospitalName] || 0) + 1;
    return acc;
  }, {});
  const topHospitals = Object.entries(hospitalCounts).sort((a,b) => b[1]-a[1]).slice(0, 5);

  // Hourly distribution
  const hourlyCounts = Array(24).fill(0);
  logs.forEach(l => { hourlyCounts[new Date(l.createdAt).getHours()]++; });
  const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));

  // Emergency colors
  const typeColors = {
    'Stroke': '#6366f1', 'Heart Attack': '#ef4444',
    'Trauma': '#f97316', 'Accident': '#eab308',
    'Burns': '#dc2626', 'Other': '#14b8a6',
  };

  const maxCount = Math.max(...Object.values(typeCounts), 1);
  const maxHourly = Math.max(...hourlyCounts, 1);

  return (
    <div style={{ minHeight:'100vh', background:'#080b14', color:'#e2e8f5', fontFamily:"'Syne', sans-serif" }}>

      {/* Header */}
      <header style={{ background:'#0d1117', borderBottom:'1px solid #2d3748', padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <span style={{ fontSize:'28px' }}>📊</span>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'800', margin:0 }}>Analytics Dashboard</h1>
            <p style={{ fontSize:'11px', color:'#7a8bad', margin:0, fontFamily:'monospace' }}>Emergency Response Insights</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <a href="/hospital" style={{ background:'#161b27', border:'1px solid #3d4f6b', color:'#e2e8f5', padding:'7px 16px', borderRadius:'8px', textDecoration:'none', fontSize:'12px', fontFamily:'monospace' }}>🏥 Hospital View</a>
          <a href="/" style={{ background:'#161b27', border:'1px solid #3d4f6b', color:'#e2e8f5', padding:'7px 16px', borderRadius:'8px', textDecoration:'none', fontSize:'12px', fontFamily:'monospace' }}>← Dispatcher</a>
        </div>
      </header>

      <div style={{ padding:'24px', maxWidth:'1200px', margin:'0 auto' }}>

        {/* ── Stat Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
          <StatCard icon="🚨" label="Total Alerts" value={total} color="#ef4444" />
          <StatCard icon="📅" label="Today" value={today} color="#3b82f6" />
          <StatCard icon="✅" label="Success Rate" value={`${successRate}%`} color="#22c55e" />
          <StatCard icon="⏱️" label="Avg ETA" value={`${avgEta} min`} color="#f59e0b" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>

          {/* ── Emergency Types Chart ── */}
          <div style={{ background:'#0d1117', border:'1px solid #2d3748', borderRadius:'14px', padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:'700', color:'#7a8bad', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'20px' }}>
              🚑 Emergencies by Type
            </h3>
            {Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([type, count]) => (
              <div key={type} style={{ marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'13px' }}>
                  <span style={{ color: typeColors[type] || '#fff', fontWeight:'600' }}>{type}</span>
                  <span style={{ fontFamily:'monospace', fontWeight:'700' }}>{count}</span>
                </div>
                <div style={{ background:'#161b27', borderRadius:'6px', height:'10px', overflow:'hidden' }}>
                  <div style={{
                    width:`${(count/maxCount)*100}%`,
                    height:'100%',
                    background: typeColors[type] || '#3b82f6',
                    borderRadius:'6px',
                    transition:'width 1s ease',
                  }} />
                </div>
              </div>
            ))}
            {Object.keys(typeCounts).length === 0 && <p style={{ color:'#7a8bad', fontSize:'13px' }}>No data yet</p>}
          </div>

          {/* ── Top Hospitals ── */}
          <div style={{ background:'#0d1117', border:'1px solid #2d3748', borderRadius:'14px', padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:'700', color:'#7a8bad', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'20px' }}>
              🏥 Most Alerted Hospitals
            </h3>
            {topHospitals.map(([name, count], i) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'#161b27', borderRadius:'8px', marginBottom:'8px', border:'1px solid #2d3748' }}>
                <div style={{ width:'28px', height:'28px', background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#1c2333', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'12px', flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontSize:'13px', fontWeight:'700', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                  <div style={{ fontSize:'11px', color:'#7a8bad', fontFamily:'monospace' }}>{count} alert{count>1?'s':''}</div>
                </div>
                <div style={{ background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', color:'#60a5fa', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontFamily:'monospace', fontWeight:'700' }}>
                  {count}
                </div>
              </div>
            ))}
            {topHospitals.length === 0 && <p style={{ color:'#7a8bad', fontSize:'13px' }}>No data yet</p>}
          </div>
        </div>

        {/* ── Hourly Activity Chart ── */}
        <div style={{ background:'#0d1117', border:'1px solid #2d3748', borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700', color:'#7a8bad', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'20px' }}>
            ⏰ Hourly Activity — Peak Hour: {peakHour}:00 - {peakHour+1}:00
          </h3>
          <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', height:'100px' }}>
            {hourlyCounts.map((count, hour) => (
              <div key={hour} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                <div style={{
                  width:'100%',
                  height: maxHourly > 0 ? `${(count/maxHourly)*80}px` : '2px',
                  minHeight: count > 0 ? '4px' : '2px',
                  background: hour === peakHour ? '#ef4444' : count > 0 ? '#3b82f6' : '#1c2333',
                  borderRadius:'3px 3px 0 0',
                  transition:'height 0.8s ease',
                  boxShadow: hour === peakHour ? '0 0 8px #ef4444' : 'none',
                }} title={`${hour}:00 — ${count} alerts`} />
                {hour % 4 === 0 && (
                  <span style={{ fontSize:'9px', color:'#4a5568', fontFamily:'monospace' }}>{hour}h</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent Alerts Table ── */}
        <div style={{ background:'#0d1117', border:'1px solid #2d3748', borderRadius:'14px', padding:'20px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700', color:'#7a8bad', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px' }}>
            📋 Recent Alerts
          </h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #2d3748' }}>
                  {['Alert ID','Emergency','Hospital','ETA','Patients','Status','Time'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#7a8bad', fontWeight:'700', fontFamily:'monospace', fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0,10).map((log, i) => (
                  <tr key={log._id} style={{ borderBottom:'1px solid #161b27', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:'11px', color:'#4a5568' }}>{log.alertLogId?.slice(-8)}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ background:(typeColors[log.emergencyType]||'#3b82f6')+'22', color:typeColors[log.emergencyType]||'#3b82f6', border:`1px solid ${(typeColors[log.emergencyType]||'#3b82f6')}44`, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontFamily:'monospace', fontWeight:'700' }}>
                        {log.emergencyType}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', fontWeight:'600', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.hospitalName}</td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', color:'#f59e0b', fontWeight:'700' }}>{log.eta} min</td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', textAlign:'center' }}>{log.patientCount}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ color: log.webhookStatus==='sent'?'#22c55e':'#ef4444', fontFamily:'monospace', fontSize:'11px', fontWeight:'700' }}>
                        {log.webhookStatus === 'sent' ? '✅ Sent' : '❌ Failed'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:'11px', color:'#7a8bad' }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p style={{ color:'#7a8bad', fontSize:'13px', textAlign:'center', padding:'20px' }}>No alerts yet. Send some from the dispatcher!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background:'#0d1117', border:`1px solid ${color}33`, borderRadius:'14px', padding:'20px', borderLeft:`3px solid ${color}` }}>
      <div style={{ fontSize:'24px', marginBottom:'8px' }}>{icon}</div>
      <div style={{ fontSize:'32px', fontWeight:'800', fontFamily:'monospace', color, marginBottom:'4px' }}>{value}</div>
      <div style={{ fontSize:'12px', color:'#7a8bad', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'monospace' }}>{label}</div>
    </div>
  );
}
