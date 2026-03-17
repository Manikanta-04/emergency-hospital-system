import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

// ✅ Voice Alert System
function speakAlert(alert) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any current speech
  const text = `Emergency Alert! ${alert.emergencyType} patient arriving at ${alert.hospitalName} in ${alert.eta} minutes. Required unit: ${alert.requiredUnit}. Please prepare immediately.`;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.95;
  msg.pitch = 1;
  msg.volume = 1;
  msg.lang = 'en-IN';
  window.speechSynthesis.speak(msg);
}

export default function HospitalDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [newAlertFlash, setNewAlertFlash] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const prevCountRef = useRef(0);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alert/logs?limit=20');
      const newAlerts = res.data.logs || [];
      if (prevCountRef.current > 0 && newAlerts.length > prevCountRef.current) {
        setNewAlertFlash(true);
        setTimeout(() => setNewAlertFlash(false), 3000);
        setSelectedAlert(newAlerts[0]);
        // ✅ Voice alert fires automatically
        if (voiceEnabled) speakAlert(newAlerts[0]);
      }
      prevCountRef.current = newAlerts.length;
      setAlerts(newAlerts);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch alerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (emergencyType) => {
    const map = {
      'Stroke': '#6366f1', 'Heart Attack': '#ef4444',
      'Trauma': '#f97316', 'Accident': '#eab308',
      'Burns': '#dc2626', 'Other': '#14b8a6',
    };
    return map[emergencyType] || '#3b82f6';
  };

  const getTimeSince = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const completedAlerts = alerts.filter(a => a.status !== 'active');

  return (
    <div className={`hosp-dashboard ${newAlertFlash ? 'flash' : ''}`}>
      <header className="hosp-header">
        <div className="hosp-header-left">
          <div className="hosp-logo">🏥</div>
          <div>
            <h1 className="hosp-title">Hospital Alert Dashboard</h1>
            <p className="hosp-sub">Real-time Emergency Notifications</p>
          </div>
        </div>
        <div className="hosp-header-right">
          {activeAlerts.length > 0 && (
            <div className="active-count">
              <span className="active-dot" />
              {activeAlerts.length} ACTIVE ALERT{activeAlerts.length > 1 ? 'S' : ''}
            </div>
          )}
          {/* ✅ Voice toggle button */}
          <button
            className="reset-btn"
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) window.speechSynthesis.cancel();
            }}
            style={{ background: voiceEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderColor: voiceEnabled ? '#22c55e' : '#ef4444' }}
          >
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>
          {/* ✅ Test voice button */}
          <button
            className="reset-btn"
            onClick={() => speakAlert({ emergencyType: 'Stroke', hospitalName: 'Apollo Hospital', eta: 8, requiredUnit: 'Neurology ICU' })}
          >
            🎙️ Test Voice
          </button>
          <div className="last-updated">🔄 {getTimeSince(lastUpdated)}</div>
          <a href="/" className="back-btn">← Dispatcher</a>
        </div>
      </header>

      {newAlertFlash && (
        <div className="new-alert-banner">🚨 NEW EMERGENCY ALERT INCOMING — PREPARE IMMEDIATELY</div>
      )}

      <div className="hosp-layout">
        <div className="hosp-left">
          {loading ? (
            <div className="hosp-loading"><span className="spinner" /> Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="no-alerts">
              <div className="no-alerts-icon">✅</div>
              <h3>No Active Alerts</h3>
              <p>System is monitoring. Alerts will appear here.</p>
            </div>
          ) : (
            <>
              {activeAlerts.length > 0 && (
                <div className="alert-section">
                  <div className="section-label urgent">🔴 ACTIVE ({activeAlerts.length})</div>
                  {activeAlerts.map(alert => (
                    <AlertCard key={alert._id} alert={alert} isSelected={selectedAlert?._id === alert._id}
                      onClick={() => { setSelectedAlert(alert); if (voiceEnabled) speakAlert(alert); }}
                      urgencyColor={getUrgencyColor(alert.emergencyType)} timeSince={getTimeSince(alert.createdAt)} />
                  ))}
                </div>
              )}
              {completedAlerts.length > 0 && (
                <div className="alert-section">
                  <div className="section-label completed">✅ COMPLETED ({completedAlerts.length})</div>
                  {completedAlerts.map(alert => (
                    <AlertCard key={alert._id} alert={alert} isSelected={selectedAlert?._id === alert._id}
                      onClick={() => setSelectedAlert(alert)}
                      urgencyColor={getUrgencyColor(alert.emergencyType)} timeSince={getTimeSince(alert.createdAt)} dimmed />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="hosp-right">
          {selectedAlert ? (
            <AlertDetail alert={selectedAlert} urgencyColor={getUrgencyColor(selectedAlert.emergencyType)}
              timeSince={getTimeSince(selectedAlert.createdAt)} onSpeak={() => speakAlert(selectedAlert)} />
          ) : (
            <div className="no-selection">
              <div className="no-sel-icon">👆</div>
              <h3>Select an Alert</h3>
              <p>Click any alert on the left to see full details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, isSelected, onClick, urgencyColor, timeSince, dimmed }) {
  return (
    <div className={`alert-card ${isSelected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
      style={{ '--urgency': urgencyColor }} onClick={onClick}>
      <div className="alert-card-top">
        <div className="alert-type-badge" style={{ background: urgencyColor + '22', color: urgencyColor, border: `1px solid ${urgencyColor}44` }}>
          {alert.emergencyType}
        </div>
        <span className="alert-time">{timeSince}</span>
      </div>
      <div className="alert-hospital">{alert.hospitalName}</div>
      <div className="alert-meta">
        <span>⏱ ETA: {alert.eta} min</span>
        <span>👥 {alert.patientCount} patient{alert.patientCount > 1 ? 's' : ''}</span>
        <span>🏥 {alert.requiredUnit}</span>
      </div>
      <div className={`alert-webhook ${alert.webhookStatus === 'sent' ? 'sent' : 'failed'}`}>
        {alert.webhookStatus === 'sent' ? '✅ Notified' : '❌ Notify Failed'}
      </div>
    </div>
  );
}

function AlertDetail({ alert, urgencyColor, timeSince, onSpeak }) {
  return (
    <div className="alert-detail">
      <div className="detail-header" style={{ borderColor: urgencyColor }}>
        <div>
          <div className="detail-type" style={{ color: urgencyColor }}>🚨 {alert.emergencyType.toUpperCase()}</div>
          <h2 className="detail-hospital">{alert.hospitalName}</h2>
          <p className="detail-time">Received {timeSince} · ID: {alert.alertLogId}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="detail-eta" style={{ color: urgencyColor }}>
            {alert.eta}<span style={{ fontSize: 14, opacity: 0.7 }}>min</span>
          </div>
          {/* ✅ Speak this alert button */}
          <button onClick={onSpeak} style={{
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
            color: '#60a5fa', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '12px', fontFamily: 'monospace', fontWeight: '700'
          }}>🔊 Read Aloud</button>
        </div>
      </div>

      <div className="detail-grid">
        <InfoBox icon="🏥" label="Required Unit" value={alert.requiredUnit} highlight={urgencyColor} />
        <InfoBox icon="👥" label="Patients" value={`${alert.patientCount} patient${alert.patientCount > 1 ? 's' : ''}`} />
        <InfoBox icon="📍" label="Patient Location" value={`${alert.patientLocation?.lat?.toFixed(4)}, ${alert.patientLocation?.lng?.toFixed(4)}`} />
        <InfoBox icon="⏱" label="ETA" value={`${alert.eta} minutes`} highlight={urgencyColor} />
        <InfoBox icon="🔔" label="Notification" value={alert.webhookStatus === 'sent' ? '✅ Sent' : '❌ Failed'} />
        <InfoBox icon="🤖" label="AI Override" value={alert.wasManualOverride ? '⚠️ Manual' : '✅ AI Pick'} />
      </div>

      <div className="action-checklist">
        <h4 className="checklist-title">⚡ Preparation Checklist</h4>
        {getChecklist(alert.emergencyType, alert.requiredUnit).map((item, i) => (
          <ChecklistItem key={i} text={item} />
        ))}
      </div>

      {alert.patientLocation && (
        <a className="map-link"
          href={`https://maps.google.com/?q=${alert.patientLocation.lat},${alert.patientLocation.lng}`}
          target="_blank" rel="noreferrer">
          🗺️ Open Patient Location in Google Maps
        </a>
      )}
    </div>
  );
}

function InfoBox({ icon, label, value, highlight }) {
  return (
    <div className="info-box">
      <span className="info-icon">{icon}</span>
      <div>
        <div className="info-label">{label}</div>
        <div className="info-value" style={highlight ? { color: highlight } : {}}>{value}</div>
      </div>
    </div>
  );
}

function ChecklistItem({ text }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className={`checklist-item ${checked ? 'done' : ''}`} onClick={() => setChecked(!checked)}>
      <div className={`check-box ${checked ? 'checked' : ''}`}>{checked ? '✓' : ''}</div>
      <span>{text}</span>
    </div>
  );
}

function getChecklist(emergencyType, unit) {
  const base = ['Alert attending physician on duty', 'Prepare patient admission forms', 'Clear pathway from emergency entrance'];
  const specific = {
    'Stroke': ['Activate stroke protocol', 'Prepare CT scan room', 'Call neurologist on duty', 'Ready tPA medication'],
    'Heart Attack': ['Activate cardiac cathlab', 'Call cardiologist on duty', 'Prepare ECG machine', 'Ready defibrillator'],
    'Trauma': ['Activate trauma team', 'Prepare trauma bay', 'Call surgeon on duty', 'Ready blood bank'],
    'Accident': ['Activate trauma team', 'Prepare trauma bay', 'Ready orthopedic surgeon', 'Prepare X-ray'],
    'Burns': ['Activate burns unit', 'Prepare sterile dressings', 'Ready IV fluids', 'Call burns specialist'],
    'Other': ['Prepare general ward', 'Alert on-call physician'],
  };
  return [...(specific[emergencyType] || specific['Other']), ...base];
}
