import React, { useCallback, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { autoParseFile } from '../utils/parsers';
import { fetchLyrics } from '../utils/lrclib';
import { fetchSpotifyData } from '../utils/spotify';
import { extractColors } from '../utils/colorExtract';

// ─── Drop Zone ─────────────────────────────────────────────────────────────
const DropZone: React.FC<{
  label: string;
  accept: string;
  icon: string;
  value: string | null;
  onChange: (file: File) => void;
  hint?: string;
  optional?: boolean;
  preview?: string | null;
}> = ({ label, accept, icon, value, onChange, hint, optional, preview }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onChange(file);
    },
    [onChange]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${
          dragging
            ? 'rgba(255,255,255,0.7)'
            : value
            ? 'rgba(74,222,128,0.4)'
            : 'rgba(255,255,255,0.15)'
        }`,
        borderRadius: '14px',
        padding: '1rem',
        cursor: 'pointer',
        background: dragging
          ? 'rgba(255,255,255,0.06)'
          : value
          ? 'rgba(74,222,128,0.04)'
          : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.45rem',
        userSelect: 'none',
        minHeight: '100px',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = '';
        }}
      />

      {/* Preview thumbnail */}
      {preview && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${preview})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25,
          }}
        />
      )}

      <div style={{ fontSize: '1.5rem', zIndex: 1 }}>{icon}</div>
      <div
        style={{
          color: value ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.5)',
          fontSize: '0.78rem',
          textAlign: 'center',
          fontWeight: 600,
          zIndex: 1,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          padding: '0 0.5rem',
        }}
      >
        {value ? `✓ ${value}` : label}
      </div>
      {hint && !value && (
        <div
          style={{
            color: 'rgba(255,255,255,0.28)',
            fontSize: '0.68rem',
            zIndex: 1,
          }}
        >
          {hint}
          {optional ? ' · optional' : ''}
        </div>
      )}
    </div>
  );
};

// ─── Input Field ───────────────────────────────────────────────────────────
const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
    <label
      style={{
        color: 'rgba(255,255,255,0.45)',
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '0.6rem 0.85rem',
        color: '#ffffff',
        fontSize: '0.88rem',
        outline: 'none',
        fontFamily: "'SF Pro Text', 'Inter', -apple-system, sans-serif",
        transition: 'border-color 0.2s',
        width: '100%',
        boxSizing: 'border-box',
      }}
      onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.35)')}
      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
    />
  </div>
);

// ─── Upload Step ───────────────────────────────────────────────────────────
const UploadStep: React.FC = () => {
  const {
    audioFile,
    setAudioFile,
    artworkUrl,
    setArtwork,
    logoUrl,
    setLogo,
    songMeta,
    setSongMeta,
    lyrics,
    setLyrics,
    setColors,
    setStep,
    isFetchingLyrics,
    setFetchingLyrics,
    fetchError,
    setFetchError,
  } = useStore();

  const [lyricsFileName, setLyricsFileName] = useState<string | null>(null);
  const [customLyrics, setCustomLyrics] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [lyricsMode, setLyricsMode] = useState<'auto' | 'spotify' | 'upload' | 'manual'>('auto');

  const handleAudio = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      setAudioFile(file, url);
      // Auto-parse artist/title from filename "Artist - Title.mp3"
      const name = file.name.replace(/\.[^.]+$/, '');
      const parts = name.split(' - ');
      if (parts.length >= 2) {
        setSongMeta({ artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() });
      } else if (!songMeta.title) {
        setSongMeta({ title: name });
      }
    },
    [setAudioFile, setSongMeta, songMeta.title]
  );

  const handleArtwork = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      setArtwork(file, url);
      const colors = await extractColors(url);
      setColors(colors);
    },
    [setArtwork, setColors]
  );

  const handleLogo = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setLogo(file, url);
    },
    [setLogo]
  );

  const handleLyricsFile = useCallback(
    async (file: File) => {
      setLyricsFileName(file.name);
      const text = await file.text();
      const parsed = autoParseFile(text, file.name);
      setLyrics(parsed);
      setFetchError(null);
    },
    [setLyrics, setFetchError]
  );

  const handleFetchLyrics = useCallback(async () => {
    if (!songMeta.title && !songMeta.artist) {
      setFetchError('Please enter song title and/or artist name first.');
      return;
    }
    setFetchingLyrics(true);
    setFetchError(null);
    const result = await fetchLyrics(songMeta.title, songMeta.artist, songMeta.album);
    setFetchingLyrics(false);
    if (result) {
      setLyrics(result.data);
      if (result.meta.albumName && !songMeta.album) {
        setSongMeta({ album: result.meta.albumName });
      }
    } else {
      setFetchError('No synced lyrics found on lrclib.net. Try uploading an LRC/TTML/SRT file.');
    }
  }, [songMeta, setFetchingLyrics, setFetchError, setLyrics, setSongMeta]);

  const handleCustomLyrics = useCallback(() => {
    if (!customLyrics.trim()) return;
    const parsed = autoParseFile(customLyrics, 'lyrics.lrc');
    setLyrics(parsed);
    setFetchError(null);
  }, [customLyrics, setLyrics, setFetchError]);

  const handleFetchSpotifyUrl = useCallback(async () => {
    if (!spotifyUrl.trim()) {
      setFetchError('Please enter a valid Spotify URL.');
      return;
    }
    setFetchingLyrics(true);
    setFetchError(null);
    try {
      const result = await fetchSpotifyData(spotifyUrl);
      if (result && result.data) {
        setSongMeta({
          title: result.data.songName,
          artist: result.data.artistName,
          album: result.data.albumName || '',
        });
        if (result.data.imageUrl) {
          setArtwork(null, result.data.imageUrl);
          try {
            const colors = await extractColors(result.data.imageUrl);
            setColors(colors);
          } catch (e) {
            console.warn('Could not extract colors from Spotify image URL', e);
          }
        }
      }
      if (result && result.lyrics) {
        let plainText = '';
        if (result.lyrics.syncedLyrics && result.lyrics.syncedLyrics.length > 0) {
          plainText = Array.isArray(result.lyrics.syncedLyrics) 
            ? result.lyrics.syncedLyrics.join('\n') 
            : result.lyrics.syncedLyrics;
        }

        if (plainText) {
          const parsed = autoParseFile(plainText, 'spotify.lrc');
          parsed.source = 'spotify';
          setLyrics(parsed);
        } else {
          setFetchError('No synced lyrics found for this Spotify track.');
        }
      }
    } catch (err) {
      setFetchError('Failed to fetch from Spotify API.');
    } finally {
      setFetchingLyrics(false);
    }
  }, [spotifyUrl, setFetchingLyrics, setFetchError, setSongMeta, setArtwork, setColors, setLyrics]);

  const canProceed = !!audioFile && !!lyrics;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a0a18 0%, #150a28 50%, #0a1818 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(1rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 1.5rem)',
        fontFamily: "'SF Pro Display', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.55) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.4rem',
            lineHeight: 1,
          }}
        >
          🎵 LyricCinema
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 'clamp(0.78rem, 1.5vw, 0.95rem)',
            fontWeight: 400,
            letterSpacing: '0.02em',
          }}
        >
          Apple Music · style · lyrics video maker
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
        }}
      >
        {/* ── Section 1: Files ────────────────────────────────────────────── */}
        <Section title="Media Files">
          <div
            className="upload-grid-3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
            }}
          >
            <DropZone
              label="Drop Audio"
              accept="audio/*"
              icon="🎵"
              value={audioFile?.name.replace(/\.[^.]+$/, '') ?? null}
              onChange={handleAudio}
              hint=".mp3 .wav .m4a .flac"
            />
            <DropZone
              label="Drop Artwork"
              accept="image/*"
              icon="🖼️"
              value={artworkUrl ? 'Artwork ready' : null}
              onChange={handleArtwork}
              hint=".jpg .png .webp"
              preview={artworkUrl}
            />
            <DropZone
              label="Drop Logo"
              accept="image/*"
              icon="✨"
              value={logoUrl ? 'Logo ready' : null}
              onChange={handleLogo}
              hint=".png with transparency"
              optional
              preview={logoUrl}
            />
          </div>
        </Section>

        {/* ── Section 2: Song Info ─────────────────────────────────────────── */}
        <Section title="Song Information">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <InputField
              label="Song Title"
              value={songMeta.title}
              onChange={(v) => setSongMeta({ title: v })}
              placeholder="Cruel Summer"
            />
            <InputField
              label="Artist"
              value={songMeta.artist}
              onChange={(v) => setSongMeta({ artist: v })}
              placeholder="Taylor Swift"
            />
            <InputField
              label="Album"
              value={songMeta.album ?? ''}
              onChange={(v) => setSongMeta({ album: v })}
              placeholder="Lover"
            />
          </div>
        </Section>

        {/* ── Section 3: Lyrics ────────────────────────────────────────────── */}
        <Section title="Lyrics">
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'auto', icon: '🔍', label: 'Auto-Fetch' },
                { id: 'spotify', icon: '🔗', label: 'Spotify URL' },
                { id: 'upload', icon: '📁', label: 'Upload File' },
                { id: 'manual', icon: '✏️', label: 'Paste / Write' },
              ] as const
            ).map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setLyricsMode(id)}
                style={{
                  padding: '0.42rem 0.95rem',
                  borderRadius: '20px',
                  border: 'none',
                  background:
                    lyricsMode === id
                      ? 'rgba(255,255,255,0.18)'
                      : 'rgba(255,255,255,0.05)',
                  color:
                    lyricsMode === id ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  fontFamily: "'SF Pro Text', 'Inter', sans-serif",
                  letterSpacing: '0.01em',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Spotify panel */}
          {lyricsMode === 'spotify' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Paste a <strong style={{ color: '#1db954' }}>Spotify Track URL</strong> to automatically fetch metadata,
                cover art, and time-synced lyrics.
              </p>
              <InputField
                label="Spotify URL"
                value={spotifyUrl}
                onChange={setSpotifyUrl}
                placeholder="https://open.spotify.com/track/..."
              />
              <button
                onClick={handleFetchSpotifyUrl}
                disabled={isFetchingLyrics}
                style={{
                  padding: '0.62rem 1.4rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isFetchingLyrics
                    ? 'rgba(29,185,84,0.3)'
                    : '#1db954',
                  color: '#fff',
                  cursor: isFetchingLyrics ? 'not-allowed' : 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  fontFamily: "'SF Pro Text', 'Inter', sans-serif",
                  alignSelf: 'flex-start',
                }}
              >
                {isFetchingLyrics ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>
                      ◌
                    </span>
                    Extracting…
                  </>
                ) : (
                  '🔗 Extract from Spotify'
                )}
              </button>
              
              {lyrics && lyrics.source === 'spotify' && (
                <button
                  onClick={() => {
                    const content = lyrics.lines.map(l => {
                       const m = Math.floor(l.startTime / 60).toString().padStart(2, '0');
                       const s = Math.floor(l.startTime % 60).toString().padStart(2, '0');
                       const ms = Math.floor((l.startTime % 1) * 100).toString().padStart(2, '0');
                       return `[${m}:${s}.${ms}] ${l.text}`;
                    }).join('\n');
                    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    const cleanTitle = (songMeta.title || 'Unknown').replace(/[\\/:*?"<>|]/g, '');
                    const cleanArtist = (songMeta.artist || 'Unknown').replace(/[\\/:*?"<>|]/g, '');
                    a.download = `${cleanTitle} - ${cleanArtist}.lrc`;
                    a.click();
                  }}
                  style={{
                    padding: '0.55rem 1.2rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    alignSelf: 'flex-start',
                    fontFamily: "'SF Pro Text', 'Inter', sans-serif",
                  }}
                >
                  ⬇️ Download .LRC File
                </button>
              )}

              {fetchError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#fca5a5',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                  }}
                >
                  ⚠️ {fetchError}
                </div>
              )}
            </div>
          )}

          {/* Auto-fetch panel */}
          {lyricsMode === 'auto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Fetches time-synced LRC lyrics from{' '}
                <strong style={{ color: 'rgba(255,255,255,0.55)' }}>lrclib.net</strong> using
                the song title and artist. Supports line-sync and word-sync.
              </p>
              <button
                onClick={handleFetchLyrics}
                disabled={isFetchingLyrics}
                style={{
                  padding: '0.62rem 1.4rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isFetchingLyrics
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.12)',
                  color: isFetchingLyrics ? 'rgba(255,255,255,0.4)' : '#fff',
                  cursor: isFetchingLyrics ? 'not-allowed' : 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  fontFamily: "'SF Pro Text', 'Inter', sans-serif",
                  alignSelf: 'flex-start',
                }}
              >
                {isFetchingLyrics ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>
                      ◌
                    </span>
                    Fetching…
                  </>
                ) : (
                  '🔍 Fetch Synced Lyrics'
                )}
              </button>

              {fetchError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#fca5a5',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                  }}
                >
                  ⚠️ {fetchError}
                </div>
              )}
            </div>
          )}

          {/* Upload file panel */}
          {lyricsMode === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Supported:{' '}
                <Tag>LRC</Tag> line/word sync ·{' '}
                <Tag>TTML</Tag> Apple word-level with lightning ·{' '}
                <Tag>SRT</Tag> subtitle format
              </p>
              <DropZone
                label="Drop LRC / TTML / SRT"
                accept=".lrc,.ttml,.xml,.srt,.txt"
                icon="📄"
                value={lyricsFileName}
                onChange={handleLyricsFile}
                hint=".lrc · .ttml · .srt · .txt"
              />
            </div>
          )}

          {/* Manual paste panel */}
          {lyricsMode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Paste LRC format{' '}
                <code style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', padding: '0.1em 0.3em', borderRadius: '4px' }}>
                  [mm:ss.xx] text
                </code>{' '}
                or plain lyrics (no timestamps — evenly spaced).
              </p>
              <textarea
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value)}
                placeholder={
                  '[00:05.00] First line of lyrics\n[00:10.50] Second line here\n[00:15.20] Third line\n\n# Or just paste plain text:\nFirst line\nSecond line'
                }
                spellCheck={false}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  resize: 'vertical',
                  minHeight: '140px',
                  outline: 'none',
                  lineHeight: 1.65,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.25)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                onClick={handleCustomLyrics}
                style={{
                  padding: '0.55rem 1.2rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  alignSelf: 'flex-start',
                  fontFamily: "'SF Pro Text', 'Inter', sans-serif",
                  transition: 'all 0.2s',
                }}
              >
                Parse & Load ↵
              </button>
            </div>
          )}

          {/* Lyrics loaded badge */}
          {lyrics && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.55rem 0.85rem',
                background: 'rgba(74,222,128,0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(74,222,128,0.2)',
                color: '#4ade80',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              ✓ <strong>{lyrics.lines.length} lines</strong> loaded
              <span style={{ color: 'rgba(74,222,128,0.6)' }}>·</span>
              <span style={{ color: 'rgba(74,222,128,0.7)' }}>
                {lyrics.syncMode === 'word' ? '⚡ Word-level sync (TTML/Enhanced LRC)' : '📝 Line sync'}
              </span>
              <span style={{ color: 'rgba(74,222,128,0.6)' }}>·</span>
              <span style={{ color: 'rgba(74,222,128,0.5)' }}>Source: {lyrics.source}</span>
            </div>
          )}
        </Section>

        {/* ── CTA Button ───────────────────────────────────────────────────── */}
        <button
          disabled={!canProceed}
          onClick={() => setStep('preview')}
          style={{
            padding: '0.95rem 2rem',
            borderRadius: '16px',
            border: 'none',
            background: canProceed
              ? 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)'
              : 'rgba(255,255,255,0.04)',
            color: canProceed ? '#ffffff' : 'rgba(255,255,255,0.25)',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            backdropFilter: 'blur(10px)',
            outline: `1px solid ${canProceed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
            outlineOffset: '-1px',
            transition: 'all 0.3s ease',
            boxShadow: canProceed ? '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset' : 'none',
            fontFamily: "'SF Pro Display', 'Inter', sans-serif",
            transform: 'translateZ(0)',
          }}
          onMouseEnter={(e) => {
            if (canProceed) e.currentTarget.style.transform = 'translateY(-1px) translateZ(0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateZ(0)';
          }}
        >
          {canProceed ? '▶ Preview Lyrics Video' : 'Upload audio + lyrics to continue'}
        </button>

        {/* Deployment note */}
        <div
          style={{
            padding: '1rem 1.1rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.28)',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: 'rgba(255,255,255,0.48)' }}>🚀 Free Deployment & Cloud Rendering:</strong>{' '}
          Deploy on{' '}
          <strong style={{ color: 'rgba(255,255,255,0.42)' }}>Vercel</strong>,{' '}
          <strong style={{ color: 'rgba(255,255,255,0.42)' }}>Netlify</strong>, or{' '}
          <strong style={{ color: 'rgba(255,255,255,0.42)' }}>Cloudflare Pages</strong> (all free, no credit card).
          For server-side rendering use{' '}
          <strong style={{ color: 'rgba(255,255,255,0.42)' }}>GitHub Actions</strong> (2,000 free minutes/month) —
          exports via FFmpeg on Ubuntu runners, downloads as artifacts.
        </div>
      </div>
    </div>
  );
};

// ── Helper sub-components ────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '18px',
      padding: '1.15rem 1.1rem',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
    }}
  >
    <div
      style={{
        color: 'rgba(255,255,255,0.65)',
        fontWeight: 700,
        fontSize: '0.8rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const Tag: React.FC<{ children: string }> = ({ children }) => (
  <span
    style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '4px',
      padding: '0.08em 0.4em',
      fontSize: '0.75em',
      fontWeight: 700,
      fontFamily: 'monospace',
      color: 'rgba(255,255,255,0.65)',
      letterSpacing: '0.03em',
    }}
  >
    {children}
  </span>
);

export default UploadStep;
