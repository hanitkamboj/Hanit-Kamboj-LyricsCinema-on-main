import React from 'react';

interface Props {
  artworkUrl: string | null;
  title: string;
  artist: string;
  album?: string;
  currentTime: number;
  duration: number;
  logoUrl?: string | null;
  isPlaying?: boolean;
}

const ArtworkPanel: React.FC<Props> = ({
  artworkUrl,
  title,
  artist,
  album,
  currentTime,
  duration,
  logoUrl,
  isPlaying = false,
}) => {
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        gap: '0.8rem',
        padding: '0.5rem',
      }}
    >
      {/* Logo */}
      {logoUrl && (
        <div
          style={{
            animation: 'logoPulse 3s ease-in-out infinite',
            maxWidth: '100%',
          }}
        >
          <img
            src={logoUrl}
            alt="Logo"
            draggable={false}
            style={{
              maxHeight: 'clamp(20px, 3.5vw, 38px)',
              maxWidth: 'clamp(70px, 13vw, 150px)',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6)) brightness(1.1)',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Artwork */}
      <div
        style={{
          position: 'relative',
          width: 'clamp(130px, 20vw, 280px)',
          aspectRatio: '1 / 1',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: isPlaying
            ? '0 20px 60px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 12px 36px rgba(0,0,0,0.4), 0 2px 10px rgba(0,0,0,0.4)',
          transform: isPlaying ? 'scale(1)' : 'scale(0.96)',
          transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.7s ease',
          flexShrink: 0,
          willChange: 'transform',
        }}
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={title || 'Artwork'}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #2d1b69 0%, #4a0e8f 50%, #1a0d2e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
            }}
          >
            🎵
          </div>
        )}

        {/* Shine overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 45%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Song info block */}
      <div
        style={{
          width: 'clamp(130px, 20vw, 280px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '3px',
            background: 'rgba(255,255,255,0.18)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '2px',
              transition: 'width 0.25s linear',
            }}
          />
        </div>

        {/* Time row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 'clamp(0.6rem, 1vw, 0.72rem)',
            fontFamily: "'SF Pro Text', 'Inter', -apple-system, monospace",
            letterSpacing: '0.02em',
          }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>

        {/* Song title */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 'clamp(0.78rem, 1.3vw, 1rem)',
            fontWeight: 700,
            fontFamily: "'SF Pro Display', 'Inter', -apple-system, sans-serif",
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title || 'Song Title'}
        </div>

        {/* Artist · Album */}
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 'clamp(0.65rem, 1vw, 0.82rem)',
            fontFamily: "'SF Pro Text', 'Inter', -apple-system, sans-serif",
            fontWeight: 400,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {[artist, album].filter(Boolean).join(' · ') || 'Artist'}
        </div>
      </div>
    </div>
  );
};

export default ArtworkPanel;
