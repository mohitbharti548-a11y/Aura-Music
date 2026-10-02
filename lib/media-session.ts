// lib/media-session.ts
// Robust MediaSession controller for Android Lockscreen, Notification Drawer, Windows/macOS/iOS OS-level controls
import type { Song } from '@/types/music';

export function updateMediaSessionMetadata(
  song: Song | null,
  handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeekTo?: (time: number) => void;
    onSeekBackward?: (offset: number) => void;
    onSeekForward?: (offset: number) => void;
  }
) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !song) {
    return;
  }

  const origin = window.location.origin;
  const coverUrl = song.cover_url
    ? (song.cover_url.startsWith('http') ? song.cover_url : `${origin}${song.cover_url}`)
    : `${origin}/icons/icon-512.png`;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album || 'Aura Lossless Studio',
      artwork: [
        { src: coverUrl, sizes: '96x96', type: 'image/png' },
        { src: coverUrl, sizes: '128x128', type: 'image/png' },
        { src: coverUrl, sizes: '192x192', type: 'image/png' },
        { src: coverUrl, sizes: '256x256', type: 'image/png' },
        { src: coverUrl, sizes: '384x384', type: 'image/png' },
        { src: coverUrl, sizes: '512x512', type: 'image/png' },
      ],
    });

    // Action Handlers
    navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
    navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);

    if (handlers.onSeekTo) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && handlers.onSeekTo) {
          handlers.onSeekTo(details.seekTime);
        }
      });
    }

    if (handlers.onSeekBackward) {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        handlers.onSeekBackward?.(details.seekOffset || 10);
      });
    }

    if (handlers.onSeekForward) {
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        handlers.onSeekForward?.(details.seekOffset || 10);
      });
    }

    try {
      navigator.mediaSession.setActionHandler('stop', handlers.onPause);
    } catch {}
  } catch (err) {
    console.warn('[MediaSession] Metadata init error:', err);
  }
}

export function syncMediaSessionPlaybackState(isPlaying: boolean) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch {}
}

export function syncMediaSessionPosition(currentTime: number, duration: number) {
  if (
    typeof window === 'undefined' ||
    !('mediaSession' in navigator) ||
    !('setPositionState' in navigator.mediaSession)
  ) {
    return;
  }

  if (duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(duration, 0.1),
        playbackRate: 1.0,
        position: Math.min(Math.max(currentTime, 0), duration),
      });
    } catch {}
  }
}
