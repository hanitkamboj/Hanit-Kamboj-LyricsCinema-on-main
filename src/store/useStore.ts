import { create } from 'zustand';
import type { LyricsData, SongMeta } from '../types/lyrics';

export type AppStep = 'upload' | 'editor' | 'preview' | 'export';

interface AppColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface AppState {
  step: AppStep;
  audioFile: File | null;
  audioUrl: string | null;
  artworkFile: File | null;
  artworkUrl: string | null;
  logoFile: File | null;
  logoUrl: string | null;
  songMeta: SongMeta;
  lyrics: LyricsData | null;
  colors: AppColors;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isFetchingLyrics: boolean;
  fetchError: string | null;
  isFullscreen: boolean;

  setStep: (step: AppStep) => void;
  setAudioFile: (file: File, url: string) => void;
  setArtwork: (file: File, url: string) => void;
  setLogo: (file: File, url: string) => void;
  setSongMeta: (meta: Partial<SongMeta>) => void;
  setLyrics: (data: LyricsData | null) => void;
  setColors: (colors: AppColors) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setPlaying: (p: boolean) => void;
  setFetchingLyrics: (b: boolean) => void;
  setFetchError: (e: string | null) => void;
  setFullscreen: (b: boolean) => void;
  reset: () => void;
}

const defaultColors: AppColors = {
  primary: '#1a0a2e',
  secondary: '#16213e',
  accent: '#2d1b69',
};

export const useStore = create<AppState>((set) => ({
  step: 'upload',
  audioFile: null,
  audioUrl: null,
  artworkFile: null,
  artworkUrl: null,
  logoFile: null,
  logoUrl: null,
  songMeta: { title: '', artist: '', album: '' },
  lyrics: null,
  colors: defaultColors,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isFetchingLyrics: false,
  fetchError: null,
  isFullscreen: false,

  setStep: (step) => set({ step }),
  setAudioFile: (file, url) => set({ audioFile: file, audioUrl: url }),
  setArtwork: (file, url) => set({ artworkFile: file, artworkUrl: url }),
  setLogo: (file, url) => set({ logoFile: file, logoUrl: url }),
  setSongMeta: (meta) =>
    set((s) => ({ songMeta: { ...s.songMeta, ...meta } })),
  setLyrics: (data) => set({ lyrics: data }),
  setColors: (colors) => set({ colors }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setPlaying: (p) => set({ isPlaying: p }),
  setFetchingLyrics: (b) => set({ isFetchingLyrics: b }),
  setFetchError: (e) => set({ fetchError: e }),
  setFullscreen: (b) => set({ isFullscreen: b }),
  reset: () =>
    set({
      step: 'upload',
      audioFile: null,
      audioUrl: null,
      artworkFile: null,
      artworkUrl: null,
      logoFile: null,
      logoUrl: null,
      songMeta: { title: '', artist: '', album: '' },
      lyrics: null,
      colors: defaultColors,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isFetchingLyrics: false,
      fetchError: null,
    }),
}));
