import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

const typeColors = {
  'Stroke': '#6366f1', 'Heart Attack': '#ef4444',
  'Trauma': '#f97316', 'Accident': '#eab308',
  'Burns': '#dc2626', 'Other': '#14b8a6',
};

export default function AnalyticsDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Search & Filter state ─────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    api.get('/alert/logs?limit=500').then(res => {
      setLogs(res.data.logs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // ── Filtered logs ─────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchText = !searchText ||
        l.hospitalName?.toLowerCase().includes(searchText.toLowerCase()) ||
        l.alertLogId?.toLowerCase().includes(searchText.toLowerCase()) ||
        l.emergencyType?.toLowerCase().includes(searchText.toLowerCase());

      const matchType = filterType === 'All' || l.emergencyType === filterType;
      const matchStatus = filterStatus === 'All' ||
        (filterStatus === 'Sent' && l.webhookStatus === 'sent') ||
        (filterStatus === 'Failed' && l.webhookStatus !== 'sent');

      const logDate = new Date(l.createdAt);
      const matchFrom = !filterDateFrom || logDate >= new Date(filterDateFrom);
      const matchTo = !filterDateTo || logDate <= new Date(filterDateTo + 'T23:59:59');

      return matchText && matchType && matchStatus && matchFrom && matchTo;
    });
  }, [logs, searchText, filterType, filterStatus, filterDateFrom, filterDateTo]);

  // ── Stats from filtered logs ──────────────────────────────────────────────
  const total = filteredLogs.length;
  const today = filteredLogs.filter(l =>
    new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const successRate = total > 0
    ? Math.round((filteredLogs.filter(l => l.webhookStatus === 'sent').length / total) * 100) : 0;
  const avgEta = total > 0
    ? Math.round(filteredLogs.reduce((s, l) => s + (l.eta || 0), 0) / total) : 0;

  const typeCounts = filteredLogs.reduce((acc, l) => {
    acc[l.emergencyType] = (acc[l.emergencyType] || 0) + 1; return acc;
  }, {});

  const hospitalCounts = filteredLogs.reduce((acc, l) => {
    acc[l.hospitalName] = (acc[l.hospitalName] || 0) + 1; return acc;
  }, {});
  const topHospitals = Object.entries(hospitalCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const hourlyCounts = Array(24).fill(0);
  filteredLogs.forEach(l => { hourlyCounts[new Date(l.createdAt).getHours()]++; });
  const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));
  const maxCount = Math.max(...Object.values(typeCounts), 1);
  const maxHourly = Math.max(...hourlyCounts, 1);

  // ── Export as CSV (opens in Excel) ───────────────────────────────────────
  const exportCSV = () => {
    setExporting('csv');
    try {
      const headers = ['Alert ID', 'Emergency Type', 'Hospital', 'ETA (min)',
        'Patients', 'Required Unit', 'Status', 'AI Override', 'Date', 'Time',
        'Patient Lat', 'Patient Lng'];

      const rows = filteredLogs.map(l => [
        l.alertLogId || '',
        l.emergencyType || '',
        l.hospitalName || '',
        l.eta || '',
        l.patientCount || 1,
        l.requiredUnit || '',
        l.webhookStatus === 'sent' ? 'Sent' : 'Failed',
        l.wasManualOverride ? 'Manual' : 'AI Pick',
        new Date(l.createdAt).toLocaleDateString(),
        new Date(l.createdAt).toLocaleTimeString(),
        l.patientLocation?.lat?.toFixed(5) || '',
        l.patientLocation?.lng?.toFixed(5) || '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emergency-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  };

  // ── Export as PDF ─────────────────────────────────────────────────────────
  const exportPDF = () => {
    setExporting('pdf');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Emergency Alerts Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 30px; color: #1a202c; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e53e3e; }
          .title { font-size: 24px; font-weight: 800; color: #e53e3e; }
          .subtitle { font-size: 13px; color: #718096; margin-top: 4px; }
          .meta { text-align: right; font-size: 12px; color: #718096; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
          .stat-val { font-size: 26px; font-weight: 800; color: #2d3748; }
          .stat-label { font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .section-title { font-size: 13px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f7fafc; color: #4a5568; padding: 10px 8px; text-align: left; font-weight: 700; border: 1px solid #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
          tr:nth-child(even) td { background: #f9fafb; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
          .sent { background: #c6f6d5; color: #276749; }
          .failed { background: #fed7d7; color: #9b2c2c; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #a0aec0; text-align: center; }
          .filter-info { background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; color: #2b6cb0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">🚑 Emergency Alerts Report</div>
            <div class="subtitle">AI-Powered Hospital Routing System</div>
          </div>
          <div class="meta">
            Generated: ${new Date().toLocaleString()}<br/>
            Total Records: ${filteredLogs.length}
          </div>
        </div>

        ${(searchText || filterType !== 'All' || filterStatus !== 'All' || filterDateFrom || filterDateTo) ? `
        <div class="filter-info">
          <strong>Filters Applied:</strong>
          ${searchText ? `Search: "${searchText}" · ` : ''}
          ${filterType !== 'All' ? `Type: ${filterType} · ` : ''}
          ${filterStatus !== 'All' ? `Status: ${filterStatus} · ` : ''}
          ${filterDateFrom ? `From: ${filterDateFrom} · ` : ''}
          ${filterDateTo ? `To: ${filterDateTo}` : ''}
        </div>` : ''}

        <div class="stats">
          <div class="stat-box"><div class="stat-val">${total}</div><div class="stat-label">Total Alerts</div></div>
          <div class="stat-box"><div class="stat-val">${today}</div><div class="stat-label">Today</div></div>
          <div class="stat-box"><div class="stat-val">${successRate}%</div><div class="stat-label">Success Rate</div></div>
          <div class="stat-box"><div class="stat-val">${avgEta} min</div><div class="stat-label">Avg ETA</div></div>
        </div>

        <div class="section-title">📋 Alert Log Details</div>
        <table>
          <thead>
            <tr>
              <th>Alert ID</th>
              <th>Emergency</th>
              <th>Hospital</th>
              <th>ETA</th>
              <th>Patients</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Source</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${filteredLogs.map(l => `
              <tr>
                <td style="font-family:monospace;font-size:10px;color:#718096">${l.alertLogId?.slice(-10) || '-'}</td>
                <td><strong>${l.emergencyType || '-'}</strong></td>
                <td>${l.hospitalName || '-'}</td>
                <td style="text-align:center;font-weight:700">${l.eta || '-'} min</td>
                <td style="text-align:center">${l.patientCount || 1}</td>
                <td>${l.requiredUnit || '-'}</td>
                <td><span class="badge ${l.webhookStatus === 'sent' ? 'sent' : 'failed'}">${l.webhookStatus === 'sent' ? '✓ Sent' : '✗ Failed'}</span></td>
                <td>${l.wasManualOverride ? 'Manual' : 'AI Pick'}</td>
                <td>${new Date(l.createdAt).toLocaleDateString()}</td>
                <td>${new Date(l.createdAt).toLocaleTimeString()}</td>
              </tr>`).join('')}
          </tbody>
        </table>

        <div class="footer">
          Emergency Hospital Routing System · Report generated on ${new Date().toLocaleString()} · Total ${filteredLogs.length} records
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      setExporting('');
    };
  };

  const clearFilters = () => {
    setSearchText(''); setFilterType('All');
    setFilterStatus('All'); setFilterDateFrom(''); setFilterDateTo('');
  };

  const hasFilters = searchText || filterType !== 'All' || filterStatus !== 'All' || filterDateFrom || filterDateTo;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080b14', color: '#fff', fontFamily: 'sans-serif', fontSize: '18px' }}>
      Loading analytics...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', color: '#e2e8f5', fontFamily: "'Syne', sans-serif" }}>

      {/* Header */}
      <header style={{ background: '#0d1117', borderBottom: '1px solid #2d3748', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>📊</span>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Analytics Dashboard</h1>
            <p style={{ fontSize: '11px', color: '#7a8bad', margin: 0, fontFamily: 'monospace' }}>Emergency Response Insights</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* ── Export Buttons ── */}
          <button onClick={exportCSV} disabled={exporting === 'csv' || filteredLogs.length === 0}
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e', padding: '7px 16px', borderRadius: '8px', cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontFamily: 'monospace', fontWeight: '700' }}>
            {exporting === 'csv' ? '⏳...' : '📥 Excel/CSV'}
          </button>
          <button onClick={exportPDF} disabled={exporting === 'pdf' || filteredLogs.length === 0}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '7px 16px', borderRadius: '8px', cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontFamily: 'monospace', fontWeight: '700' }}>
            {exporting === 'pdf' ? '⏳...' : '📄 PDF Report'}
          </button>
          <a href="/hospital" style={{ background: '#161b27', border: '1px solid #3d4f6b', color: '#e2e8f5', padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontFamily: 'monospace' }}>🏥 Hospital View</a>
          <a href="/" style={{ background: '#161b27', border: '1px solid #3d4f6b', color: '#e2e8f5', padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontFamily: 'monospace' }}>← Dispatcher</a>
        </div>
      </header>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Search & Filter Bar ── */}
        <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px' }}>🔍</span>
            <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', color: '#7a8bad', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Search & Filter
            </span>
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }}>
                ✕ Clear All
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
            {/* Search text */}
            <input
              value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="🔍 Search hospital, alert ID, type..."
              style={{ padding: '9px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
            />
            {/* Emergency type */}
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ padding: '9px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}>
              <option value="All">All Types</option>
              {['Stroke', 'Heart Attack', 'Trauma', 'Accident', 'Burns', 'Other'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {/* Status */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '9px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}>
              <option value="All">All Status</option>
              <option value="Sent">✅ Sent</option>
              <option value="Failed">❌ Failed</option>
            </select>
            {/* Date from */}
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              style={{ padding: '9px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '12px', fontFamily: 'monospace', outline: 'none', colorScheme: 'dark' }}
            />
            {/* Date to */}
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              style={{ padding: '9px 12px', background: '#161b27', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f5', fontSize: '12px', fontFamily: 'monospace', outline: 'none', colorScheme: 'dark' }}
            />
          </div>

          {/* Filter result info */}
          {hasFilters && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#7a8bad', fontFamily: 'monospace' }}>
              Showing <strong style={{ color: '#60a5fa' }}>{filteredLogs.length}</strong> of {logs.length} total alerts
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard icon="🚨" label="Total Alerts" value={total} color="#ef4444" />
          <StatCard icon="📅" label="Today" value={today} color="#3b82f6" />
          <StatCard icon="✅" label="Success Rate" value={`${successRate}%`} color="#22c55e" />
          <StatCard icon="⏱️" label="Avg ETA" value={`${avgEta} min`} color="#f59e0b" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Emergency Types Chart */}
          <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#7a8bad', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
              🚑 Emergencies by Type
            </h3>
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                  <span style={{ color: typeColors[type] || '#fff', fontWeight: '600' }}>{type}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{count}</span>
                </div>
                <div style={{ background: '#161b27', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: typeColors[type] || '#3b82f6', borderRadius: '6px', transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
            {Object.keys(typeCounts).length === 0 && <p style={{ color: '#7a8bad', fontSize: '13px' }}>No data</p>}
          </div>

          {/* Top Hospitals */}
          <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#7a8bad', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
              🏥 Most Alerted Hospitals
            </h3>
            {topHospitals.map(([name, count], i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#161b27', borderRadius: '8px', marginBottom: '8px', border: '1px solid #2d3748' }}>
                <div style={{ width: '28px', height: '28px', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#1c2333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace' }}>{count} alert{count > 1 ? 's' : ''}</div>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700' }}>
                  {count}
                </div>
              </div>
            ))}
            {topHospitals.length === 0 && <p style={{ color: '#7a8bad', fontSize: '13px' }}>No data</p>}
          </div>
        </div>

        {/* Hourly Activity */}
        <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#7a8bad', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            ⏰ Hourly Activity — Peak Hour: {peakHour}:00 - {peakHour + 1}:00
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {hourlyCounts.map((count, hour) => (
              <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '100%',
                  height: maxHourly > 0 ? `${(count / maxHourly) * 80}px` : '2px',
                  minHeight: count > 0 ? '4px' : '2px',
                  background: hour === peakHour ? '#ef4444' : count > 0 ? '#3b82f6' : '#1c2333',
                  borderRadius: '3px 3px 0 0', transition: 'height 0.8s ease',
                  boxShadow: hour === peakHour ? '0 0 8px #ef4444' : 'none',
                }} title={`${hour}:00 — ${count} alerts`} />
                {hour % 4 === 0 && <span style={{ fontSize: '9px', color: '#4a5568', fontFamily: 'monospace' }}>{hour}h</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Full Alert Log Table with Search ── */}
        <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#7a8bad', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              📋 Alert Log ({filteredLogs.length} records)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={exportCSV} disabled={filteredLogs.length === 0}
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700' }}>
                📥 Export CSV
              </button>
              <button onClick={exportPDF} disabled={filteredLogs.length === 0}
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700' }}>
                📄 Export PDF
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2d3748' }}>
                  {['Alert ID', 'Emergency', 'Hospital', 'ETA', 'Patients', 'Unit', 'Status', 'Source', 'Date & Time'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#7a8bad', fontWeight: '700', fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#7a8bad', fontSize: '13px' }}>
                      {hasFilters ? '🔍 No alerts match your filters' : 'No alerts yet'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid #161b27', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '10px', color: '#4a5568' }}>
                        {log.alertLogId?.slice(-10) || '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: (typeColors[log.emergencyType] || '#3b82f6') + '22', color: typeColors[log.emergencyType] || '#3b82f6', border: `1px solid ${(typeColors[log.emergencyType] || '#3b82f6')}44`, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {log.emergencyType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.hospitalName}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#f59e0b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {log.eta} min
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', textAlign: 'center' }}>
                        {log.patientCount || 1}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {log.requiredUnit || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: log.webhookStatus === 'sent' ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontSize: '11px', fontWeight: '700' }}>
                          {log.webhookStatus === 'sent' ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: log.wasManualOverride ? '#f59e0b' : '#22c55e', fontFamily: 'monospace' }}>
                          {log.wasManualOverride ? '⚠️ Manual' : '🤖 AI'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#7a8bad', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: '#0d1117', border: `1px solid ${color}33`, borderRadius: '14px', padding: '20px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#7a8bad', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'monospace' }}>{label}</div>
    </div>
  );
}
