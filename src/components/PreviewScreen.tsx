import React from 'react';
import { useStore } from '../store/useStore';
import VideoPreview from './VideoPreview';

const PreviewScreen: React.FC = () => {
  const { setStep, songMeta, lyrics, isFullscreen, setFullscreen } = useStore();

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setFullscreen]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a0a18 0%, #150a28 50%, #0a1818 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'SF Pro Display', 'Inter', -apple-system, sans-serif",
        padding: 'clamp(0.6rem, 2vw, 1.25rem)',
        gap: '1rem',
      }}
    >
      {/* Top navigation bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}
      >
        {/* Left: Back + Song info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <button
            onClick={() => setStep('upload')}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '0.42rem 0.85rem',
              color: 'rgba(255,255,255,0.65)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            ← Back
          </button>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '300px',
              }}
            >
              {songMeta.title || 'Preview'}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '300px',
              }}
            >
              {[songMeta.artist, songMeta.album].filter(Boolean).join(' · ')}
              {lyrics ? ` · ${lyrics.lines.length} lines` : ''}
            </div>
          </div>
        </div>

        {/* Right: Status badges + export toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {lyrics?.syncMode === 'word' && (
            <span
              style={{
                padding: '0.28rem 0.65rem',
                borderRadius: '20px',
                background: 'rgba(124,58,237,0.18)',
                border: '1px solid rgba(124,58,237,0.35)',
                color: '#a78bfa',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              ⚡ WORD SYNC
            </span>
          )}
          {lyrics && (
            <span
              style={{
                padding: '0.28rem 0.65rem',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {lyrics.source}
            </span>
          )}
          <button
            onClick={() => {
              const el = document.getElementById('video-preview-container');
              if (el) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  el.requestFullscreen();
                }
              }
            }}
            style={{
              padding: '0.42rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: isFullscreen
                ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'all 0.2s',
              boxShadow: isFullscreen ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
            }}
          >
            {isFullscreen ? '✕ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem',
          alignItems: 'start',
          transition: 'grid-template-columns 0.3s ease',
        }}
      >
        {/* Video preview */}
        <div>
          <VideoPreview />
        </div>
      </div>
    </div>
  );
};

export default PreviewScreen;
