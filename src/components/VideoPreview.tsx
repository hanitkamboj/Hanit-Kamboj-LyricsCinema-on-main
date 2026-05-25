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
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (audioRef.current && !audioElement) {
      setAudioElement(audioRef.current);
    }
  }, [audioRef.current]);

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

  // Keyboard controls for screen recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) {
          const newTime = Math.max(0, audioRef.current.currentTime - 5);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current) {
          const newTime = Math.min(duration, audioRef.current.currentTime + 5);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, setCurrentTime, setPlaying]);

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
      id="video-preview-container"
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
      <AnimatedBackground 
        artworkUrl={artworkUrl} 
        colors={colors} 
        audioElement={audioElement} 
      />

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

      {/* Click area for play/pause (hidden, no visual overlay) */}
      {!forExport && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
};

export default VideoPreview;
