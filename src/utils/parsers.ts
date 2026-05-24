import type { LyricLine, LyricWord, LyricsData } from '../types/lyrics';

// ─── LRC parser ────────────────────────────────────────────────────────────
function parseLrcTimestamp(ts: string): number {
  // [mm:ss.xx] or [mm:ss.xxx]
  const match = ts.match(/(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;
  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  const ms = parseInt(match[3].padEnd(3, '0'), 10);
  return min * 60 + sec + ms / 1000;
}

function parseEnhancedLrcWords(text: string): LyricWord[] | undefined {
  // Enhanced LRC: <mm:ss.xx>word
  const wordRegex = /<(\d+:\d+\.\d+)>([^<]*)/g;
  const words: LyricWord[] = [];
  let match;
  while ((match = wordRegex.exec(text)) !== null) {
    const startTime = parseLrcTimestamp(match[1]);
    const word = match[2].trim();
    if (word) words.push({ word, startTime, endTime: 0 });
  }
  if (words.length === 0) return undefined;
  // Fill endTime from next word
  for (let i = 0; i < words.length - 1; i++) {
    words[i].endTime = words[i + 1].startTime;
  }
  if (words.length > 0) {
    words[words.length - 1].endTime = words[words.length - 1].startTime + 3;
  }
  return words;
}

export function parseLRC(content: string): LyricsData {
  const lines: LyricLine[] = [];
  const rawLines = content.split('\n');
  let hasWordSync = false;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Skip metadata tags
    if (/^\[(?:ti|ar|al|by|offset|length|re|ve):/.test(trimmed)) continue;

    // Match timestamp(s)
    const tsMatches = [...trimmed.matchAll(/\[(\d+:\d+\.\d+)\]/g)];
    if (tsMatches.length === 0) continue;

    // Remove timestamps to get text
    let text = trimmed.replace(/\[\d+:\d+\.\d+\]/g, '').trim();

    // Check for enhanced LRC word timestamps
    const words = parseEnhancedLrcWords(text);
    if (words && words.length > 0) {
      hasWordSync = true;
      // Strip word timestamps from display text
      text = text.replace(/<\d+:\d+\.\d+>/g, '').trim();
    }

    for (const m of tsMatches) {
      const startTime = parseLrcTimestamp(m[1]);
      lines.push({ startTime, text, words });
    }
  }

  // Sort by time
  lines.sort((a, b) => a.startTime - b.startTime);

  // Compute endTimes
  for (let i = 0; i < lines.length - 1; i++) {
    lines[i].endTime = lines[i + 1].startTime - 0.05;
  }
  if (lines.length > 0) {
    lines[lines.length - 1].endTime = (lines[lines.length - 1].startTime) + 5;
  }

  return {
    lines,
    source: 'lrc',
    syncMode: hasWordSync ? 'word' : 'line',
  };
}

// ─── SRT parser ────────────────────────────────────────────────────────────
function parseSrtTime(ts: string): number {
  // hh:mm:ss,mmm
  const match = ts.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return 0;
  return (
    parseInt(match[1], 10) * 3600 +
    parseInt(match[2], 10) * 60 +
    parseInt(match[3], 10) +
    parseInt(match[4].padEnd(3, '0'), 10) / 1000
  );
}

export function parseSRT(content: string): LyricsData {
  const lines: LyricLine[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const bLines = block.trim().split('\n');
    if (bLines.length < 3) continue;
    // bLines[0] = index, bLines[1] = timestamps, bLines[2+] = text
    const timeLine = bLines[1];
    const timeMatch = timeLine.match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/);
    if (!timeMatch) continue;
    const startTime = parseSrtTime(timeMatch[1]);
    const endTime = parseSrtTime(timeMatch[2]);
    const text = bLines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) {
      lines.push({ startTime, endTime, text });
    }
  }

  return { lines, source: 'srt', syncMode: 'line' };
}

// ─── TTML parser ───────────────────────────────────────────────────────────
function parseTTMLTime(ts: string): number {
  if (!ts) return 0;
  // Format: HH:MM:SS.mmm or MM:SS.mmm or just seconds
  const parts = ts.split(':');
  if (parts.length === 3) {
    return (
      parseFloat(parts[0]) * 3600 +
      parseFloat(parts[1]) * 60 +
      parseFloat(parts[2])
    );
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(ts.replace('s', ''));
}

export function parseTTML(content: string): LyricsData {
  const lines: LyricLine[] = [];
  let hasWordSync = false;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // Get all <p> elements (lines)
    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach((p) => {
      const lineBegin = p.getAttribute('begin') || p.getAttribute('xml:begin') || '';
      const lineEnd = p.getAttribute('end') || p.getAttribute('xml:end') || '';
      const startTime = parseTTMLTime(lineBegin);
      const endTime = parseTTMLTime(lineEnd);

      // Collect spans (words)
      const spans = p.querySelectorAll('span');
      const words: LyricWord[] = [];
      let lineText = '';

      if (spans.length > 0) {
        spans.forEach((span) => {
          const wBegin = span.getAttribute('begin') || span.getAttribute('xml:begin') || '';
          const wEnd = span.getAttribute('end') || span.getAttribute('xml:end') || '';
          const wText = span.textContent?.trim() || '';
          if (wText) {
            lineText += (lineText ? ' ' : '') + wText;
            if (wBegin) {
              hasWordSync = true;
              words.push({
                word: wText,
                startTime: parseTTMLTime(wBegin),
                endTime: wEnd ? parseTTMLTime(wEnd) : parseTTMLTime(wBegin) + 0.5,
              });
            }
          }
        });
      } else {
        lineText = p.textContent?.trim() || '';
      }

      if (lineText && startTime >= 0) {
        lines.push({
          startTime,
          endTime: endTime || undefined,
          text: lineText,
          words: words.length > 0 ? words : undefined,
        });
      }
    });
  } catch (e) {
    console.error('TTML parse error', e);
  }

  // Sort
  lines.sort((a, b) => a.startTime - b.startTime);

  // Fill missing endTimes
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].endTime) {
      lines[i].endTime = lines[i + 1].startTime - 0.05;
    }
  }
  if (lines.length > 0 && !lines[lines.length - 1].endTime) {
    lines[lines.length - 1].endTime = lines[lines.length - 1].startTime + 5;
  }

  return {
    lines,
    source: 'ttml',
    syncMode: hasWordSync ? 'word' : 'line',
  };
}

// ─── Plain text to line-based ────────────────────────────────────────────
export function parsePlainText(content: string): LyricsData {
  const rawLines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const lines: LyricLine[] = rawLines.map((text, i) => ({
    startTime: i * 3,
    endTime: (i + 1) * 3 - 0.1,
    text,
  }));
  return { lines, source: 'manual', syncMode: 'line' };
}

// ─── Auto-detect format ───────────────────────────────────────────────────
export function autoParseFile(content: string, filename: string): LyricsData {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ttml') || lower.endsWith('.xml')) return parseTTML(content);
  if (lower.endsWith('.srt')) return parseSRT(content);
  if (lower.endsWith('.lrc')) return parseLRC(content);
  // Try to detect from content
  if (content.includes('<tt ') || content.includes('<body') || content.includes('<p ')) return parseTTML(content);
  if (/^\d+\s*\n\d+:\d+:\d+/.test(content.trim())) return parseSRT(content);
  if (/^\[\d+:\d+\.\d+\]/.test(content.trim())) return parseLRC(content);
  return parsePlainText(content);
}
