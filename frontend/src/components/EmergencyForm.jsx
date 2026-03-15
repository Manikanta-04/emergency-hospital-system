import { useState, useEffect } from 'react';
import { EMERGENCY_TYPES } from '../data/mockHospitals';

export default function EmergencyForm({ onSubmit, loading, onLocationDetected }) {
  const [emergencyType, setEmergencyType] = useState('');
  const [patientCount, setPatientCount] = useState(1);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => { detectLocation(); }, []);

  const detectLocation = () => {
    setLocating(true);
    setLocationError('');
    if (!navigator.geolocation) {
      const fallback = { lat: 13.0827, lng: 80.2707 };
      setLocation(fallback);
      onLocationDetected?.(fallback);
      setLocationError('GPS not supported — using Chennai');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        onLocationDetected?.(loc); // ✅ Fix 1: notify parent immediately
        setLocating(false);
      },
      () => {
        const fallback = { lat: 13.0827, lng: 80.2707 };
        setLocation(fallback);
        onLocationDetected?.(fallback);
        setLocationError('Using Chennai demo location');
        setLocating(false);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleSubmit = () => {
    if (!emergencyType) return;
    const loc = location || { lat: 13.0827, lng: 80.2707 };
    onSubmit({ emergencyType, patientCount, lat: loc.lat, lng: loc.lng });
  };

  return (
    <div className="emergency-form">
      <div className="form-header">
        <div className="pulse-dot" />
        <span>LIVE DISPATCH</span>
      </div>

      <h2 className="form-title">Select Emergency Type</h2>

      <div className="emergency-grid">
        {EMERGENCY_TYPES.map((type) => (
          <button
            key={type.value}
            className={`emergency-btn ${emergencyType === type.value ? 'active' : ''}`}
            style={{ '--accent': type.color }}
            onClick={() => setEmergencyType(type.value)}
          >
            <span className="emergency-icon">{type.label.split(' ')[0]}</span>
            <span className="emergency-name">{type.label.split(' ').slice(1).join(' ')}</span>
            <span className="emergency-specialist">{type.specialist}</span>
          </button>
        ))}
      </div>

      <div className="form-row">
        <label className="form-label">Number of Patients</label>
        <div className="counter">
          <button onClick={() => setPatientCount(Math.max(1, patientCount - 1))}>−</button>
          <span>{patientCount}</span>
          <button onClick={() => setPatientCount(Math.min(20, patientCount + 1))}>+</button>
        </div>
      </div>

      <div className="location-status">
        {locating ? (
          <span className="loc-detecting">📡 Detecting your location...</span>
        ) : location ? (
          <span className="loc-found">
            📍 Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            {locationError && <span style={{ color: 'var(--text2)', marginLeft: 8 }}>({locationError})</span>}
          </span>
        ) : (
          <span className="loc-manual">
            📍 {locationError || 'Location unavailable'}
            <button className="retry-loc" onClick={detectLocation}>Retry GPS</button>
          </span>
        )}
      </div>

      <button
        className={`dispatch-btn ${!emergencyType || loading ? 'disabled' : ''}`}
        onClick={handleSubmit}
        disabled={!emergencyType || loading || locating}
      >
        {loading ? (
          <span className="btn-loading">
            <span className="spinner" />
            Finding Best Hospital...
          </span>
        ) : (
          <span>🚑 Find Best Hospital</span>
        )}
      </button>
    </div>
  );
}
