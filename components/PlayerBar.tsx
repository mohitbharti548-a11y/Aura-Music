'use client';
// components/PlayerBar.tsx
// Spotify-Grade Responsive Music Player with Swipe-to-Skip Mini Player & Clean Bottom Navigation.
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

  // Close hamburger menu on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

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
  }, [isPlaying]);

  // Load and play track with Offline IndexedDB support
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

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

      // Dynamic 10-Song Sequential Recommendation Radio Generation
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

  // Persist exact currentTime periodically to aura_last_session for resume on app reopen
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

  // System MediaSession & Lock Screen / Background Audio Controller
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Aura Lossless Studio',
        artwork: currentTrack.cover_url
          ? [
              { src: currentTrack.cover_url, sizes: '96x96', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '128x128', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '192x192', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '256x256', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '384x384', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [
              { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
      });

      navigator.mediaSession.setActionHandler('play', () => dispatch(play()));
      navigator.mediaSession.setActionHandler('pause', () => dispatch(pause()));
      navigator.mediaSession.setActionHandler('previoustrack', () => dispatch(previousTrack(queue)));
      navigator.mediaSession.setActionHandler('nexttrack', () => dispatch(nextTrack(queue)));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          dispatch(setCurrentTime(details.seekTime));
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const skip = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skip, 0);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const skip = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(
            audioRef.current.currentTime + skip,
            audioRef.current.duration || 0
          );
        }
      });
    } catch (err) {
      console.warn('[MediaSession] Setup error:', err);
    }
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.cover_url, queue, dispatch]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (err) {
      console.warn('[MediaSession] State sync error:', err);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0),
          playbackRate: 1,
          position: Math.min(Math.max(currentTime, 0), duration),
        });
      } catch (err) {}
    }
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
    } else if (Math.abs(swipeX) < 8) {
      // Tap on mini player -> open full screen
      if (currentTrack) dispatch(setExpandedOpen(true));
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
      {/* 1. SPOTIFY MINI PLAYER (Floats above mobile nav or desktop dock)      */}
      {/* ==================================================================== */}
      {currentTrack && (
        <div
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          className="fixed bottom-[62px] sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 max-w-5xl mx-auto z-40 select-none"
        >
          <div
            onTouchStart={handleMiniTouchStart}
            onTouchMove={handleMiniTouchMove}
            onTouchEnd={handleMiniTouchEnd}
            className="bg-[#14141e]/95 backdrop-blur-3xl border border-white/10 rounded-xl sm:rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] overflow-hidden cursor-pointer"
          >
            {/* Top Row: Mini Player Row */}
            <div className="h-14 sm:h-18 px-3 sm:px-5 flex items-center justify-between">
              
              {/* Left: Artwork + Title & Artist */}
              <div
                onClick={() => dispatch(setExpandedOpen(true))}
                className="flex items-center gap-3 min-w-0 flex-1 pr-2"
              >
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-white/10 shadow-sm">
                  {currentTrack.cover_url ? (
                    <img
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-900 flex items-center justify-center text-xs">
                      ✦
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">
                    {currentTrack.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                    {currentTrack.artist}
                  </p>
                </div>
              </div>

              {/* Center: Desktop Controls & Timeline Scrubber (>=640px) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="hidden sm:flex flex-col items-center gap-1 flex-1 max-w-md px-3"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => dispatch(toggleShuffle())}
                    className={`text-xs transition-colors relative ${
                      isShuffle ? 'text-violet-400 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Shuffle"
                  >
                    ⇄
                  </button>

                  <button
                    onClick={() => dispatch(previousTrack(queue))}
                    className="text-zinc-300 hover:text-white text-sm transition-transform active:scale-90"
                    title="Previous"
                  >
                    ⏮
                  </button>

                  <button
                    onClick={() => dispatch(togglePlay())}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-transform active:scale-95 hover:scale-105"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => dispatch(nextTrack(queue))}
                    className="text-zinc-300 hover:text-white text-sm transition-transform active:scale-90"
                    title="Next"
                  >
                    ⏭
                  </button>

                  <button
                    onClick={() => dispatch(cycleRepeat())}
                    className={`text-xs transition-colors relative ${
                      repeatMode !== 'off' ? 'text-violet-400 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Repeat"
                  >
                    ↻
                  </button>
                </div>

                <div className="w-full flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="w-8 text-right">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="w-8">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right: Quick Action Controls */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 sm:gap-3 shrink-0"
              >
                {/* Like Button */}
                <button
                  onClick={() => {
                    const nextLiked = !currentTrack.is_liked;
                    dispatch(setLiked({ id: currentTrack.id, liked: nextLiked }));
                    dispatch(toggleLike({ id: currentTrack.id, currentlyLiked: !!currentTrack.is_liked }))
                      .unwrap()
                      .catch(() => {
                        dispatch(setLiked({ id: currentTrack.id, liked: !!currentTrack.is_liked }));
                      });
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white transition-transform active:scale-125"
                  title={currentTrack.is_liked ? 'Liked' : 'Like'}
                >
                  <svg
                    className={`w-5 h-5 transition-colors ${
                      currentTrack.is_liked ? 'text-rose-500 fill-rose-500' : 'text-zinc-400'
                    }`}
                    fill={currentTrack.is_liked ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* Mobile Play / Pause Button */}
                <button
                  onClick={() => dispatch(togglePlay())}
                  className="sm:hidden w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md active:scale-90"
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

                {/* Hamburger Feature Button */}
                <div className="relative">
                  <button
                    ref={menuButtonRef}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Audio Menu"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1" fill="currentColor" />
                      <circle cx="12" cy="5" r="1" fill="currentColor" />
                      <circle cx="12" cy="19" r="1" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom continuous scrub progress line */}
            <div className="h-[2px] bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
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
      {/* 3. HAMBURGER QUICK ACTIONS MODAL                                     */}
      {/* ==================================================================== */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-24 sm:bottom-22 right-4 sm:right-6 w-56 z-50 bg-[#12121e]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Equalizer */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              dispatch(setEqualizerOpen(true));
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors text-xs font-medium text-zinc-300 hover:text-white"
          >
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Equalizer</span>
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              dispatch(setSleepTimerOpen(true));
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors text-xs font-medium text-zinc-300 hover:text-white"
          >
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span>Sleep Timer</span>
          </button>

          {/* Add to Playlist */}
          {currentTrack && (
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setIsPlaylistModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors text-xs font-medium text-zinc-300 hover:text-white"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add to Playlist</span>
            </button>
          )}

          {/* Download Offline */}
          {currentTrack && (
            <button
              onClick={handleToggleDownload}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors text-xs font-medium text-zinc-300 hover:text-white"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{isCurrentDownloaded ? 'Remove Download' : 'Download Offline'}</span>
            </button>
          )}

          {/* View Queue */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              dispatch(setQueueOpen(true));
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors text-xs font-medium text-zinc-300 hover:text-white"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span>Play Queue</span>
          </button>

          {/* Hide / Don't play this song */}
          {currentTrack && (
            <button
              onClick={() => {
                setIsMenuOpen(false);
                dispatch(hideTrack(currentTrack.id));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-left transition-colors text-xs font-medium text-rose-400 hover:text-rose-300"
            >
              <span className="text-sm">⊘</span>
              <span>Hide This Song</span>
            </button>
          )}
        </div>
      )}

      {/* MODALS & DRAWERS */}
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
