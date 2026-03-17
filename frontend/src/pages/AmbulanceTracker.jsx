import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://emergency-hospital-system.onrender.com';

export default function AmbulanceTracker() {
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [coords, setCoords] = useState([]);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // Get ambulanceId from URL: /track/AMB-001
  const ambulanceId = window.location.pathname.split('/track/')[1] || 'AMB-001';
  const alertLogId = new URLSearchParams(window.location.search).get('alert') || '';

  useEffect(() => {
    // Connect socket
    socketRef.current = io(BACKEND_URL);
    socketRef.current.on('connect', () => setStatus('connected'));
    socketRef.current.on('disconnect', () => setStatus('disconnected'));

    return () => {
      stopTracking();
      socketRef.current?.disconnect();
    };
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return;
    }
    setTracking(true);
    setError('');
    setStatus('broadcasting');

    // Send location every 5 seconds
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0, // m/s to km/h
          };
          setLocation(loc);
          setSpeed(loc.speed);
          setCoords(prev => [...prev.slice(-50), loc]); // keep last 50 points

          // Send to server via Socket.io
          socketRef.current?.emit('ambulance-location', {
            ambulanceId,
            alertLogId,
            lat: loc.lat,
            lng: loc.lng,
            speed: loc.speed,
          });
        },
        (err) => setError(`GPS Error: ${err.message}`),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 5000);

    // Send first location immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, speed: 0 };
        setLocation(loc);
        socketRef.current?.emit('ambulance-location', { ambulanceId, alertLogId, ...loc });
      },
      (err) => setError(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    clearInterval(intervalRef.current);
    setTracking(false);
    setStatus('stopped');
    socketRef.current?.emit('ambulance-stop', { ambulanceId });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 100%)',
      color: '#e2e8f5',
      fontFamily: "'Syne', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '64px', marginBottom: '12px' }}>🚑</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>Ambulance Tracker</h1>
        <p style={{ color: '#7a8bad', fontFamily: 'monospace', fontSize: '13px', margin: 0 }}>
          ID: <strong style={{ color: '#60a5fa' }}>{ambulanceId}</strong>
        </p>
      </div>

      {/* Status Card */}
      <div style={{
        width: '100%', maxWidth: '380px',
        background: '#0d1117',
        border: `2px solid ${tracking ? '#22c55e' : status === 'connected' ? '#3b82f6' : '#374151'}`,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: tracking ? '0 0 30px rgba(34,197,94,0.2)' : 'none',
        transition: 'all 0.3s',
      }}>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: tracking ? '#22c55e' : '#374151',
            boxShadow: tracking ? '0 0 8px #22c55e' : 'none',
            animation: tracking ? 'blink-dot 1s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: 'monospace', fontSize: '12px', fontWeight: '700',
            color: tracking ? '#22c55e' : '#7a8bad', letterSpacing: '2px'
          }}>
            {tracking ? 'BROADCASTING LIVE' : status === 'connected' ? 'READY' : 'CONNECTING...'}
          </span>
        </div>

        {/* Location info */}
        {location ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <InfoTile icon="📍" label="Latitude" value={location.lat.toFixed(5)} />
            <InfoTile icon="📍" label="Longitude" value={location.lng.toFixed(5)} />
            <InfoTile icon="⚡" label="Speed" value={`${speed} km/h`} color="#f59e0b" />
            <InfoTile icon="📡" label="Points Sent" value={coords.length} color="#60a5fa" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#7a8bad', fontSize: '13px', marginBottom: '20px' }}>
            {tracking ? '📡 Acquiring GPS signal...' : 'Press Start to begin tracking'}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '10px', color: '#f87171',
            fontSize: '12px', fontFamily: 'monospace', marginBottom: '16px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Start / Stop button */}
        {!tracking ? (
          <button onClick={startTracking} style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none', borderRadius: '12px', color: 'white',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
            fontFamily: "'Syne', sans-serif",
          }}>
            🚀 Start Tracking
          </button>
        ) : (
          <button onClick={stopTracking} style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: 'none', borderRadius: '12px', color: 'white',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            fontFamily: "'Syne', sans-serif",
          }}>
            ⛔ Stop Tracking
          </button>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '12px', padding: '16px',
      }}>
        <p style={{ fontSize: '12px', color: '#7a8bad', fontFamily: 'monospace', margin: '0 0 8px', fontWeight: '700' }}>
          📋 INSTRUCTIONS
        </p>
        <ul style={{ fontSize: '12px', color: '#94a3b8', margin: 0, paddingLeft: '16px', lineHeight: '1.8' }}>
          <li>Allow GPS permission when asked</li>
          <li>Keep this page open while driving</li>
          <li>Your location updates every 5 seconds</li>
          <li>Dispatcher can see you moving live on map</li>
          <li>Press Stop when you reach the hospital</li>
        </ul>
      </div>

      <style>{`
        @keyframes blink-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function InfoTile({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#161b27', borderRadius: '10px',
      padding: '12px', border: '1px solid #2d3748'
    }}>
      <div style={{ fontSize: '10px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '4px', textTransform: 'uppercase' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', color: color || '#e2e8f5' }}>
        {value}
      </div>
    </div>
  );
}
