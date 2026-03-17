import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://emergency-hospital-system.onrender.com';
const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : 'https://emergency-hospital-system.vercel.app';

export default function AmbulanceQR({ alertLogId, onLocationUpdate }) {
  const [ambulanceActive, setAmbulanceActive] = useState(false);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [etaUpdate, setEtaUpdate] = useState(null);
  const socketRef = useRef(null);

  const ambulanceId = `AMB-${alertLogId?.slice(-6) || Date.now().toString().slice(-6)}`;
  const trackingUrl = `${FRONTEND_URL}/track/${ambulanceId}?alert=${alertLogId}`;

  useEffect(() => {
    // Connect to socket and listen for this ambulance
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('ambulance-update', (data) => {
      if (data.ambulanceId === ambulanceId) {
        setAmbulanceActive(true);
        setAmbulanceLocation(data);
        onLocationUpdate?.(data); // pass to map
      }
    });

    socketRef.current.on('ambulance-stopped', (data) => {
      if (data.ambulanceId === ambulanceId) {
        setAmbulanceActive(false);
      }
    });

    return () => socketRef.current?.disconnect();
  }, [ambulanceId]);

  return (
    <div style={{
      background: '#0d1117',
      border: `2px solid ${ambulanceActive ? '#22c55e' : '#2d3748'}`,
      borderRadius: '14px',
      padding: '20px',
      marginTop: '16px',
      transition: 'all 0.3s',
      boxShadow: ambulanceActive ? '0 0 24px rgba(34,197,94,0.15)' : 'none',
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>🚑</span>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', fontFamily: 'monospace' }}>
          AMBULANCE TRACKING
        </h4>
        <div style={{
          marginLeft: 'auto',
          display: 'flex', alignItems: 'center', gap: '6px',
          background: ambulanceActive ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.1)',
          border: `1px solid ${ambulanceActive ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.3)'}`,
          padding: '3px 10px', borderRadius: '20px',
        }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: ambulanceActive ? '#22c55e' : '#3b82f6',
            animation: ambulanceActive ? 'blink-dot 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '700', color: ambulanceActive ? '#22c55e' : '#60a5fa' }}>
            {ambulanceActive ? 'LIVE' : 'WAITING'}
          </span>
        </div>
      </div>

      {!ambulanceActive ? (
        /* QR Code — shown before driver scans */
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            background: 'white', padding: '10px', borderRadius: '10px',
            flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <QRCodeSVG value={trackingUrl} size={110} />
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: '#e2e8f5' }}>
              📱 Driver: Scan to Start Tracking
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#7a8bad', fontFamily: 'monospace', lineHeight: '1.6' }}>
              Ambulance ID: <strong style={{ color: '#60a5fa' }}>{ambulanceId}</strong><br/>
              Share link or scan QR code
            </p>
            <div style={{
              background: '#161b27', border: '1px solid #2d3748',
              borderRadius: '8px', padding: '8px 10px',
              fontSize: '10px', fontFamily: 'monospace', color: '#7a8bad',
              wordBreak: 'break-all',
            }}>
              {trackingUrl}
            </div>
          </div>
        </div>
      ) : (
        /* Live tracking info — shown after driver scans */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <LiveTile icon="📍" label="Latitude" value={ambulanceLocation?.lat?.toFixed(4)} color="#22c55e" />
            <LiveTile icon="📍" label="Longitude" value={ambulanceLocation?.lng?.toFixed(4)} color="#22c55e" />
            <LiveTile icon="⚡" label="Speed" value={`${ambulanceLocation?.speed || 0} km/h`} color="#f59e0b" />
          </div>
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '13px', color: '#22c55e', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>🚑</span>
            Ambulance is live on map — watch it move!
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

function LiveTile({ icon, label, value, color }) {
  return (
    <div style={{ background: '#161b27', borderRadius: '8px', padding: '10px', border: '1px solid #2d3748', textAlign: 'center' }}>
      <div style={{ fontSize: '9px', color: '#7a8bad', fontFamily: 'monospace', marginBottom: '4px', textTransform: 'uppercase' }}>{icon} {label}</div>
      <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', color }}>{value || '—'}</div>
    </div>
  );
}
