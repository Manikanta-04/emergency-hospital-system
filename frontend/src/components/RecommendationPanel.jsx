import { lazy, Suspense } from 'react';

// Lazy load QR to avoid issues if qrcode.react not installed
let AmbulanceQR = null;
try {
  AmbulanceQR = lazy(() => import('./AmbulanceQR'));
} catch(e) {}

export default function RecommendationPanel({ recommendation, emergencyType, onSendAlert, alertStatus, onAmbulanceLocation }) {
  if (!recommendation) return null;

  const { hospitalName, address, score, distanceKm, etaMinutes,
    availableBeds, availableSpecialists, contact, scoreBreakdown, hospitalId } = recommendation;

  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="recommendation-panel">
      <div className="rec-header">
        <div className="rec-badge">⭐ AI RECOMMENDATION</div>
        <div className="rec-score" style={{ color: scoreColor }}>
          {score}<span style={{ fontSize: '14px', opacity: 0.7 }}>/100</span>
        </div>
      </div>

      <h3 className="rec-hospital-name">{hospitalName}</h3>
      <p className="rec-address">📍 {address}</p>

      <div className="rec-stats">
        <div className="stat">
          <span className="stat-value">{distanceKm} km</span>
          <span className="stat-label">Distance</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value">{etaMinutes} min</span>
          <span className="stat-label">ETA</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value">{availableBeds?.icu}</span>
          <span className="stat-label">ICU Beds</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="score-breakdown">
        <p className="breakdown-title">Score Breakdown</p>
        <ScoreBar label="Distance" value={scoreBreakdown?.distanceScore} />
        <ScoreBar label="Specialist Match" value={scoreBreakdown?.specializationScore} />
        <ScoreBar label="Bed Availability" value={scoreBreakdown?.bedScore} />
      </div>

      {/* Specialists on duty */}
      <div className="specialists">
        <span className="spec-label">On Duty:</span>
        {availableSpecialists?.map((s) => (
          <span key={s} className="spec-tag">{s}</span>
        ))}
      </div>

      {/* Contact */}
      <div className="rec-contact">
        <span>📞 {contact?.emergencyLine || contact?.phone}</span>
      </div>

      {/* Alert Button */}
      <AlertButton
        hospitalId={hospitalId}
        emergencyType={emergencyType}
        etaMinutes={etaMinutes}
        onSendAlert={onSendAlert}
        alertStatus={alertStatus}
      />

      {/* ✅ QR Code for ambulance tracking — shown after alert sent */}
      {alertStatus?.sent && AmbulanceQR && (
        <Suspense fallback={<div style={{color:'#7a8bad',fontSize:'12px',padding:'10px'}}>Loading tracker...</div>}>
          <AmbulanceQR
            alertLogId={alertStatus.alertLogId}
            onLocationUpdate={onAmbulanceLocation}
          />
        </Suspense>
      )}
    </div>
  );
}

function ScoreBar({ label, value }) {
  const color = value >= 80 ? '#22c55e' : value >= 40 ? '#eab308' : '#ef4444';
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="score-bar-val" style={{ color }}>{value}</span>
    </div>
  );
}

function AlertButton({ hospitalId, emergencyType, etaMinutes, onSendAlert, alertStatus }) {
  if (alertStatus?.sent) {
    return (
      <div className="alert-success">
        ✅ Alert Sent — Hospital is preparing
        <div className="alert-id">ID: {alertStatus.alertLogId}</div>
      </div>
    );
  }

  if (alertStatus?.failed) {
    return (
      <div className="alert-failed">
        <div>❌ Alert Failed — {alertStatus.error}</div>
        <button className="retry-btn" onClick={() => onSendAlert(hospitalId, true)}>
          🔄 Retry Alert
        </button>
      </div>
    );
  }

  return (
    <button
      className="alert-btn"
      onClick={() => onSendAlert(hospitalId)}
      disabled={alertStatus?.loading}
    >
      {alertStatus?.loading ? (
        <span><span className="spinner" /> Sending Alert...</span>
      ) : (
        <span>🚨 Send Alert & Navigate</span>
      )}
    </button>
  );
}
