import { useEffect, useRef, useState } from 'react';

export default function IntroVideo({ onFinish }) {
  const videoRef = useRef(null);
  const [skippable, setSkippable] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show skip button after 3 seconds
    const skipTimer = setTimeout(() => setSkippable(true), 3000);

    // Auto finish when video ends
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay blocked — go straight to login
        handleFinish();
      });
      video.addEventListener('ended', handleFinish);
    }

    return () => {
      clearTimeout(skipTimer);
      video?.removeEventListener('ended', handleFinish);
    };
  }, []);

  const handleFinish = () => {
    setFadeOut(true);
    setTimeout(() => onFinish(), 800); // fade out then go to login
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.8s ease',
    }}>
      {/* Video */}
      <video
        ref={videoRef}
        src="/intro.mp4"
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
        }}
        muted={true}
        playsInline
        preload="auto"
      />

      {/* Skip button — appears after 3 seconds */}
      {skippable && (
        <button
          onClick={handleFinish}
          style={{
            position: 'absolute', bottom: '40px', right: '40px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', padding: '10px 22px',
            borderRadius: '30px', cursor: 'pointer',
            fontSize: '13px', fontFamily: 'monospace',
            fontWeight: '700', letterSpacing: '1px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
        >
          SKIP →
        </button>
      )}

      {/* Logo overlay at top */}
      <div style={{
        position: 'absolute', top: '32px', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '10px',
        opacity: 0.9,
      }}>
        <span style={{ fontSize: '28px' }}>🚑</span>
        <div>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: '800', fontFamily: "'Syne', sans-serif", letterSpacing: '1px' }}>
            Emergency Dispatch
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px' }}>
            AI-POWERED HOSPITAL ROUTING
          </div>
        </div>
      </div>

      {/* Progress bar at bottom */}
      <ProgressBar videoRef={videoRef} />
    </div>
  );
}

function ProgressBar({ videoRef }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      if (video.duration) setProgress((video.currentTime / video.duration) * 100);
    };
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, []);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '3px', background: 'rgba(255,255,255,0.15)',
    }}>
      <div style={{
        height: '100%', background: '#ef4444',
        width: `${progress}%`, transition: 'width 0.5s linear',
        boxShadow: '0 0 8px #ef4444',
      }} />
    </div>
  );
}
