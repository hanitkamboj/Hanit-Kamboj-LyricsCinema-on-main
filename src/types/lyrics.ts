export interface LyricWord {
  word: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

export interface LyricLine {
  startTime: number;     // seconds
  endTime?: number;      // seconds (optional, computed from next line or duration)
  text: string;
  words?: LyricWord[];   // for TTML / Enhanced LRC word-level sync
  isActive?: boolean;
  isPast?: boolean;
}

export type LyricsSource = 'fetched' | 'lrc' | 'srt' | 'ttml' | 'manual';
export type SyncMode = 'line' | 'word';

export interface LyricsData {
  lines: LyricLine[];
  source: LyricsSource;
  syncMode: SyncMode;
}

export interface SongMeta {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}
