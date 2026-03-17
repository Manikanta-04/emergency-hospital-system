import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'https://emergency-hospital-system.onrender.com';

export default function AmbulanceTracker() {
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [pointsSent, setPointsSent] = useState(0);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // Get ambulanceId from URL: /track/AMB-001
  const pathParts = window.location.pathname.split('/track/');
  const ambulanceId = pathParts[1] || `AMB-${Date.now().toString().slice(-6)}`;
  const alertLogId = new URLSearchParams(window.location.search).get('alert') || '';

  useEffect(() => {
    // Connect to backend socket
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      console.log('✅ Socket connected');
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      stopTracking();
      socketRef.current?.disconnect();
    };
  }, []);

  // ✅ Fix: Send DRIVER'S real GPS coordinates via socket
  const sendLocation = (position) => {
    // ✅ These are the DRIVER's coordinates from navigator.geolocation
    const driverLat = position.coords.latitude;
    const driverLng = position.coords.longitude;
    const driverSpeed = position.coords.speed
      ? Math.round(position.coords.speed * 3.6) // m/s → km/h
      : 0;

    const locationData = {
      ambulanceId,
      alertLogId,
      lat: driverLat,   // ✅ Driver's real GPS lat
      lng: driverLng,   // ✅ Driver's real GPS lng
      speed: driverSpeed,
      timestamp: Date.now(),
    };

    // Update local state to show on driver's screen
    setLocation({ lat: driverLat, lng: driverLng });
    setSpeed(driverSpeed);

    // ✅ Emit to server — dispatcher map receives this
    if (socketRef.current?.connected) {
      socketRef.current.emit('ambulance-location', locationData);
      setPointsSent(prev => prev + 1);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return;
    }

    setTracking(true);
    setError('');
    setPointsSent(0);

    // ✅ Get location immediately
    navigator.geolocation.getCurrentPosition(
      sendLocation,
      (err) => setError(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // ✅ Then update every 5 seconds
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (err) => console.warn('GPS update failed:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 5000);
  };

  const stopTracking = () => {
    clearInterval(intervalRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setTracking(false);
    socketRef.current?.emit('ambulance-stop', { ambulanceId });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 100%)',
      color: '#e2e8f5',
      fontFamily: "'Syne', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '60px', marginBottom: '10px' }}>🚑</div>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px' }}>Ambulance Tracker</h1>
        <p style={{ color: '#7a8bad', fontFamily: 'monospace', fontSize: '12px', margin: 0 }}>
          ID: <strong style={{ color: '#60a5fa' }}>{ambulanceId}</strong>
        </p>
      </div>

      {/* Status Card */}
      <div style={{
        width: '100%', maxWidth: '380px',
        background: '#0d1117',
        border: `2px solid ${tracking ? '#22c55e' : connected ? '#3b82f6' : '#374151'}`,
        borderRadius: '16px', padding: '22px', marginBottom: '16px',
        boxShadow: tracking ? '0 0 30px rgba(34,197,94,0.2)' : 'none',
        transition: 'all 0.3s',
      }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: tracking ? '#22c55e' : connected ? '#3b82f6' : '#374151',
            boxShadow: tracking ? '0 0 8px #22c55e' : 'none',
          }} />
          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700',
            color: tracking ? '#22c55e' : connected ? '#60a5fa' : '#7a8bad', letterSpacing: '2px' }}>
            {tracking ? '● BROADCASTING LIVE' : connected ? '○ READY TO TRACK' : '○ CONNECTING...'}
          </span>
        </div>

        {/* Location tiles */}
        {location ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <InfoTile icon="🌐" label="Latitude" value={location.lat.toFixed(5)} color="#22c55e" />
            <InfoTile icon="🌐" label="Longitude" value={location.lng.toFixed(5)} color="#22c55e" />
            <InfoTile icon="⚡" label="Speed" value={`${speed} km/h`} color="#f59e0b" />
            <InfoTile icon="📡" label="Updates Sent" value={pointsSent} color="#60a5fa" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '18px', color: '#7a8bad', fontSize: '13px', marginBottom: '18px' }}>
            {tracking ? '📡 Getting GPS signal...' : '📍 Press Start to begin tracking'}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '10px', color: '#f87171',
            fontSize: '12px', fontFamily: 'monospace', marginBottom: '14px'
          }}>⚠️ {error}</div>
        )}

        {/* Start/Stop button */}
        {!tracking ? (
          <button onClick={startTracking} style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none', borderRadius: '12px', color: 'white',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
            fontFamily: "'Syne', sans-serif",
          }}>🚀 Start Tracking</button>
        ) : (
          <button onClick={stopTracking} style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: 'none', borderRadius: '12px', color: 'white',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            fontFamily: "'Syne', sans-serif",
          }}>⛔ Stop Tracking</button>
        )}
      </div>

      {/* How it works */}
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '12px', padding: '16px',
      }}>
        <p style={{ fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', margin: '0 0 8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
          📋 HOW IT WORKS
        </p>
        <ul style={{ fontSize: '12px', color: '#94a3b8', margin: 0, paddingLeft: '16px', lineHeight: '2' }}>
          <li>Your GPS location sends every 5 seconds</li>
          <li>Dispatcher sees your 🚑 moving on their map</li>
          <li>Hospital sees you approaching in real-time</li>
          <li>Keep this page open while driving</li>
          <li>Press Stop when you reach the hospital</li>
        </ul>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value, color }) {
  return (
    <div style={{ background: '#161b27', borderRadius: '10px', padding: '12px', border: '1px solid #2d3748' }}>
      <div style={{ fontSize: '10px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '4px', textTransform: 'uppercase' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', color: color || '#e2e8f5' }}>
        {value}
      </div>
    </div>
  );
}
