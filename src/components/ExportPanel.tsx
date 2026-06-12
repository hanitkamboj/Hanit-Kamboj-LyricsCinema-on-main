import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { LyricLine } from '../types/lyrics';

interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  quality: 'high' | 'medium' | 'low';
}

const PRESETS = [
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '720p (1280×720)', width: 1280, height: 720 },
];

// ─── Canvas-based frame renderer ──────────────────────────────────────────
class FrameRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  artworkImg: HTMLImageElement | null = null;
  logoImg: HTMLImageElement | null = null;
  width: number;
  height: number;

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async loadImages(artworkUrl: string | null, logoUrl: string | null) {
    const load = (url: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
      });

    if (artworkUrl) this.artworkImg = await load(artworkUrl).catch(() => null);
    if (logoUrl) this.logoImg = await load(logoUrl).catch(() => null);
  }

  renderFrame(
    time: number,
    colors: { primary: string; secondary: string; accent: string },
    songMeta: { title: string; artist: string; album?: string },
    lines: LyricLine[],
    syncMode: 'line' | 'word',
    duration: number
  ) {
    const { ctx, width: W, height: H } = this;

    // ── Background ──────────────────────────────────────────────────────
    ctx.fillStyle = colors.primary;
    ctx.fillRect(0, 0, W, H);

    if (this.artworkImg) {
      const img = this.artworkImg;
      // Animated stretched blurred background
      ctx.save();
      ctx.filter = 'blur(80px) saturate(1.4)';
      const t = time * 0.05;
      const slowX = Math.sin(t) * W * 0.04;
      const slowY = Math.cos(t * 0.8) * H * 0.04;
      const scale = Math.max(W, H) / Math.min(img.width, img.height) * 1.3;
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.globalAlpha = 0.6;
      ctx.drawImage(img, (W - iw) / 2 + slowX, (H - ih) / 2 + slowY, iw, ih);
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.restore();
    }

    // Color overlay
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, colors.primary + 'cc');
    grad.addColorStop(0.5, colors.secondary + '88');
    grad.addColorStop(1, colors.accent + 'cc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // ── Left panel: Artwork ──────────────────────────────────────────────
    const panelW = Math.round(W * 0.32);
    const artSize = Math.round(Math.min(panelW * 0.75, H * 0.38));
    const artX = Math.round((panelW - artSize) / 2);
    const artY = Math.round(H * 0.25);

    // Logo
    if (this.logoImg) {
      const lH = Math.round(H * 0.04);
      const lW = Math.round(this.logoImg.width * (lH / this.logoImg.height));
      const lX = Math.round((panelW - lW) / 2);
      const lY = Math.round(artY - lH - H * 0.03);
      ctx.drawImage(this.logoImg, lX, lY, lW, lH);
    }

    // Artwork
    if (this.artworkImg) {
      const r = Math.round(artSize * 0.06);
      ctx.save();
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = artSize * 0.1;
      ctx.shadowOffsetY = artSize * 0.05;
      // Rounded rect clip
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, r);
      ctx.clip();
      ctx.drawImage(this.artworkImg, artX, artY, artSize, artSize);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, artSize * 0.06);
      ctx.fill();
    }

    // Progress bar
    const pbY = artY + artSize + Math.round(H * 0.025);
    const pbW = artSize;
    const pbH = Math.round(H * 0.004);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(artX, pbY, pbW, pbH, pbH / 2);
    ctx.fill();
    const prog = duration > 0 ? time / duration : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(artX, pbY, Math.round(pbW * prog), pbH, pbH / 2);
    ctx.fill();

    // Song title
    const textY = pbY + pbH + Math.round(H * 0.025);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(H * 0.028)}px "SF Pro Display", Inter, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(songMeta.title || 'Song Title', panelW / 2, textY, panelW - 20);

    // Artist
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.round(H * 0.02)}px "SF Pro Text", Inter, -apple-system, sans-serif`;
    const metaText = [songMeta.artist, songMeta.album].filter(Boolean).join(' · ');
    ctx.fillText(metaText, panelW / 2, textY + Math.round(H * 0.035), panelW - 20);

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelW, H * 0.08);
    ctx.lineTo(panelW, H * 0.92);
    ctx.stroke();

    // ── Right panel: Lyrics ──────────────────────────────────────────────
    const lyricX = panelW + Math.round(W * 0.04);
    const lyricW = W - lyricX - Math.round(W * 0.04);

    // Find active line
    let activeIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const end = lines[i].endTime ?? (lines[i + 1]?.startTime ?? Infinity);
      if (time >= lines[i].startTime && time < end) {
        activeIdx = i;
        break;
      }
      if (time >= lines[i].startTime) activeIdx = i;
    }

    const baseFontSize = Math.round(H * 0.036);
    const lineSpacing = Math.round(H * 0.065);

    // Render window: center active line at 35% from top
    const startLine = Math.max(0, activeIdx - 2);
    const renderLines = lines.slice(startLine, startLine + 8);
    const activeRelIdx = activeIdx - startLine;

    const centerY = H * 0.35;
    const startY = centerY - activeRelIdx * lineSpacing;

    renderLines.forEach((line, i) => {
      const absIdx = startLine + i;
      const status =
        absIdx === activeIdx ? 'active' : absIdx < activeIdx ? 'past' : i === activeRelIdx + 1 || i === activeRelIdx + 2 ? 'near' : 'far';

      let alpha = 0.18;
      let fontSize = baseFontSize * 0.88;
      let fontW = '400';
      if (status === 'active') { alpha = 1; fontSize = baseFontSize; fontW = '700'; }
      else if (status === 'past') { alpha = 0.35; fontSize = baseFontSize * 0.92; fontW = '500'; }
      else if (status === 'near') { alpha = 0.55; fontSize = baseFontSize * 0.95; fontW = '500'; }

      const y = startY + i * lineSpacing;
      if (y < -lineSpacing || y > H + lineSpacing) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${fontW} ${Math.round(fontSize)}px "SF Pro Display", Inter, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      if (status === 'active' && syncMode === 'word' && line.words && line.words.length > 0) {
        // Word-level highlight
        let wordX = lyricX;
        line.words.forEach((word) => {
          const isPast = time >= word.endTime;
          const isWordActive = time >= word.startTime && time < word.endTime;
          const progress = isWordActive
            ? Math.min(1, (time - word.startTime) / (word.endTime - word.startTime))
            : isPast ? 1 : 0;

          const ww = ctx.measureText(word.word + ' ').width;

          // Shadow/dim version
          ctx.fillStyle = isPast || isWordActive ? '#ffffff' : 'rgba(255,255,255,0.25)';
          ctx.fillText(word.word, wordX, y);

          // Bright fill overlay
          if (progress > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(wordX, y - fontSize, ww * progress, fontSize * 1.5);
            ctx.clip();
            ctx.fillStyle = '#ffffff';
            if (isWordActive) {
              ctx.shadowColor = 'rgba(255,255,255,0.8)';
              ctx.shadowBlur = 12;
            }
            ctx.fillText(word.word, wordX, y);
            ctx.restore();
          }

          wordX += ww;
          if (wordX > lyricX + lyricW - 50) {
            wordX = lyricX;
          }
        });
      } else {
        ctx.fillStyle = status === 'active' ? '#ffffff' : status === 'past' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)';
        if (status === 'active') {
          ctx.shadowColor = 'rgba(255,255,255,0.2)';
          ctx.shadowBlur = 20;
        }

        // Word wrap
        const words = line.text.split(' ');
        let lineText = '';
        let ly = y;
        for (const word of words) {
          const test = lineText + (lineText ? ' ' : '') + word;
          if (ctx.measureText(test).width > lyricW && lineText) {
            ctx.fillText(lineText, lyricX, ly);
            lineText = word;
            ly += Math.round(fontSize * 1.3);
          } else {
            lineText = test;
          }
        }
        if (lineText) ctx.fillText(lineText, lyricX, ly);
      }
      ctx.restore();
    });

    // Fade edges
    const fadeTop = ctx.createLinearGradient(0, 0, 0, H * 0.15);
    fadeTop.addColorStop(0, 'rgba(0,0,0,0.5)');
    fadeTop.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fadeTop;
    ctx.fillRect(panelW, 0, W - panelW, H * 0.15);

    const fadeBot = ctx.createLinearGradient(0, H * 0.75, 0, H);
    fadeBot.addColorStop(0, 'rgba(0,0,0,0)');
    fadeBot.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = fadeBot;
    ctx.fillRect(panelW, H * 0.75, W - panelW, H * 0.25);
  }

  getBlob(type = 'image/png'): Promise<Blob> {
    return new Promise((res, rej) =>
      this.canvas.toBlob((b) => (b ? res(b) : rej()), type)
    );
  }
}

// ─── Export Panel Component ────────────────────────────────────────────────
const ExportPanel: React.FC = () => {
  const {
    audioFile, artworkUrl, logoUrl,
    songMeta, lyrics, colors, duration,
  } = useStore();

  const [settings, setSettings] = useState<ExportSettings>({
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 'high',
  });
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const abortRef = useRef(false);

  const handleExport = useCallback(async () => {
    if (!audioFile || !lyrics) return;

    setExporting(true);
    setProgress(0);
    setError(null);
    setDownloadUrl(null);
    abortRef.current = false;

    try {
      setStatusMsg('Loading FFmpeg...');

      // Dynamic import of ffmpeg
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        // Parse progress from FFmpeg log
        const timeMatch = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && duration > 0) {
          const secs =
            parseInt(timeMatch[1]) * 3600 +
            parseInt(timeMatch[2]) * 60 +
            parseFloat(timeMatch[3]);
          setProgress(Math.min(95, (secs / duration) * 85 + 10));
        }
      });

      setStatusMsg('Loading FFmpeg WASM core...');
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      if (abortRef.current) return;

      // Render all frames
      setStatusMsg('Initializing frame renderer...');
      const renderer = new FrameRenderer(settings.width, settings.height);
      await renderer.loadImages(artworkUrl, logoUrl);

      if (abortRef.current) return;

      const totalFrames = Math.ceil(duration * settings.fps);
      setStatusMsg(`Rendering ${totalFrames} frames...`);

      const frameBlobs: Uint8Array[] = [];

      for (let frame = 0; frame < totalFrames; frame++) {
        if (abortRef.current) break;
        const time = frame / settings.fps;
        renderer.renderFrame(time, colors, songMeta, lyrics.lines, lyrics.syncMode, duration);

        const blob = await renderer.getBlob('image/jpeg');
        const buf = await blob.arrayBuffer();
        frameBlobs.push(new Uint8Array(buf));
        await ffmpeg.writeFile(`frame${frame.toString().padStart(6, '0')}.jpg`, frameBlobs[frame]);

        if (frame % 30 === 0) {
          setProgress(Math.round((frame / totalFrames) * 70));
          setStatusMsg(`Rendering frames: ${frame}/${totalFrames}`);
          await new Promise((r) => setTimeout(r, 0)); // yield
        }
      }

      if (abortRef.current) return;

      // Write audio
      setStatusMsg('Processing audio...');
      setProgress(72);
      const audioData = await fetchFile(audioFile);
      await ffmpeg.writeFile('audio.mp3', audioData);

      // Encode video
      setProgress(75);
      setStatusMsg('Encoding video...');

      const crf = settings.quality === 'high' ? '18' : settings.quality === 'medium' ? '23' : '28';

      await ffmpeg.exec([
        '-framerate', String(settings.fps),
        '-i', 'frame%06d.jpg',
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', crf,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-shortest',
        '-y',
        'output.mp4',
      ]);

      setProgress(95);
      setStatusMsg('Finalizing...');

      const rawData = await ffmpeg.readFile('output.mp4');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([rawData as any], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      setStatusMsg('Export complete!');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Export failed. Try a shorter song or lower resolution.');
    } finally {
      setExporting(false);
    }
  }, [audioFile, artworkUrl, logoUrl, lyrics, colors, songMeta, duration, settings]);

  const handleAbort = () => {
    abortRef.current = true;
    setExporting(false);
    setStatusMsg('Cancelled');
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        fontFamily: "'SF Pro Text', 'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
        🎬 Export Video
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Resolution preset */}
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Resolution
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSettings((s) => ({ ...s, width: p.width, height: p.height }))}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: 'none',
                  background:
                    settings.width === p.width
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(255,255,255,0.07)',
                  color: settings.width === p.width ? '#fff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* FPS + Quality */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Frame Rate
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[24, 30, 60].map((fps) => (
                <button
                  key={fps}
                  onClick={() => setSettings((s) => ({ ...s, fps }))}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: settings.fps === fps ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                    color: settings.fps === fps ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
                  {fps}fps
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Quality
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setSettings((s) => ({ ...s, quality: q }))}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: settings.quality === q ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                    color: settings.quality === q ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid rgba(251,191,36,0.2)' }}>
        <div style={{ color: 'rgba(251,191,36,0.9)', fontSize: '0.75rem', lineHeight: 1.5 }}>
          ⚡ Runs in your browser via WebAssembly. 1080p@30fps works best. For 4K long videos, use GitHub Actions (see README for free server rendering).
        </div>
      </div>

      {/* Export button */}
      {!exporting ? (
        <button
          onClick={handleExport}
          disabled={!audioFile || !lyrics}
          style={{
            padding: '0.85rem 1.5rem',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            transition: 'all 0.2s',
          }}
        >
          🎬 Export Video ({settings.width}×{settings.height} · {settings.fps}fps)
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>{statusMsg}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{progress}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', height: '6px' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <button
            onClick={handleAbort}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              alignSelf: 'flex-start',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '0.75rem', color: '#f87171', fontSize: '0.82rem', border: '1px solid rgba(239,68,68,0.2)' }}>
          ❌ {error}
        </div>
      )}

      {/* Download */}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={`${songMeta.title || 'lyrics-video'}-${settings.res === 'custom' ? `${settings.customW}x${settings.customH}` : settings.res}.webm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.5rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
          }}
        >
          ⬇️ Download Video
        </a>
      )}
    </div>
  );
};

export default ExportPanel;
