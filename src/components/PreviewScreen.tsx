import React from 'react';
import { useStore } from '../store/useStore';
import VideoPreview from './VideoPreview';

const PreviewScreen: React.FC = () => {
  const { setStep, songMeta, lyrics, isFullscreen, setFullscreen } = useStore();

  const [isRecording, setIsRecording] = React.useState(false);
  const activeStreamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setFullscreen]);

  const stopRecording = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(t => t.stop());
      activeStreamRef.current = null;
    }
    setIsRecording(false);
  };

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
            onClick={async () => {
              if (isRecording) {
                stopRecording();
                return;
              }
              try {
                // @ts-ignore
                const stream = await navigator.mediaDevices.getDisplayMedia({
                  video: { displaySurface: 'browser' },
                  audio: true,
                });
                activeStreamRef.current = stream;
                setIsRecording(true);
                
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
                const chunks: Blob[] = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                  const blob = new Blob(chunks, { type: 'video/webm' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `LyricCinema-${songMeta.title || 'Export'}.webm`;
                  a.click();
                  stopRecording();
                };
                
                // User clicked native "Stop sharing"
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                  if (recorder.state === 'recording') recorder.stop();
                  stopRecording();
                });
                
                // Go fullscreen for perfect 16:9
                const el = document.getElementById('video-preview-container');
                if (el && !document.fullscreenElement) {
                  await el.requestFullscreen();
                }
                
                recorder.start();
                // Send event to reset player (but do not auto-play)
                setTimeout(() => window.dispatchEvent(new Event('prepare-recording')), 800);
                
                // Auto-stop when audio ends
                window.addEventListener('audio-ended', () => {
                  if (recorder.state === 'recording') recorder.stop();
                  stopRecording();
                }, { once: true });
                
              } catch (err: any) {
                setIsRecording(false);
                if (err.name === 'NotAllowedError') {
                  // User cancelled the prompt, no need to alert
                  console.log('Recording cancelled by user');
                } else {
                  console.error('Failed to start recording:', err);
                  alert('Recording failed. If you are in the AI Studio preview, please click "Open in New Tab" at the top right, as screen recording may be restricted inside the preview frame.');
                }
              }
            }}
            style={{
              padding: '0.42rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: isRecording ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
              boxShadow: isRecording ? '0 4px 16px rgba(59,130,246,0.3)' : '0 4px 16px rgba(220,38,38,0.3)',
            }}
          >
            {isRecording ? (
              <>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '2px', background: '#fff' }} />
                Stop Recording
              </>
            ) : (
              <>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 2s infinite' }} />
                Record Screen (HD)
              </>
            )}
          </button>
          
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
