import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import VideoPreview from './VideoPreview';
import ExportPanel from './ExportPanel';
import LyricsEditor from './LyricsEditor';

const PreviewScreen: React.FC = () => {
  const { setStep, songMeta, lyrics } = useStore();
  const [showExport, setShowExport] = useState(false);

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
            onClick={() => setShowExport(!showExport)}
            style={{
              padding: '0.42rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: showExport
                ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'all 0.2s',
              boxShadow: showExport ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
            }}
          >
            {showExport ? '✕ Close' : '🎬 Export'}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: showExport ? 'minmax(0,1fr) 300px' : '1fr',
          gap: '1rem',
          alignItems: 'start',
          transition: 'grid-template-columns 0.3s ease',
        }}
      >
        {/* Video preview */}
        <div>
          <VideoPreview />
        </div>

        {/* Export panel */}
        {showExport && (
          <div
            style={{
              position: 'sticky',
              top: '1rem',
              maxHeight: 'calc(100vh - 4rem)',
              overflowY: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            <ExportPanel />

            {/* Lyrics timing editor */}
            <LyricsEditor />

            {/* GitHub Actions info */}
            <div
              style={{
                marginTop: '1rem',
                background: 'rgba(255,255,255,0.025)',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '1rem',
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.38)',
                lineHeight: 1.75,
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                🚀 Free Cloud Rendering via GitHub Actions
              </div>
              <p>
                GitHub gives <strong style={{ color: 'rgba(255,255,255,0.55)' }}>2,000 free minutes/month</strong> (no credit card).
                Fork this repo, push your files, trigger the render workflow — download your MP4 from artifacts.
              </p>
              <br/>
              <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Free Deploy Platforms:</strong>
              <ul style={{ marginTop: '0.4rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <li>▸ <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Vercel</strong> — instant deploy from GitHub</li>
                <li>▸ <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Netlify</strong> — drag & drop or GitHub CI</li>
                <li>▸ <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Cloudflare Pages</strong> — global CDN, free</li>
                <li>▸ <strong style={{ color: 'rgba(255,255,255,0.5)' }}>GitHub Pages</strong> — static host from repo</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewScreen;
