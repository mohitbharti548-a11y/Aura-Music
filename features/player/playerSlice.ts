// features/player/playerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Song } from '@/types/music';

export type RepeatMode = 'off' | 'all' | 'one';

export interface SleepTimerState {
  targetTimestamp: number | null; // Date.now() + ms
  durationMinutes: number | null;
  active: boolean;
}

interface PlayerState {
  currentTrack: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  recentlyPlayed: Song[];
  // Queue Management
  userQueue: Song[];
  // Modals & Panels
  isExpandedOpen: boolean;
  isQueueOpen: boolean;
  isEqualizerOpen: boolean;
  isSleepTimerOpen: boolean;
  // Sleep Timer
  sleepTimer: SleepTimerState;
  // Equalizer State
  eqPreset: string;
  eqGains: number[];
  eqBassBoost: number;
  eqPreamp: number;
  // Offline Downloaded Tracks ID list
  offlineTrackIds: string[];
  // Dynamic 30-Song Recommendations & Autoplay Radio
  recommendations: Song[];
  recommendationsLoading: boolean;
  isAutoplayEnabled: boolean;
}

const initialState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isShuffle: false,
  repeatMode: 'off',
  recentlyPlayed: [],
  userQueue: [],
  isExpandedOpen: false,
  isQueueOpen: false,
  isEqualizerOpen: false,
  isSleepTimerOpen: false,
  sleepTimer: {
    targetTimestamp: null,
    durationMinutes: null,
    active: false,
  },
  eqPreset: 'Flat',
  eqGains: [0, 0, 0, 0, 0],
  eqBassBoost: 0,
  eqPreamp: 1.0,
  offlineTrackIds: [],
  recommendations: [],
  recommendationsLoading: false,
  isAutoplayEnabled: true,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setTrack(state, action: PayloadAction<Song>) {
      const song = action.payload;
      state.currentTrack = song;
      state.currentTime = 0;
      state.isPlaying = true;

      // Add to recently played (deduplicate & keep latest at front)
      state.recentlyPlayed = [
        song,
        ...state.recentlyPlayed.filter((s) => s.id !== song.id),
      ].slice(0, 20);
    },
    play(state) {
      state.isPlaying = true;
    },
    pause(state) {
      state.isPlaying = false;
    },
    togglePlay(state) {
      state.isPlaying = !state.isPlaying;
    },
    setCurrentTime(state, action: PayloadAction<number>) {
      state.currentTime = action.payload;
    },
    setDuration(state, action: PayloadAction<number>) {
      state.duration = action.payload;
    },
    setVolume(state, action: PayloadAction<number>) {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },
    toggleShuffle(state) {
      state.isShuffle = !state.isShuffle;
    },
    cycleRepeat(state) {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      state.repeatMode = modes[nextIdx];
    },
    setRepeatMode(state, action: PayloadAction<RepeatMode>) {
      state.repeatMode = action.payload;
    },
    // Queue Actions
    addToQueue(state, action: PayloadAction<Song>) {
      state.userQueue.push(action.payload);
    },
    removeFromQueue(state, action: PayloadAction<string>) {
      state.userQueue = state.userQueue.filter((s) => s.id !== action.payload);
    },
    clearQueue(state) {
      state.userQueue = [];
    },
    // Recommendations & Autoplay
    setRecommendations(state, action: PayloadAction<Song[]>) {
      state.recommendations = action.payload;
      state.recommendationsLoading = false;
    },
    setRecommendationsLoading(state, action: PayloadAction<boolean>) {
      state.recommendationsLoading = action.payload;
    },
    toggleAutoplay(state) {
      state.isAutoplayEnabled = !state.isAutoplayEnabled;
    },
    // Next / Previous Track with User Queue & Dynamic Radio Autoplay Priority
    nextTrack(state, action: PayloadAction<Song[]>) {
      const fallbackList = action.payload;

      // 1. If repeat mode is 'one', restart song
      if (state.repeatMode === 'one' && state.currentTrack) {
        state.currentTime = 0;
        state.isPlaying = true;
        return;
      }

      // 2. If user queue has items, consume the next item
      if (state.userQueue.length > 0) {
        const nextFromQueue = state.userQueue.shift()!;
        state.currentTrack = nextFromQueue;
        state.currentTime = 0;
        state.isPlaying = true;
        state.recentlyPlayed = [
          nextFromQueue,
          ...state.recentlyPlayed.filter((s) => s.id !== nextFromQueue.id),
        ].slice(0, 20);
        return;
      }

      // 3. Normal playlist sequence navigation
      if (!state.currentTrack) return;

      const idx = fallbackList.findIndex((t) => t.id === state.currentTrack?.id);

      if (state.isShuffle && fallbackList.length > 1) {
        let randIdx = Math.floor(Math.random() * fallbackList.length);
        if (randIdx === idx) randIdx = (randIdx + 1) % fallbackList.length;
        state.currentTrack = fallbackList[randIdx];
        state.currentTime = 0;
        state.isPlaying = true;
      } else if (idx !== -1 && idx < fallbackList.length - 1) {
        state.currentTrack = fallbackList[idx + 1];
        state.currentTime = 0;
        state.isPlaying = true;
      } else if (state.repeatMode === 'all' && fallbackList.length > 0) {
        state.currentTrack = fallbackList[0];
        state.currentTime = 0;
        state.isPlaying = true;
      } else if (state.isAutoplayEnabled && state.recommendations.length > 0) {
        // 4. SPOTIFY-STYLE INFINITE RADIO AUTOPLAY
        const nextRecommended = state.recommendations.shift()!;
        state.currentTrack = nextRecommended;
        state.currentTime = 0;
        state.isPlaying = true;
      } else {
        state.isPlaying = false;
        state.currentTime = 0;
        return;
      }

      if (state.currentTrack) {
        state.recentlyPlayed = [
          state.currentTrack,
          ...state.recentlyPlayed.filter((s) => s.id !== state.currentTrack?.id),
        ].slice(0, 20);
      }
    },
    previousTrack(state, action: PayloadAction<Song[]>) {
      const fallbackList = action.payload;
      if (!state.currentTrack || fallbackList.length === 0) return;

      if (state.currentTime > 3) {
        state.currentTime = 0;
        return;
      }

      const idx = fallbackList.findIndex((t) => t.id === state.currentTrack?.id);

      if (state.isShuffle && fallbackList.length > 1) {
        let randIdx = Math.floor(Math.random() * fallbackList.length);
        if (randIdx === idx) randIdx = (randIdx - 1 + fallbackList.length) % fallbackList.length;
        state.currentTrack = fallbackList[randIdx];
      } else {
        state.currentTrack = fallbackList[(idx - 1 + fallbackList.length) % fallbackList.length];
      }
      state.currentTime = 0;
      state.isPlaying = true;
    },
    // Expanded Player & Modal Panels
    setExpandedOpen(state, action: PayloadAction<boolean>) {
      state.isExpandedOpen = action.payload;
    },
    setQueueOpen(state, action: PayloadAction<boolean>) {
      state.isQueueOpen = action.payload;
    },
    setEqualizerOpen(state, action: PayloadAction<boolean>) {
      state.isEqualizerOpen = action.payload;
    },
    setSleepTimerOpen(state, action: PayloadAction<boolean>) {
      state.isSleepTimerOpen = action.payload;
    },
    // Sleep Timer Controls
    setSleepTimer(state, action: PayloadAction<number | null>) {
      const minutes = action.payload;
      if (minutes === null || minutes <= 0) {
        state.sleepTimer = { targetTimestamp: null, durationMinutes: null, active: false };
      } else {
        state.sleepTimer = {
          targetTimestamp: Date.now() + minutes * 60 * 1000,
          durationMinutes: minutes,
          active: true,
        };
      }
    },
    cancelSleepTimer(state) {
      state.sleepTimer = { targetTimestamp: null, durationMinutes: null, active: false };
    },
    // Equalizer Controls
    setEQPreset(state, action: PayloadAction<{ preset: string; gains: number[] }>) {
      state.eqPreset = action.payload.preset;
      state.eqGains = action.payload.gains;
    },
    setEQGain(state, action: PayloadAction<{ bandIndex: number; gain: number }>) {
      state.eqGains[action.payload.bandIndex] = action.payload.gain;
      state.eqPreset = 'Custom';
    },
    setEQBassBoost(state, action: PayloadAction<number>) {
      state.eqBassBoost = action.payload;
    },
    setEQPreamp(state, action: PayloadAction<number>) {
      state.eqPreamp = action.payload;
    },
    // Offline Tracks
    setOfflineTrackIds(state, action: PayloadAction<string[]>) {
      state.offlineTrackIds = action.payload;
    },
    addOfflineTrackId(state, action: PayloadAction<string>) {
      if (!state.offlineTrackIds.includes(action.payload)) {
        state.offlineTrackIds.push(action.payload);
      }
    },
    removeOfflineTrackId(state, action: PayloadAction<string>) {
      state.offlineTrackIds = state.offlineTrackIds.filter((id) => id !== action.payload);
    },
  },
});

export const {
  setTrack,
  play,
  pause,
  togglePlay,
  setCurrentTime,
  setDuration,
  setVolume,
  toggleShuffle,
  cycleRepeat,
  setRepeatMode,
  addToQueue,
  removeFromQueue,
  clearQueue,
  nextTrack,
  previousTrack,
  setExpandedOpen,
  setQueueOpen,
  setEqualizerOpen,
  setSleepTimerOpen,
  setSleepTimer,
  cancelSleepTimer,
  setEQPreset,
  setEQGain,
  setEQBassBoost,
  setEQPreamp,
  setOfflineTrackIds,
  addOfflineTrackId,
  removeOfflineTrackId,
  setRecommendations,
  setRecommendationsLoading,
  toggleAutoplay,
} = playerSlice.actions;

export default playerSlice.reducer;
