import React, { useEffect, useRef, useMemo } from 'react';
import type { LyricsData, LyricLine, LyricWord } from '../types/lyrics';

interface Props {
  lyrics: LyricsData;
  currentTime: number;
  isRendering?: boolean;
}

// ─── Word-level karaoke highlight (TTML style) ────────────────────────────
const WordHighlight: React.FC<{
  word: LyricWord;
  currentTime: number;
  lineActive: boolean;
}> = React.memo(({ word, currentTime, lineActive }) => {
  const isActive = lineActive && currentTime >= word.startTime && currentTime < word.endTime;
  const isPast = lineActive ? currentTime >= word.endTime : false;
  const isBg = word.isBg;

  const progress =
    isActive && word.endTime > word.startTime
      ? Math.min(1, (currentTime - word.startTime) / Math.max(0.001, word.endTime - word.startTime))
      : isPast ? 1 : 0;

  return (
    <span
      className="inline-block relative select-none"
      style={{
        transition: isActive
          ? 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)'
          : 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: isActive && !isBg ? 'scale(1.07) translateY(-1px)' : 'scale(1) translateY(0)',
        transformOrigin: 'center bottom',
        marginRight: '0.3em',
        willChange: 'transform',
        display: 'inline-flex',
        verticalAlign: 'baseline',
      }}
    >
      {/* Base (dim) layer */}
      <span
        aria-hidden
        style={{
          color: isPast
            ? (isBg ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.78)')
            : lineActive
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(255,255,255,0.22)',
          transition: 'color 0.3s ease',
          userSelect: 'none',
        }}
      >
        {word.word}
      </span>

      {/* Lightning fill — clips to progress width */}
      {progress > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            color: '#ffffff',
            textShadow: isActive && !isBg
              ? '0 0 18px rgba(255,255,255,1), 0 0 36px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.25)'
              : 'none',
            pointerEvents: 'none',
            transition: isActive ? 'none' : 'width 0.1s ease',
          }}
        >
          {word.word}
        </span>
      )}
    </span>
  );
});

// ─── Line status types ────────────────────────────────────────────────────
type LineStatus = 'active' | 'past-1' | 'past-2' | 'past-far' | 'next-1' | 'next-2' | 'next-far';

const getLineStyle = (status: LineStatus): React.CSSProperties => {
  switch (status) {
    case 'active':
      return { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)', fontWeight: 700, color: '#ffffff' };
    case 'past-1':
      return { opacity: 0.45, filter: 'blur(0.8px)', transform: 'scale(0.96)', fontWeight: 500, color: 'rgba(255,255,255,0.8)' };
    case 'past-2':
      return { opacity: 0.28, filter: 'blur(1.5px)', transform: 'scale(0.93)', fontWeight: 400, color: 'rgba(255,255,255,0.7)' };
    case 'past-far':
      return { opacity: 0.14, filter: 'blur(3px)', transform: 'scale(0.9)', fontWeight: 400, color: 'rgba(255,255,255,0.5)' };
    case 'next-1':
      return { opacity: 0.58, filter: 'blur(1px)', transform: 'scale(0.96)', fontWeight: 500, color: 'rgba(255,255,255,0.75)' };
    case 'next-2':
      return { opacity: 0.36, filter: 'blur(2px)', transform: 'scale(0.93)', fontWeight: 400, color: 'rgba(255,255,255,0.6)' };
    case 'next-far':
    default:
      return { opacity: 0.15, filter: 'blur(4px)', transform: 'scale(0.89)', fontWeight: 400, color: 'rgba(255,255,255,0.4)' };
  }
};

const getStatus = (idx: number, activeIdx: number): LineStatus => {
  const diff = idx - activeIdx;
  if (diff === 0) return 'active';
  if (diff === -1) return 'past-1';
  if (diff === -2) return 'past-2';
  if (diff < -2) return 'past-far';
  if (diff === 1) return 'next-1';
  if (diff === 2) return 'next-2';
  return 'next-far';
};

// ─── Individual line ────────────────────────────────────────────────────
const LyricLineItem: React.FC<{
  line: LyricLine;
  status: LineStatus;
  currentTime: number;
  index: number;
  syncMode: 'line' | 'word';
  baseFontSize: number;
}> = React.memo(({ line, status, currentTime, index, syncMode, baseFontSize }) => {
  const style = getLineStyle(status);
  const isActive = status === 'active';
  const hasWordSync = syncMode === 'word' && line.words && line.words.length > 0;
  const isBg = line.isBg;

  // Background vocals are smaller and often italic/dimmer
  const fontSize = isBg ? baseFontSize * 0.75 : baseFontSize;
  const fontStyle = isBg ? 'italic' : 'normal';

  return (
    <div
      data-line-index={index}
      className={`lyrics-line ${isBg ? 'bg-lyric' : ''}`}
      style={{
        opacity: isBg && isActive ? 0.8 : style.opacity,
        filter: style.filter,
        transform: `${style.transform} ${isBg ? 'scale(0.9)' : ''}`,
        transformOrigin: 'left center',
        fontWeight: isBg ? 500 : style.fontWeight,
        transition: [
          'opacity 0.5s cubic-bezier(0.4,0,0.2,1)',
          'filter 0.5s cubic-bezier(0.4,0,0.2,1)',
          'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        ].join(', '),
        willChange: 'transform, opacity, filter',
        marginBottom: `${baseFontSize * 0.6}px`,
        lineHeight: 1.25,
        fontSize: `${fontSize}px`,
        fontStyle,
        color: isBg ? 'rgba(255,255,255,0.7)' : 'inherit',
        fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        letterSpacing: '-0.015em',
        userSelect: 'none',
        cursor: 'default',
        textShadow: isActive && !isBg ? '0 2px 20px rgba(255,255,255,0.15)' : 'none',
        textAlign: isBg ? 'right' : 'left', // often BG vocals are aligned to the right or indented
        paddingLeft: isBg ? '2rem' : '0',
      }}
    >
      {hasWordSync ? (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0, justifyContent: isBg ? 'flex-end' : 'flex-start', width: '100%' }}>
          {line.words!.map((word, wi) => (
            <WordHighlight
              key={wi}
              word={word}
              currentTime={currentTime}
              lineActive={isActive}
            />
          ))}
        </span>
      ) : (
        <span
          style={{
            color: style.color,
            transition: 'color 0.4s ease, text-shadow 0.4s ease',
            textShadow: isActive && !isBg ? '0 0 30px rgba(255,255,255,0.25)' : 'none',
          }}
        >
          {line.text}
        </span>
      )}
    </div>
  );
});

// ─── Main lyrics display ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LyricsDisplay: React.FC<Props> = ({ lyrics, currentTime, isRendering: _isRendering = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number>(0);
  const currentScrollRef = useRef<number>(0);
  const targetScrollRef = useRef<number>(0);
  const lastActiveRef = useRef<number>(-1);
  const isScrollingRef = useRef<boolean>(false);

  // Find active line
  const activeIdx = useMemo(() => {
    const lines = lyrics.lines;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const end = lines[i].endTime ?? (lines[i + 1]?.startTime ?? Infinity);
      if (currentTime >= lines[i].startTime && currentTime < end) {
        return i;
      }
      if (currentTime >= lines[i].startTime) idx = i;
    }
    return idx;
  }, [lyrics, currentTime]);

  // Smooth scroll loop — runs continuously, interpolates toward target
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    currentScrollRef.current = container.scrollTop;

    const smoothScroll = () => {
      const diff = targetScrollRef.current - currentScrollRef.current;
      const speed = 0.065; // Lower = smoother/slower
      if (Math.abs(diff) > 0.3) {
        currentScrollRef.current += diff * speed;
        container.scrollTop = currentScrollRef.current;
        isScrollingRef.current = true;
      } else {
        isScrollingRef.current = false;
      }
      scrollAnimRef.current = requestAnimationFrame(smoothScroll);
    };

    scrollAnimRef.current = requestAnimationFrame(smoothScroll);
    return () => cancelAnimationFrame(scrollAnimRef.current);
  }, []);

  // Update scroll target when active line changes
  useEffect(() => {
    if (activeIdx === lastActiveRef.current) return;
    lastActiveRef.current = activeIdx;
    if (activeIdx < 0) return;

    const container = containerRef.current;
    if (!container) return;

    const lineEl = container.querySelector(`[data-line-index="${activeIdx}"]`) as HTMLElement;
    if (!lineEl) return;

    const containerH = container.clientHeight;
    const lineTop = lineEl.offsetTop;
    const lineH = lineEl.clientHeight;

    // Active line positioned slightly above mid
    const desired = lineTop - containerH * 0.45 + lineH / 2;
    targetScrollRef.current = Math.max(0, desired);
  }, [activeIdx]);

  // Compute font size responsively
  const [baseFontSize, setBaseFontSize] = React.useState(28);

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = Math.max(16, Math.min(36, vw * 0.025, vh * 0.045));
      setBaseFontSize(Math.round(size));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div
      ref={containerRef}
      className="lyrics-scroll-container"
      style={{
        height: '100%',
        overflowY: 'scroll',
        overflowX: 'hidden',
        position: 'relative',
        paddingTop: '45vh',
        paddingBottom: '50vh',
        paddingLeft: 'clamp(1.25rem, 4vw, 3rem)',
        paddingRight: 'clamp(1rem, 3vw, 2rem)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {lyrics.lines.map((line, i) => (
        <LyricLineItem
          key={i}
          line={line}
          status={getStatus(i, activeIdx)}
          currentTime={currentTime}
          index={i}
          syncMode={lyrics.syncMode}
          baseFontSize={baseFontSize}
        />
      ))}
    </div>
  );
};

export default LyricsDisplay;
