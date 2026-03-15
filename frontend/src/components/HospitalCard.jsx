export default function HospitalCard({ hospital, rank, isRecommended, onSelect }) {
  const { hospitalName, name, address, score, distanceKm, etaMinutes,
    availableBeds, beds, availableSpecialists, tier, scoreBreakdown } = hospital;

  const displayName = hospitalName || name;
  const icuBeds = availableBeds?.icu ?? ((beds?.icu?.available || 0) - (beds?.icu?.reserved || 0));
  const isFull = icuBeds <= 0;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div
      className={`hospital-card ${isRecommended ? 'recommended' : ''} ${isFull ? 'full' : ''}`}
      onClick={() => onSelect?.(hospital)}
    >
      <div className="card-rank">#{rank}</div>

      <div className="card-body">
        <div className="card-top">
          <div>
            <h4 className="card-name">{displayName}</h4>
            <p className="card-address">{address || hospital.location?.address}</p>
          </div>
          <div className="card-score" style={{ color: scoreColor }}>{score}</div>
        </div>

        <div className="card-stats">
          <span className={`bed-badge ${isFull ? 'full' : icuBeds <= 3 ? 'low' : 'ok'}`}>
            {isFull ? '🔴 ICU Full' : icuBeds <= 3 ? `🟡 ICU: ${icuBeds}` : `🟢 ICU: ${icuBeds}`}
          </span>
          <span className="dist-badge">📍 {distanceKm} km</span>
          {etaMinutes && <span className="eta-badge">⏱ {etaMinutes} min</span>}
          {tier === 1 && <span className="tier-badge">⭐ Tier 1</span>}
        </div>

        <div className="card-specialists">
          {(availableSpecialists || []).slice(0, 3).map((s) => (
            <span key={s} className="spec-chip">{s}</span>
          ))}
        </div>
      </div>

      {isRecommended && <div className="recommended-ribbon">BEST</div>}
    </div>
  );
}
