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
  // Dynamic 10-Song Recommendations & Autoplay Radio
  recommendations: Song[];
  recommendationsLoading: boolean;
  isAutoplayEnabled: boolean;
  // Hidden Tracks (filter out from recommendations, autoplay, and views)
  hiddenTrackIds: string[];
  // Session played history to prevent looping repetition
  sessionPlayedIds: string[];
}

// Safely retrieve hidden tracks from localStorage
function getStoredHiddenTracks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('aura_hidden_tracks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHiddenTracks(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('aura_hidden_tracks', JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to persist hidden tracks:', e);
  }
}

// Safely retrieve last played song and queue session state from localStorage
interface StoredSession {
  currentTrack: Song | null;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  recentlyPlayed: Song[];
  userQueue: Song[];
  recommendations: Song[];
  isAutoplayEnabled: boolean;
  sessionPlayedIds: string[];
}

function getStoredPlayerSession(): Partial<StoredSession> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('aura_last_session');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistPlayerSession(state: PlayerState) {
  if (typeof window === 'undefined') return;
  try {
    const sessionData: StoredSession = {
      currentTrack: state.currentTrack,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      repeatMode: state.repeatMode,
      isShuffle: state.isShuffle,
      recentlyPlayed: state.recentlyPlayed,
      userQueue: state.userQueue,
      recommendations: state.recommendations,
      isAutoplayEnabled: state.isAutoplayEnabled,
      sessionPlayedIds: state.sessionPlayedIds.slice(-50),
    };
    localStorage.setItem('aura_last_session', JSON.stringify(sessionData));
  } catch (e) {
    console.error('Failed to persist player session:', e);
  }
}

const savedSession = getStoredPlayerSession();

const initialState: PlayerState = {
  currentTrack: savedSession?.currentTrack ?? null,
  isPlaying: false, // Paused initially so it loads ready to play at saved position
  currentTime: savedSession?.currentTime ?? 0,
  duration: savedSession?.duration ?? 0,
  volume: savedSession?.volume ?? 0.8,
  isShuffle: savedSession?.isShuffle ?? false,
  repeatMode: savedSession?.repeatMode ?? 'off',
  recentlyPlayed: savedSession?.recentlyPlayed ?? [],
  userQueue: savedSession?.userQueue ?? [],
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
  recommendations: savedSession?.recommendations ?? [],
  recommendationsLoading: false,
  isAutoplayEnabled: savedSession?.isAutoplayEnabled ?? true,
  hiddenTrackIds: getStoredHiddenTracks(),
  sessionPlayedIds: savedSession?.sessionPlayedIds ?? (savedSession?.currentTrack ? [savedSession.currentTrack.id] : []),
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setTrack(state, action: PayloadAction<Song>) {
      const song = action.payload;
      if (state.hiddenTrackIds.includes(song.id)) return;

      // Only restart position if choosing a different track
      if (state.currentTrack?.id !== song.id) {
        state.currentTrack = song;
        state.currentTime = 0;
        state.sessionPlayedIds.push(song.id);
      }
      state.isPlaying = true;

      // Add to recently played (deduplicate & keep latest at front)
      state.recentlyPlayed = [
        song,
        ...state.recentlyPlayed.filter((s) => s.id !== song.id && !state.hiddenTrackIds.includes(s.id)),
      ].slice(0, 20);

      persistPlayerSession(state);
    },
    play(state) {
      state.isPlaying = true;
    },
    pause(state) {
      state.isPlaying = false;
      persistPlayerSession(state);
    },
    togglePlay(state) {
      state.isPlaying = !state.isPlaying;
      persistPlayerSession(state);
    },
    setCurrentTime(state, action: PayloadAction<number>) {
      state.currentTime = action.payload;
    },
    setDuration(state, action: PayloadAction<number>) {
      state.duration = action.payload;
      persistPlayerSession(state);
    },
    setVolume(state, action: PayloadAction<number>) {
      state.volume = Math.max(0, Math.min(1, action.payload));
      persistPlayerSession(state);
    },
    toggleShuffle(state) {
      state.isShuffle = !state.isShuffle;
      persistPlayerSession(state);
    },
    cycleRepeat(state) {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      state.repeatMode = modes[nextIdx];
      persistPlayerSession(state);
    },
    setRepeatMode(state, action: PayloadAction<RepeatMode>) {
      state.repeatMode = action.payload;
      persistPlayerSession(state);
    },
    // Queue Actions
    addToQueue(state, action: PayloadAction<Song>) {
      if (!state.hiddenTrackIds.includes(action.payload.id)) {
        state.userQueue.push(action.payload);
        persistPlayerSession(state);
      }
    },
    removeFromQueue(state, action: PayloadAction<string>) {
      state.userQueue = state.userQueue.filter((s) => s.id !== action.payload);
      persistPlayerSession(state);
    },
    clearQueue(state) {
      state.userQueue = [];
      persistPlayerSession(state);
    },
    // Recommendations & Sliding 10-Song Queue
    setRecommendations(state, action: PayloadAction<Song[]>) {
      const currentId = state.currentTrack?.id;
      state.recommendations = action.payload
        .filter((s) => s.id !== currentId && !state.hiddenTrackIds.includes(s.id))
        .slice(0, 10);
      state.recommendationsLoading = false;
      persistPlayerSession(state);
    },
    appendRecommendations(state, action: PayloadAction<Song[]>) {
      const existingIds = new Set<string>([
        ...(state.currentTrack ? [state.currentTrack.id] : []),
        ...state.recommendations.map((s) => s.id),
        ...state.userQueue.map((s) => s.id),
        ...state.hiddenTrackIds,
      ]);
      const newItems = action.payload.filter((s) => !existingIds.has(s.id));
      state.recommendations = [...state.recommendations, ...newItems].slice(0, 10);
      state.recommendationsLoading = false;
      persistPlayerSession(state);
    },
    playTrackFromRecommendations(state, action: PayloadAction<number>) {
      const index = action.payload;
      if (index < 0 || index >= state.recommendations.length) return;

      const chosenSong = state.recommendations[index];
      // Discard skipped songs before index and remove chosen song from queue
      state.recommendations = state.recommendations.slice(index + 1);

      state.currentTrack = chosenSong;
      state.currentTime = 0;
      state.isPlaying = true;
      state.sessionPlayedIds.push(chosenSong.id);

      state.recentlyPlayed = [
        chosenSong,
        ...state.recentlyPlayed.filter((s) => s.id !== chosenSong.id && !state.hiddenTrackIds.includes(s.id)),
      ].slice(0, 20);

      persistPlayerSession(state);
    },
    setRecommendationsLoading(state, action: PayloadAction<boolean>) {
      state.recommendationsLoading = action.payload;
    },
    toggleAutoplay(state) {
      state.isAutoplayEnabled = !state.isAutoplayEnabled;
      persistPlayerSession(state);
    },
    // Hide / Don't play track features
    hideTrack(state, action: PayloadAction<string>) {
      const trackId = action.payload;
      if (!state.hiddenTrackIds.includes(trackId)) {
        state.hiddenTrackIds.push(trackId);
        persistHiddenTracks(state.hiddenTrackIds);
      }
      state.userQueue = state.userQueue.filter((s) => s.id !== trackId);
      state.recommendations = state.recommendations.filter((s) => s.id !== trackId);
      state.recentlyPlayed = state.recentlyPlayed.filter((s) => s.id !== trackId);

      // If hiding the currently playing track, skip to next track
      if (state.currentTrack?.id === trackId) {
        if (state.userQueue.length > 0) {
          state.currentTrack = state.userQueue.shift()!;
          state.currentTime = 0;
          state.isPlaying = true;
        } else if (state.recommendations.length > 0) {
          state.currentTrack = state.recommendations.shift()!;
          state.currentTime = 0;
          state.isPlaying = true;
        } else {
          state.currentTrack = null;
          state.isPlaying = false;
          state.currentTime = 0;
        }
      }
      persistPlayerSession(state);
    },
    unhideTrack(state, action: PayloadAction<string>) {
      state.hiddenTrackIds = state.hiddenTrackIds.filter((id) => id !== action.payload);
      persistHiddenTracks(state.hiddenTrackIds);
      persistPlayerSession(state);
    },
    setHiddenTrackIds(state, action: PayloadAction<string[]>) {
      state.hiddenTrackIds = action.payload;
      persistHiddenTracks(state.hiddenTrackIds);
      persistPlayerSession(state);
    },
    // Next / Previous Track with Dynamic Non-Looping Sequence
    nextTrack(state, action: PayloadAction<Song[] | undefined>) {
      // 1. If repeat mode is 'one', restart current track
      if (state.repeatMode === 'one' && state.currentTrack) {
        state.currentTime = 0;
        state.isPlaying = true;
        persistPlayerSession(state);
        return;
      }

      // 2. If user has manual queue, consume the next track
      if (state.userQueue.length > 0) {
        const nextFromQueue = state.userQueue.shift()!;
        state.currentTrack = nextFromQueue;
        state.currentTime = 0;
        state.isPlaying = true;
        state.sessionPlayedIds.push(nextFromQueue.id);
        state.recentlyPlayed = [
          nextFromQueue,
          ...state.recentlyPlayed.filter((s) => s.id !== nextFromQueue.id),
        ].slice(0, 20);
        persistPlayerSession(state);
        return;
      }

      // 3. Consume from the dynamic sliding 10-song recommendation queue (Primary Continuous Queue)
      if (state.recommendations.length > 0) {
        const nextRecommended = state.recommendations.shift()!;
        state.currentTrack = nextRecommended;
        state.currentTime = 0;
        state.isPlaying = true;
        state.sessionPlayedIds.push(nextRecommended.id);
        state.recentlyPlayed = [
          nextRecommended,
          ...state.recentlyPlayed.filter((s) => s.id !== nextRecommended.id && !state.hiddenTrackIds.includes(s.id)),
        ].slice(0, 20);
        persistPlayerSession(state);
        return;
      }

      // 4. Fallback playlist navigation if no recommendations
      const fallbackList = (action.payload || []).filter(
        (s) => !state.hiddenTrackIds.includes(s.id)
      );

      if (state.currentTrack && fallbackList.length > 0) {
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
        } else {
          state.isPlaying = false;
          state.currentTime = 0;
          persistPlayerSession(state);
          return;
        }

        if (state.currentTrack) {
          state.sessionPlayedIds.push(state.currentTrack.id);
          state.recentlyPlayed = [
            state.currentTrack,
            ...state.recentlyPlayed.filter((s) => s.id !== state.currentTrack?.id && !state.hiddenTrackIds.includes(s.id)),
          ].slice(0, 20);
        }
      }

      persistPlayerSession(state);
    },
    previousTrack(state, action: PayloadAction<Song[] | undefined>) {
      if (!state.currentTrack) return;

      // If more than 3 seconds in, restart the song
      if (state.currentTime > 3) {
        state.currentTime = 0;
        persistPlayerSession(state);
        return;
      }

      // If recently played has past tracks, step back
      if (state.recentlyPlayed.length > 1) {
        // [0] is current, [1] is previous
        const prevSong = state.recentlyPlayed[1];
        state.currentTrack = prevSong;
        state.currentTime = 0;
        state.isPlaying = true;
        state.recentlyPlayed = [
          prevSong,
          ...state.recentlyPlayed.filter((s) => s.id !== prevSong.id),
        ].slice(0, 20);
        persistPlayerSession(state);
        return;
      }

      const fallbackList = (action.payload || []).filter(
        (s) => !state.hiddenTrackIds.includes(s.id)
      );

      if (fallbackList.length > 0) {
        const idx = fallbackList.findIndex((t) => t.id === state.currentTrack?.id);
        if (idx > 0) {
          state.currentTrack = fallbackList[idx - 1];
        } else if (state.repeatMode === 'all') {
          state.currentTrack = fallbackList[fallbackList.length - 1];
        }
      }

      state.currentTime = 0;
      state.isPlaying = true;
      persistPlayerSession(state);
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
  appendRecommendations,
  playTrackFromRecommendations,
  setRecommendationsLoading,
  toggleAutoplay,
  hideTrack,
  unhideTrack,
  setHiddenTrackIds,
} = playerSlice.actions;

export default playerSlice.reducer;
