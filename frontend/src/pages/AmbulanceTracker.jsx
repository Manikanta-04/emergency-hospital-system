import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'https://emergency-hospital-system.onrender.com';

export default function AmbulanceTracker() {
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [pointsSent, setPointsSent] = useState(0);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // ── Parse ambulanceId + alertLogId from URL ──────────────────────────────
  // URL format: /track/AMB-XXXXXX?alert=ALERT-...
  const pathParts = window.location.pathname.split('/track/');
  const ambulanceId = pathParts[1]?.split('?')[0] || `AMB-${Date.now().toString().slice(-6)}`;
  const alertLogId = new URLSearchParams(window.location.search).get('alert') || '';

  // ── Connect socket on mount ───────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      setError('');
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
    });

    return () => {
      stopTracking();
      socketRef.current?.disconnect();
    };
  }, []);

  // ── Send driver's GPS location to dispatcher ──────────────────────────────
  const sendLocation = (position) => {
    const driverLat = position.coords.latitude;
    const driverLng = position.coords.longitude;
    const driverSpeed = position.coords.speed
      ? Math.round(position.coords.speed * 3.6)  // m/s → km/h
      : 0;
    const driverAccuracy = Math.round(position.coords.accuracy || 0);

    setLocation({ lat: driverLat, lng: driverLng });
    setSpeed(driverSpeed);
    setAccuracy(driverAccuracy);
    setLastSent(new Date());

    if (socketRef.current?.connected) {
      socketRef.current.emit('ambulance-location', {
        ambulanceId,
        alertLogId,
        lat: driverLat,
        lng: driverLng,
        speed: driverSpeed,
        accuracy: driverAccuracy,
        timestamp: Date.now(),
      });
      setPointsSent(prev => prev + 1);
    } else {
      setError('Socket disconnected — trying to reconnect...');
    }
  };

  const handleGpsError = (err) => {
    const msgs = {
      1: 'GPS permission denied. Please allow location access and refresh.',
      2: 'GPS position unavailable. Check if location services are enabled.',
      3: 'GPS timed out. Retrying...',
    };
    setError(msgs[err.code] || `GPS error: ${err.message}`);
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device. Please use Chrome on Android.');
      return;
    }

    setTracking(true);
    setError('');
    setPointsSent(0);

    // Immediate first fix
    navigator.geolocation.getCurrentPosition(sendLocation, handleGpsError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    // Then every 5 seconds
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (err) => {
          if (err.code === 3) return; // timeout — just skip, retry next interval
          handleGpsError(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 5000);
  };

  const stopTracking = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTracking(false);
    socketRef.current?.emit('ambulance-stop', { ambulanceId });
  };

  // Keep screen awake while tracking (Wake Lock API)
  useEffect(() => {
    if (!tracking || !('wakeLock' in navigator)) return;
    let wakeLock = null;
    navigator.wakeLock.request('screen').then(lock => {
      wakeLock = lock;
    }).catch(() => {});
    return () => wakeLock?.release();
  }, [tracking]);

  const statusColor = tracking ? '#22c55e' : connected ? '#3b82f6' : '#374151';
  const statusText = tracking ? '● BROADCASTING LIVE' : connected ? '○ READY TO TRACK' : '○ CONNECTING...';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#e2e8f5',
      fontFamily: "'Syne', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          fontSize: '64px', marginBottom: '12px',
          filter: tracking ? 'drop-shadow(0 0 20px rgba(34,197,94,0.5))' : 'none',
          transition: 'filter 0.5s',
        }}>🚑</div>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Ambulance Tracker
        </h1>
        <div style={{
          fontFamily: 'monospace', fontSize: '11px', color: '#7a8bad',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          padding: '4px 14px', borderRadius: '20px', display: 'inline-block',
        }}>
          ID: <strong style={{ color: '#60a5fa' }}>{ambulanceId}</strong>
          {alertLogId && <> · Alert: <strong style={{ color: '#fbbf24' }}>{alertLogId.slice(-10)}</strong></>}
        </div>
      </div>

      {/* Main status card */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#0d1117',
        border: `2px solid ${statusColor}`,
        borderRadius: '20px', padding: '24px', marginBottom: '16px',
        boxShadow: tracking ? `0 0 40px rgba(34,197,94,0.2)` : 'none',
        transition: 'all 0.4s',
      }}>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            width: '12px', height: '12px', borderRadius: '50%',
            background: statusColor,
            boxShadow: tracking ? `0 0 12px ${statusColor}` : 'none',
            animation: tracking ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: 'monospace', fontSize: '12px', fontWeight: '800',
            color: statusColor, letterSpacing: '2px',
          }}>
            {statusText}
          </span>
          {tracking && (
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e',
              fontFamily: 'monospace', fontSize: '10px', fontWeight: '700',
              padding: '2px 8px', borderRadius: '10px',
            }}>
              {pointsSent} pts sent
            </span>
          )}
        </div>

        {/* GPS info tiles */}
        {location ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <InfoTile icon="🌐" label="Latitude" value={location.lat.toFixed(5)} color="#22c55e" />
              <InfoTile icon="🌐" label="Longitude" value={location.lng.toFixed(5)} color="#22c55e" />
              <InfoTile icon="⚡" label="Speed" value={`${speed} km/h`} color="#f59e0b" />
              <InfoTile icon="🎯" label="Accuracy" value={accuracy !== null ? `±${accuracy}m` : '—'} color="#60a5fa" />
            </div>
            {lastSent && (
              <div style={{
                fontSize: '11px', color: '#4a5568', fontFamily: 'monospace',
                textAlign: 'center', marginBottom: '16px',
              }}>
                Last update: {lastSent.toLocaleTimeString()}
              </div>
            )}
          </>
        ) : (
          <div style={{
            textAlign: 'center', padding: '24px', color: '#7a8bad',
            fontSize: '13px', marginBottom: '14px',
          }}>
            {tracking
              ? <span>📡 Acquiring GPS signal<span style={{ animation: 'ellipsis 1.5s infinite' }}>...</span></span>
              : '📍 Press Start to begin broadcasting your location'}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px', color: '#f87171',
            fontSize: '12px', fontFamily: 'monospace', marginBottom: '14px',
            lineHeight: '1.6',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Start / Stop button */}
        {!tracking ? (
          <button onClick={startTracking} style={{
            width: '100%', padding: '18px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none', borderRadius: '14px', color: 'white',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(34,197,94,0.4)',
            fontFamily: "'Syne', sans-serif",
            letterSpacing: '0.5px',
            transition: 'all 0.2s',
          }}>
            🚀 Start Tracking
          </button>
        ) : (
          <button onClick={stopTracking} style={{
            width: '100%', padding: '18px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: 'none', borderRadius: '14px', color: 'white',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(239,68,68,0.4)',
            fontFamily: "'Syne', sans-serif",
            letterSpacing: '0.5px',
          }}>
            ⛔ Stop Tracking
          </button>
        )}
      </div>

      {/* Open in Maps button while tracking */}
      {tracking && location && (
        <a
          href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
          target="_blank" rel="noreferrer"
          style={{
            display: 'block', width: '100%', maxWidth: '400px',
            padding: '13px', marginBottom: '16px', textAlign: 'center',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px', color: '#60a5fa',
            textDecoration: 'none', fontSize: '13px', fontWeight: '600',
          }}
        >
          🗺️ Open My Location in Google Maps
        </a>
      )}

      {/* Instructions */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: '14px', padding: '18px',
      }}>
        <p style={{
          fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace',
          margin: '0 0 10px', fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: '1px',
        }}>
          📋 HOW IT WORKS
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { icon: '📍', text: 'Your GPS location is sent every 5 seconds' },
            { icon: '🗺️', text: 'Dispatcher sees your 🚑 moving on their map' },
            { icon: '🏥', text: 'Hospital sees you approaching in real-time' },
            { icon: '📱', text: 'Keep this page open while driving' },
            { icon: '⛔', text: 'Press Stop when you reach the hospital' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connection debug info */}
      <div style={{
        marginTop: '12px', fontSize: '10px', fontFamily: 'monospace',
        color: '#4a5568', textAlign: 'center',
      }}>
        Socket: {connected ? '🟢 connected' : '🔴 disconnected'} · Server: {BACKEND_URL.replace('https://', '')}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        @keyframes ellipsis {
          0% { content: '.'; }
          33% { content: '..'; }
          66% { content: '...'; }
        }
      `}</style>
    </div>
  );
}

function InfoTile({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#161b27', borderRadius: '12px',
      padding: '12px', border: '1px solid #2d3748',
    }}>
      <div style={{
        fontSize: '10px', color: '#7a8bad', fontFamily: 'monospace',
        marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: '15px', fontWeight: '800',
        fontFamily: 'monospace', color: color || '#e2e8f5',
        letterSpacing: '-0.5px',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}
