'use client';
// components/PlayerBar.tsx
// Spotify & Echo-Grade Responsive Music Player with Floating Pill Mini-Player & Full Lockscreen MediaSession
import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  play,
  pause,
  togglePlay,
  setCurrentTime,
  setDuration,
  setVolume,
  nextTrack,
  previousTrack,
  toggleShuffle,
  cycleRepeat,
  setExpandedOpen,
  setQueueOpen,
  setEqualizerOpen,
  setSleepTimerOpen,
  cancelSleepTimer,
  addOfflineTrackId,
  removeOfflineTrackId,
  setOfflineTrackIds,
  setRecommendations,
  appendRecommendations,
  setRecommendationsLoading,
  hideTrack,
} from '../features/player/playerSlice';

import { toggleLike, setLiked } from '../store/songsSlice';
import { selectPlaylist } from '../store/playlistsSlice';
import { audioEngine } from '../lib/audio-engine';
import {
  getDownloadedTrackUrl,
  getAllDownloadedTrackIds,
  downloadTrack,
  removeDownloadedTrack,
} from '../lib/offline-storage';
import { recordListeningEvent } from '../lib/personalization';
import {
  updateMediaSessionMetadata,
  syncMediaSessionPlaybackState,
  syncMediaSessionPosition,
} from '../lib/media-session';
import ExpandedPlayer from './ExpandedPlayer';
import QueueDrawer from './QueueDrawer';
import EqualizerModal from './EqualizerModal';
import SleepTimerModal from './SleepTimerModal';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function PlayerBar({ queue }: { queue: Song[] }) {
  const dispatch = useAppDispatch();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    sleepTimer,
    userQueue,
    offlineTrackIds,
    recommendations,
    hiddenTrackIds,
  } = useAppSelector((s) => s.player);

  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedTrackIdRef = useRef<string | null>(null);

  const { selectedId } = useAppSelector((s) => s.playlists);
  const isHome = selectedId === null || selectedId === 'home';
  const isSearch = selectedId === 'search';
  const isDiscover = selectedId === 'discover';
  const isLibrary = selectedId === 'liked' || selectedId === 'downloaded' || (selectedId !== null && selectedId !== 'home' && selectedId !== 'search' && selectedId !== 'discover');

  const [buffered, setBuffered] = useState<{ start: number; end: number }[]>([]);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Mini player swipe gesture state
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  // Initialize offline track IDs from IndexedDB on mount
  useEffect(() => {
    getAllDownloadedTrackIds().then((ids) => {
      dispatch(setOfflineTrackIds(ids));
    });
  }, [dispatch]);

  // Handle Play/Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audioEngine.resume();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    syncMediaSessionPlaybackState(isPlaying);
  }, [isPlaying]);

  // Load track source only when track ID actually changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Avoid reloading if already loaded this track ID
    if (loadedTrackIdRef.current === currentTrack.id) return;
    loadedTrackIdRef.current = currentTrack.id;

    audioEngine.init(audio);

    async function setupTrackAudio() {
      if (!audio || !currentTrack) return;

      const offlineUrl = await getDownloadedTrackUrl(currentTrack.id);
      if (offlineUrl) {
        audio.src = offlineUrl;
      } else {
        let src = currentTrack.file_url;
        if (src.startsWith('/audio/')) {
          src = `/api${src}`;
        } else if (src.includes('mzstatic.com') || src.includes('itunes.apple.com')) {
          fetch('/api/stream/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: currentTrack.title,
              artist: currentTrack.artist,
              songId: currentTrack.id,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.resolved && data.streamUrl && audioRef.current && currentTrack) {
                const currentPos = audioRef.current.currentTime;
                audioRef.current.src = data.streamUrl;
                if (data.duration) dispatch(setDuration(data.duration));
                audioRef.current.currentTime = currentPos;
                if (isPlaying) {
                  audioRef.current.play().catch(() => {});
                }
              }
            })
            .catch(() => {});
        }
        audio.src = src;
      }

      audio.load();
      audio.volume = volume;
      if (currentTime > 0) {
        audio.currentTime = currentTime;
      }
      setBuffered([]);
      setIsBuffering(false);
      if (isPlaying) {
        audioEngine.resume();
        audio.play().catch(() => {});
        recordListeningEvent(currentTrack, 'play');
      }

      // Initial seed recommendations if empty
      if (recommendations.length < 5) {
        dispatch(setRecommendationsLoading(true));
        fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seedSong: currentTrack,
            hiddenTrackIds,
            limit: 10,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.recommendations && Array.isArray(data.recommendations)) {
              dispatch(setRecommendations(data.recommendations));
            } else {
              dispatch(setRecommendationsLoading(false));
            }
          })
          .catch(() => {
            dispatch(setRecommendationsLoading(false));
          });
      }
    }

    setupTrackAudio();
  }, [currentTrack?.id]);

  // Periodic Sliding Queue Replenishment Check: Keep sliding window at 10 items
  useEffect(() => {
    if (!currentTrack || recommendations.length >= 6 || !isPlaying) return;

    const needed = 10 - recommendations.length;
    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seedSong: currentTrack,
        hiddenTrackIds,
        limit: needed,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.recommendations && Array.isArray(data.recommendations)) {
          dispatch(appendRecommendations(data.recommendations));
        }
      })
      .catch(() => {});
  }, [recommendations.length, currentTrack?.id, isPlaying, hiddenTrackIds, dispatch]);

  // Volume Sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Persist exact currentTime periodically to aura_last_session
  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem('aura_last_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.currentTime = Math.floor(currentTime);
          parsed.duration = Math.floor(duration);
          localStorage.setItem('aura_last_session', JSON.stringify(parsed));
        }
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [currentTrack, currentTime, duration, isPlaying]);

  // MediaSession & Lock Screen / Notification Panel Media Controller
  useEffect(() => {
    if (!currentTrack) return;

    updateMediaSessionMetadata(currentTrack, {
      onPlay: () => dispatch(play()),
      onPause: () => dispatch(pause()),
      onPrev: () => dispatch(previousTrack(queue)),
      onNext: () => dispatch(nextTrack(queue)),
      onSeekTo: (time) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          dispatch(setCurrentTime(time));
        }
      },
      onSeekBackward: (offset) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        }
      },
      onSeekForward: (offset) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(
            audioRef.current.currentTime + offset,
            audioRef.current.duration || 0
          );
        }
      },
    });

    syncMediaSessionPlaybackState(isPlaying);
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, isPlaying, queue, dispatch]);

  useEffect(() => {
    syncMediaSessionPosition(currentTime, duration);
  }, [currentTime, duration]);

  // Sleep Timer Tick
  useEffect(() => {
    if (!sleepTimer.active || !sleepTimer.targetTimestamp) return;

    const interval = setInterval(() => {
      if (Date.now() >= (sleepTimer.targetTimestamp ?? 0)) {
        dispatch(pause());
        dispatch(cancelSleepTimer());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer, dispatch]);

  const updateBuffered = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ranges: { start: number; end: number }[] = [];
    for (let i = 0; i < audio.buffered.length; i++) {
      ranges.push({ start: audio.buffered.start(i), end: audio.buffered.end(i) });
    }
    setBuffered(ranges);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch(togglePlay());
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        dispatch(setVolume(volume === 0 ? 0.8 : 0));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, volume]);

  // --- SWIPE ON MINI PLAYER TO SKIP ---
  function handleMiniTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }

  function handleMiniTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      isSwiping.current = true;
      setSwipeX(deltaX);
    }
  }

  function handleMiniTouchEnd() {
    if (isSwiping.current) {
      if (swipeX < -45) {
        dispatch(nextTrack(queue));
      } else if (swipeX > 45) {
        dispatch(previousTrack(queue));
      }
    }
    setSwipeX(0);
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  }

  async function handleToggleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentTrack) return;
    const isDownloaded = offlineTrackIds.includes(currentTrack.id);
    if (isDownloaded) {
      await removeDownloadedTrack(currentTrack.id);
      dispatch(removeOfflineTrackId(currentTrack.id));
    } else {
      setIsDownloading(true);
      try {
        await downloadTrack(currentTrack);
        dispatch(addOfflineTrackId(currentTrack.id));
      } catch (err) {
        console.error('Download error:', err);
      } finally {
        setIsDownloading(false);
      }
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCurrentDownloaded = currentTrack ? offlineTrackIds.includes(currentTrack.id) : false;

  return (
    <>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="auto"
        playsInline={true}
        onTimeUpdate={() => dispatch(setCurrentTime(audioRef.current?.currentTime ?? 0))}
        onDurationChange={() => dispatch(setDuration(audioRef.current?.duration ?? 0))}
        onProgress={updateBuffered}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          if (currentTrack) recordListeningEvent(currentTrack, 'complete');
          dispatch(nextTrack(queue));
        }}
      />

      {/* ==================================================================== */}
      {/* 1. FLOATING PILL MINI-PLAYCARD (Matching Reference Image)            */}
      {/* ==================================================================== */}
      {currentTrack && (
        <div
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          className="fixed bottom-[60px] sm:bottom-4 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-40 select-none"
        >
          <div
            onTouchStart={handleMiniTouchStart}
            onTouchMove={handleMiniTouchMove}
            onTouchEnd={handleMiniTouchEnd}
            onClick={() => dispatch(setExpandedOpen(true))}
            className="bg-[#12121e]/95 backdrop-blur-3xl border border-white/15 rounded-full px-3 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 cursor-pointer hover:border-white/25 transition-all group"
          >
            {/* Left: Circular Spinning Artwork + Track Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-zinc-900 shrink-0 border-2 border-white/20 shadow-md">
                {currentTrack.cover_url ? (
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className={`w-full h-full object-cover transition-all ${
                      isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                    }`}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-900 flex items-center justify-center text-xs">
                    ✦
                  </div>
                )}
                {/* Center hole for vinyl record aesthetic */}
                <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-[#12121e] border border-white/30" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate tracking-tight">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Right: Minimal Playback Controls (Prev, Big Play/Pause, Next) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 sm:gap-3 shrink-0"
            >
              {/* Previous Track */}
              <button
                onClick={() => dispatch(previousTrack(queue))}
                className="p-1.5 text-zinc-300 hover:text-white transition-transform active:scale-90"
                title="Previous Track"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Big Circular Play / Pause Button */}
              <button
                onClick={() => dispatch(togglePlay())}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={() => dispatch(nextTrack(queue))}
                className="p-1.5 text-zinc-300 hover:text-white transition-transform active:scale-90"
                title="Next Track"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. DEDICATED SPOTIFY MOBILE BOTTOM NAVIGATION BAR (<md)              */}
      {/* ==================================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07070b]/96 backdrop-blur-2xl border-t border-white/[0.08] h-14 pb-safe flex items-center justify-around select-none">
        {/* 1. Home */}
        <button
          onClick={() => dispatch(selectPlaylist(null))}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isHome ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg className="w-5 h-5" fill={isHome ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? '0' : '2'}>
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className={`text-[10px] mt-0.5 ${isHome ? 'font-bold text-white' : 'font-medium text-zinc-400'}`}>
            Home
          </span>
        </button>

        {/* 2. Search */}
        <button
          onClick={() => dispatch(selectPlaylist('search'))}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isSearch ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isSearch ? '2.8' : '2'}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className={`text-[10px] mt-0.5 ${isSearch ? 'font-bold text-white' : 'font-medium text-zinc-400'}`}>
            Search
          </span>
        </button>

        {/* 3. Discover */}
        <button
          onClick={() => dispatch(selectPlaylist('discover'))}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isDiscover ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg className="w-5 h-5" fill={isDiscover ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isDiscover ? '0' : '2'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className={`text-[10px] mt-0.5 ${isDiscover ? 'font-bold text-white' : 'font-medium text-zinc-400'}`}>
            Discover
          </span>
        </button>

        {/* 4. Library */}
        <button
          onClick={() => dispatch(selectPlaylist('liked'))}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isLibrary ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg className="w-5 h-5" fill={isLibrary ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isLibrary ? '0' : '2'}>
            <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className={`text-[10px] mt-0.5 ${isLibrary ? 'font-bold text-white' : 'font-medium text-zinc-400'}`}>
            Library
          </span>
        </button>
      </nav>

      {/* ==================================================================== */}
      {/* 3. MODALS & DRAWERS                                                  */}
      {/* ==================================================================== */}
      <ExpandedPlayer queue={queue} audioRef={audioRef} />
      <QueueDrawer queue={queue} />
      <EqualizerModal />
      <SleepTimerModal />
      <AddToPlaylistModal
        song={currentTrack}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
    </>
  );
}
