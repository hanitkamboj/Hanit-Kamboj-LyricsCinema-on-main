import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { LyricLine } from '../types/lyrics';

const LyricsEditor: React.FC = () => {
  const { lyrics, setLyrics, currentTime } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!lyrics) return null;

  const updateLine = (idx: number, field: keyof LyricLine, value: string | number) => {
    const newLines = [...lyrics.lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    setLyrics({ ...lyrics, lines: newLines });
  };

  const setTimeFromCurrent = (idx: number, field: 'startTime' | 'endTime') => {
    updateLine(idx, field, parseFloat(currentTime.toFixed(3)));
  };

  const addLine = (afterIdx: number) => {
    const newLines = [...lyrics.lines];
    const prev = newLines[afterIdx];
    const next = newLines[afterIdx + 1];
    const startTime = prev ? prev.startTime + 1 : 0;
    const endTime = next ? next.startTime - 0.1 : startTime + 3;
    newLines.splice(afterIdx + 1, 0, { startTime, endTime, text: 'New line' });
    setLyrics({ ...lyrics, lines: newLines });
  };

  const removeLine = (idx: number) => {
    const newLines = lyrics.lines.filter((_, i) => i !== idx);
    setLyrics({ ...lyrics, lines: newLines });
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        fontFamily: "'SF Pro Text', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.85rem 1.1rem',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          fontWeight: 700,
          fontFamily: 'inherit',
        }}
      >
        <span>✏️ Edit Timing ({lyrics.lines.length} lines)</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.15) transparent',
          }}
        >
          {lyrics.lines.map((line, idx) => {
            const isActive =
              currentTime >= line.startTime &&
              currentTime < (line.endTime ?? Infinity);

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.85rem',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                {/* Index */}
                <span
                  style={{
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    minWidth: '22px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {/* Start time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                  <input
                    type="number"
                    value={line.startTime.toFixed(2)}
                    step="0.05"
                    min="0"
                    onChange={(e) => updateLine(idx, 'startTime', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '55px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.3rem',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setTimeFromCurrent(idx, 'startTime')}
                    title="Set to current time"
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'rgba(167,139,250,0.2)',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      fontSize: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ●
                  </button>
                </div>

                {/* Text */}
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => updateLine(idx, 'text', e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.2rem 0.45rem',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                    fontSize: '0.75rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.25)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />

                {/* Delete */}
                <button
                  onClick={() => removeLine(idx)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'rgba(239,68,68,0.12)',
                    color: 'rgba(239,68,68,0.7)',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>

                {/* Add below */}
                <button
                  onClick={() => addLine(idx)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'rgba(74,222,128,0.12)',
                    color: 'rgba(74,222,128,0.7)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LyricsEditor;
