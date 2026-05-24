import { parseLRC } from './parsers';
import type { LyricsData } from '../types/lyrics';

export interface LrclibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

export async function fetchLyrics(
  title: string,
  artist: string,
  album?: string,
  duration?: number
): Promise<{ data: LyricsData; meta: LrclibResult } | null> {
  try {
    // Build query params
    const params = new URLSearchParams();
    params.set('track_name', title);
    params.set('artist_name', artist);
    if (album) params.set('album_name', album);
    if (duration) params.set('duration', String(Math.round(duration)));

    const url = `https://lrclib.net/api/get?${params.toString()}`;
    const res = await fetch(url);

    if (res.status === 404) {
      // Try search fallback
      return await searchLyrics(title, artist);
    }

    if (!res.ok) return null;

    const json: LrclibResult = await res.json();

    if (json.syncedLyrics) {
      const data = parseLRC(json.syncedLyrics);
      data.source = 'fetched';
      return { data, meta: json };
    } else if (json.plainLyrics) {
      // No timestamps — use plain text
      const lines = json.plainLyrics
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text, i) => ({
          startTime: i * 3,
          endTime: (i + 1) * 3 - 0.1,
          text,
        }));
      return {
        data: { lines, source: 'fetched', syncMode: 'line' },
        meta: json,
      };
    }
    return null;
  } catch (e) {
    console.error('LRCLib fetch error', e);
    return null;
  }
}

async function searchLyrics(
  title: string,
  artist: string
): Promise<{ data: LyricsData; meta: LrclibResult } | null> {
  try {
    const q = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://lrclib.net/api/search?q=${q}`);
    if (!res.ok) return null;
    const results: LrclibResult[] = await res.json();
    if (!results || results.length === 0) return null;

    const best = results[0];
    if (best.syncedLyrics) {
      const data = parseLRC(best.syncedLyrics);
      data.source = 'fetched';
      return { data, meta: best };
    }
    return null;
  } catch {
    return null;
  }
}
