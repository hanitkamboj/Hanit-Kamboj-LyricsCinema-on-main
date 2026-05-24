import React, { useRef, useEffect, useCallback, useState } from 'react';
import AnimatedBackground from './AnimatedBackground';
import LyricsDisplay from './LyricsDisplay';
import ArtworkPanel from './ArtworkPanel';
import { useStore } from '../store/useStore';

interface Props {
  forExport?: boolean;
}

const VideoPreview: React.FC<Props> = ({ forExport = false }) => {
  const {
    audioUrl,
    artworkUrl,
    logoUrl,
    songMeta,
    lyrics,
    colors,
    currentTime,
    duration,
    isPlaying,
    setCurrentTime,
    setDuration,
    setPlaying,
    isFullscreen,
    setFullscreen,
  } = useStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  // Detect layout
  useEffect(() => {
    const check = () => {
      const el = containerRef.current;
      if (el) setIsPortrait(el.clientHeight > el.clientWidth * 0.75);
    };
    check();
    const obs = new ResizeObserver(check);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Sync audio state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, setPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  }, [setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
      // Auto-play after load
      // audio.play();
    }
  }, [setDuration]);

  const handleEnded = useCallback(() => setPlaying(false), [setPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(duration, ratio * duration));
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, [duration, setCurrentTime]);

  const handleRangeSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, [setCurrentTime]);

  const togglePlay = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }, [setFullscreen]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
      else setFullscreen(true);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [setFullscreen]);

  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  const formatTime = (sec: number) => {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!lyrics) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemp}
      onMouseEnter={showControlsTemp}
      onTouchStart={showControlsTemp}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: forExport ? undefined : isFullscreen ? undefined : '16/9',
        height: isFullscreen ? '100%' : undefined,
        overflow: 'hidden',
        background: '#000',
        cursor: showControls || !isPlaying ? 'default' : 'none',
        borderRadius: isFullscreen || forExport ? 0 : '16px',
        boxShadow: isFullscreen || forExport ? 'none' : '0 24px 80px rgba(0,0,0,0.6)',
      }}
    >
      {/* Hidden audio */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="auto"
        />
      )}

      {/* Animated background */}
      <AnimatedBackground artworkUrl={artworkUrl} colors={colors} />

      {/* Main content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: isPortrait ? 'column' : 'row',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT: Artwork panel */}
        <div
          style={{
            width: isPortrait ? '100%' : 'clamp(200px, 30%, 380px)',
            height: isPortrait ? 'auto' : '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: isPortrait ? '1rem 1rem 0.5rem' : '1rem',
            zIndex: 2,
          }}
        >
          <ArtworkPanel
            artworkUrl={artworkUrl}
            title={songMeta.title}
            artist={songMeta.artist}
            album={songMeta.album}
            currentTime={currentTime}
            duration={duration}
            logoUrl={logoUrl}
            isPlaying={isPlaying}
          />
        </div>

        {/* Divider */}
        {!isPortrait && (
          <div
            style={{
              width: '1px',
              background: 'rgba(255,255,255,0.08)',
              margin: '2.5rem 0',
              flexShrink: 0,
            }}
          />
        )}

        {/* RIGHT: Lyrics */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            minWidth: 0,
          }}
        >
          <LyricsDisplay
            lyrics={lyrics}
            currentTime={currentTime}
            isRendering={forExport}
          />
        </div>
      </div>

      {/* Playback controls overlay */}
      {!forExport && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0.6rem 1rem',
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.45s ease',
            pointerEvents: showControls ? 'auto' : 'none',
            zIndex: 10,
          }}
        >
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          >
            {isPlaying ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                <rect x="14" y="4" width="4" height="16" rx="1.5"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 20,12 5,21"/>
              </svg>
            )}
          </button>

          {/* Time display */}
          <span
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.7rem',
              fontFamily: "'SF Pro Text', monospace",
              flexShrink: 0,
              minWidth: '32px',
            }}
          >
            {formatTime(currentTime)}
          </span>

          {/* Progress bar */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={handleSeek}
          >
            {/* Track */}
            <div
              style={{
                position: 'absolute',
                left: 0, right: 0,
                height: '3px',
                background: 'rgba(255,255,255,0.22)',
                borderRadius: '2px',
              }}
            >
              {/* Fill */}
              <div
                style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '2px',
                  transition: 'width 0.15s linear',
                  position: 'relative',
                }}
              >
                {/* Thumb dot */}
                <div
                  style={{
                    position: 'absolute',
                    right: '-5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            </div>
            {/* Range input for accessibility */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              step="0.1"
              onChange={handleRangeSeek}
              style={{
                position: 'absolute',
                left: 0, right: 0,
                width: '100%',
                opacity: 0,
                cursor: 'pointer',
                height: '18px',
              }}
            />
          </div>

          {/* Duration */}
          <span
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.7rem',
              fontFamily: "'SF Pro Text', monospace",
              flexShrink: 0,
              minWidth: '32px',
              textAlign: 'right',
            }}
          >
            {formatTime(duration)}
          </span>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          >
            {isFullscreen ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Click area for play/pause */}
      {!forExport && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            inset: 0,
            bottom: '54px',
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
};

export default VideoPreview;
