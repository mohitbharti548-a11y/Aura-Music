'use client';
// components/PlayerBar.tsx
// Spotify-Grade Fully Responsive Desktop, Tablet & Mobile Playbar.
import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
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
  pause,
  addOfflineTrackId,
  removeOfflineTrackId,
  setOfflineTrackIds,
  setRecommendations,
  setRecommendationsLoading,
} from '../features/player/playerSlice';
import { toggleLike, setLiked } from '../store/songsSlice';
import { selectPlaylist, fetchLikedSongs } from '../store/playlistsSlice';
import { audioEngine } from '../lib/audio-engine';
import {
  getDownloadedTrackUrl,
  getAllDownloadedTrackIds,
  downloadTrack,
  removeDownloadedTrack,
} from '../lib/offline-storage';
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
  } = useAppSelector((s) => s.player);

  const audioRef = useRef<HTMLAudioElement>(null);

  const { selectedId } = useAppSelector((s) => s.playlists);
  const isHome = selectedId === null || selectedId === 'home';
  const isSearch = selectedId === 'search';
  const isDiscover = selectedId === 'discover';
  const isFavorites = selectedId === 'liked';
  const isDownloaded = selectedId === 'downloaded';

  const [buffered, setBuffered] = useState<{ start: number; end: number }[]>([]);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
          // Transparently upgrade 30s preview to full-length 320kbps stream
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
      setBuffered([]);
      setIsBuffering(false);
      audioEngine.resume();
      audio.play().catch(() => {});

      // Background Autonomous Dynamic Radio Recommendations Generation (Up to 30 similar songs)
      dispatch(setRecommendationsLoading(true));
      fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTrack),
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

  // Volume Sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

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

  function handleSeekMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    setHoverSeekTime(percent * duration);
    setHoverSeekPos(percent * 100);
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
        preload="metadata"
        onTimeUpdate={() => dispatch(setCurrentTime(audioRef.current?.currentTime ?? 0))}
        onDurationChange={() => dispatch(setDuration(audioRef.current?.duration ?? 0))}
        onProgress={updateBuffered}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => dispatch(nextTrack(queue))}
      />

      {/* SVG Gradient Definitions for Floating Navigation */}
      <svg width="0" height="0" className="hidden" aria-hidden="true">
        <defs>
          <linearGradient id="floating-nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="floating-heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* UNIFIED FLOATING WIDGET DOCK */}
      <div className="fixed bottom-2.5 sm:bottom-4 left-2.5 right-2.5 sm:left-4 sm:right-4 max-w-5xl mx-auto z-40 select-none">
        <div className="bg-[#0b0b10]/94 backdrop-blur-3xl border border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.88)] overflow-hidden">
          
          {/* Mobile Continuous Scrub Progress Line (<640px) */}
          <div className="h-[2px] bg-white/[0.08] overflow-hidden sm:hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Top Row: Responsive Playbar Controls */}
          <div className="h-14 sm:h-18 lg:h-20 px-3 sm:px-6 flex items-center justify-between">

            {/* ==================================================================== */}
            {/* 1. LEFT SECTION: Track Info & Quick Actions                          */}
            {/* ==================================================================== */}
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1 sm:flex-none sm:w-[28%] lg:w-[30%] max-w-[200px] sm:max-w-xs">
              {/* Cover Art Thumbnail (Click to open Expanded Player) */}
              <div
                onClick={() => currentTrack && dispatch(setExpandedOpen(true))}
                className="relative w-9 h-9 sm:w-11 sm:h-11 lg:w-13 lg:h-13 rounded-lg sm:rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10 shadow-md cursor-pointer group/art"
                title="Click to open Now Playing & Lyrics"
              >
                {currentTrack?.cover_url ? (
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-900 flex items-center justify-center text-xs sm:text-sm">
                    ✦
                  </div>
                )}

                {/* Hover Expand Chevron on Desktop */}
                <div className="hidden sm:flex absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-bold">▲</span>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="min-w-0 pr-1 flex-1">
                <p
                  onClick={() => currentTrack && dispatch(setExpandedOpen(true))}
                  className="text-xs sm:text-sm font-bold text-white truncate tracking-tight hover:underline cursor-pointer"
                >
                  {currentTrack?.title ?? 'Aura Sound'}
                </p>
                <p
                  onClick={() => currentTrack && dispatch(setExpandedOpen(true))}
                  className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5 hover:text-white cursor-pointer transition-colors"
                >
                  {currentTrack?.artist ?? 'Select a track'}
                </p>
              </div>

              {/* Quick Action Icons: Like, Playlist, Offline */}
              {currentTrack && (
                <div className="flex items-center gap-1 shrink-0">
                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextLiked = !currentTrack.is_liked;
                      dispatch(setLiked({ id: currentTrack.id, liked: nextLiked }));
                      dispatch(toggleLike({ id: currentTrack.id, currentlyLiked: !!currentTrack.is_liked }))
                        .unwrap()
                        .catch(() => {
                          dispatch(setLiked({ id: currentTrack.id, liked: !!currentTrack.is_liked }));
                        });
                    }}
                    className="p-1 text-xs sm:text-sm hover:scale-125 transition-transform"
                    title={currentTrack.is_liked ? 'Unlike' : 'Like'}
                  >
                    {currentTrack.is_liked ? (
                      <span className="text-rose-500">♥</span>
                    ) : (
                      <span className="text-zinc-500 hover:text-white">♡</span>
                    )}
                  </button>

                  {/* Add to Playlist Button (Tablet & Desktop) */}
                  <button
                    onClick={() => setIsPlaylistModalOpen(true)}
                    className="hidden md:block p-1 text-xs text-zinc-400 hover:text-white hover:scale-110 transition-transform"
                    title="Add to Playlist"
                  >
                    +
                  </button>

                  {/* Offline Download Button (Desktop) */}
                  <button
                    onClick={handleToggleDownload}
                    disabled={isDownloading}
                    className={`hidden lg:block p-1 text-xs hover:scale-110 transition-transform ${
                      isCurrentDownloaded ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
                    }`}
                    title={isCurrentDownloaded ? 'Downloaded Offline' : 'Download Offline'}
                  >
                    {isDownloading ? (
                      <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : isCurrentDownloaded ? (
                      '✓'
                    ) : (
                      '↓'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* ==================================================================== */}
            {/* 2. CENTER SECTION: Transport & Full Scrub Bar (>=640px)               */}
            {/* ==================================================================== */}
            <div className="hidden sm:flex flex-col items-center gap-1 flex-1 max-w-lg px-3">
              {/* Controls Row */}
              <div className="flex items-center gap-3 sm:gap-5">
                {/* Shuffle */}
                <button
                  onClick={() => dispatch(toggleShuffle())}
                  className={`text-xs transition-colors relative py-1 ${
                    isShuffle ? 'text-violet-400 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Shuffle"
                >
                  ⇄
                  {isShuffle && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                  )}
                </button>

                {/* Previous */}
                <button
                  onClick={() => dispatch(previousTrack(queue))}
                  disabled={!currentTrack}
                  className="text-zinc-300 hover:text-white disabled:opacity-20 text-xs sm:text-sm transition-transform active:scale-90"
                  title="Previous"
                >
                  ⏮
                </button>

                {/* Center Play/Pause Circle */}
                <button
                  onClick={() => dispatch(togglePlay())}
                  disabled={!currentTrack}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-black flex items-center justify-center text-xs font-extrabold shadow-md shadow-white/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isBuffering ? (
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    '❚❚'
                  ) : (
                    '▶'
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={() => dispatch(nextTrack(queue))}
                  disabled={!currentTrack}
                  className="text-zinc-300 hover:text-white disabled:opacity-20 text-xs sm:text-sm transition-transform active:scale-90"
                  title="Next"
                >
                  ⏭
                </button>

                {/* Repeat */}
                <button
                  onClick={() => dispatch(cycleRepeat())}
                  className={`text-xs transition-colors relative py-1 ${
                    repeatMode !== 'off' ? 'text-violet-400 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? '↺1' : '↺'}
                  {repeatMode !== 'off' && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                  )}
                </button>
              </div>

              {/* Timeline & Scrub Bar */}
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-zinc-400 font-mono tabular-nums w-7 text-right">
                  {formatTime(currentTime)}
                </span>

                {/* Scrub Rail */}
                <div
                  className="relative flex-1 h-2 py-1 cursor-pointer group flex items-center"
                  onMouseMove={handleSeekMouseMove}
                  onMouseLeave={() => setHoverSeekTime(null)}
                >
                  {/* Tooltip */}
                  {hoverSeekTime !== null && (
                    <div
                      className="absolute -top-7 px-1.5 py-0.5 rounded bg-black/90 text-[9px] font-mono text-white border border-white/20 shadow-lg pointer-events-none transform -translate-x-1/2 backdrop-blur-md"
                      style={{ left: `${hoverSeekPos}%` }}
                    >
                      {formatTime(hoverSeekTime)}
                    </div>
                  )}

                  {/* Progress Track */}
                  <div className="w-full h-1 group-hover:h-1.5 bg-white/15 rounded-full relative overflow-hidden transition-all">
                    {buffered.map((range, i) =>
                      duration > 0 ? (
                        <div
                          key={i}
                          className="absolute inset-y-0 bg-white/25 rounded-full"
                          style={{
                            left: `${(range.start / duration) * 100}%`,
                            width: `${((range.end - range.start) / duration) * 100}%`,
                          }}
                        />
                      ) : null
                    )}

                    <div
                      className="absolute inset-y-0 bg-white group-hover:bg-violet-400 rounded-full transition-colors"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Scrub Knob */}
                  <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-1/2 pointer-events-none"
                    style={{ left: `${progress}%` }}
                  />

                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    step={0.1}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      dispatch(setCurrentTime(t));
                      if (audioRef.current) audioRef.current.currentTime = t;
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Seek"
                  />
                </div>

                <span className="text-[10px] text-zinc-400 font-mono tabular-nums w-7">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* ==================================================================== */}
            {/* 3. RIGHT SECTION: Responsive Mobile Controls & Desktop Toolset       */}
            {/* ==================================================================== */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
              
              {/* Mobile Direct Play Controls (<640px) */}
              <div className="flex sm:hidden items-center gap-1.5">
                <button
                  onClick={() => dispatch(togglePlay())}
                  disabled={!currentTrack}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-30"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isBuffering ? (
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    '❚❚'
                  ) : (
                    '▶'
                  )}
                </button>

                <button
                  onClick={() => dispatch(nextTrack(queue))}
                  disabled={!currentTrack}
                  className="text-zinc-300 hover:text-white p-1 text-sm disabled:opacity-20"
                  title="Next"
                >
                  ⏭
                </button>
              </div>

              {/* Desktop & Tablet Advanced Toolset (>=640px) */}
              <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
                {/* Lyrics Button */}
                <button
                  onClick={() => currentTrack && dispatch(setExpandedOpen(true))}
                  className="hidden xl:block text-xs text-zinc-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  title="Lyrics & Credits"
                >
                  🎙
                </button>

                {/* Queue Button */}
                <button
                  onClick={() => dispatch(setQueueOpen(true))}
                  className={`text-xs p-1.5 rounded-md hover:bg-white/10 transition-colors relative ${
                    userQueue.length > 0 ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Play Queue"
                >
                  ≣
                  {userQueue.length > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-400" />
                  )}
                </button>

                {/* Volume Control */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={() => dispatch(setVolume(volume === 0 ? 0.8 : 0))}
                    className="text-zinc-400 hover:text-white text-xs transition-colors p-1"
                    title={volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : '🔊'}
                  </button>

                  <div className="relative w-14 sm:w-16 lg:w-20 h-2 py-1 cursor-pointer flex items-center">
                    <div className="w-full h-1 group-hover/vol:h-1.5 bg-white/15 rounded-full relative overflow-hidden transition-all">
                      <div
                        className="absolute inset-y-0 bg-white group-hover/vol:bg-violet-400 rounded-full transition-colors"
                        style={{ width: `${volume * 100}%` }}
                      />
                    </div>

                    <div
                      className="absolute w-2 h-2 rounded-full bg-white opacity-0 group-hover/vol:opacity-100 transition-opacity transform -translate-x-1/2 pointer-events-none"
                      style={{ left: `${volume * 100}%` }}
                    />

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => dispatch(setVolume(Number(e.target.value)))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Volume"
                    />
                  </div>
                </div>
              </div>

              {/* HAMBURGER FEATURES BUTTON (Universal across Mobile, Tablet, Desktop) */}
              <div className="relative flex items-center">
                <button
                  ref={menuButtonRef}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center relative ${
                    isMenuOpen
                      ? 'bg-violet-600/30 border-violet-500/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                  }`}
                  title="Features & Audio Hub"
                  aria-label="Toggle Features Menu"
                  aria-expanded={isMenuOpen}
                >
                  <svg
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>

                  {/* Notification Dot if any feature is active */}
                  {(sleepTimer.active || userQueue.length > 0 || isCurrentDownloaded) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 border border-[#09090d]" />
                  )}
                </button>
              </div>

              {/* Expand Fullscreen Button (Desktop) */}
              <button
                onClick={() => currentTrack && dispatch(setExpandedOpen(true))}
                className="hidden sm:block text-zinc-400 hover:text-white text-xs p-1.5 rounded-md hover:bg-white/10 transition-colors"
                title="Fullscreen Player"
              >
                ⤢
              </button>

            </div>
          </div>

          {/* Attached Floating Mobile Navigation (<768px) */}
          <nav className="md:hidden border-t border-white/[0.08] bg-black/40 px-2 py-1 flex items-center justify-around">
            {/* 1. Home */}
            <button
              onClick={() => dispatch(selectPlaylist(null))}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                isHome ? 'scale-105' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isHome ? 'url(#floating-nav-gradient)' : 'currentColor'}
                strokeWidth={isHome ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-[9px] mt-0.5 font-medium ${isHome ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}`}>
                Home
              </span>
            </button>

            {/* 2. Search */}
            <button
              onClick={() => dispatch(selectPlaylist('search'))}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                isSearch ? 'scale-105' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isSearch ? 'url(#floating-nav-gradient)' : 'currentColor'}
                strokeWidth={isSearch ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className={`text-[9px] mt-0.5 font-medium ${isSearch ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}`}>
                Search
              </span>
            </button>

            {/* 3. Discover */}
            <button
              onClick={() => dispatch(selectPlaylist('discover'))}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                isDiscover ? 'scale-105' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDiscover ? 'url(#floating-nav-gradient)' : 'currentColor'}
                strokeWidth={isDiscover ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className={`text-[9px] mt-0.5 font-medium ${isDiscover ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}`}>
                Discover
              </span>
            </button>

            {/* 4. Favorites */}
            <button
              onClick={() => {
                dispatch(selectPlaylist('liked'));
                dispatch(fetchLikedSongs());
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                isFavorites ? 'scale-105' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill={isFavorites ? 'url(#floating-heart-gradient)' : 'none'}
                stroke={isFavorites ? 'url(#floating-heart-gradient)' : 'currentColor'}
                strokeWidth={isFavorites ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className={`text-[9px] mt-0.5 font-medium ${isFavorites ? 'bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent font-bold' : ''}`}>
                Favorites
              </span>
            </button>

            {/* 5. Downloaded */}
            <button
              onClick={() => dispatch(selectPlaylist('downloaded'))}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                isDownloaded ? 'scale-105' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg
                className="w-4.5 h-4.5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDownloaded ? 'url(#floating-nav-gradient)' : 'currentColor'}
                strokeWidth={isDownloaded ? '2.2' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className={`text-[9px] mt-0.5 font-medium ${isDownloaded ? 'bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent font-bold' : ''}`}>
                Offline
              </span>
            </button>
          </nav>

        </div>
      </div>

      {/* FLOATING HAMBURGER FEATURES MENU (Clean, Minimal & Aesthetic) */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-32 sm:bottom-24 lg:bottom-26 right-3 sm:right-6 w-52 sm:w-56 bg-[#0d0d12]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 select-none"
          role="menu"
          aria-label="Features Menu"
        >
          {/* 1. Sleep Timer */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              dispatch(setSleepTimerOpen(true));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                Sleep Timer
              </span>
            </div>
            {sleepTimer.active && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-violet-500/30 text-violet-300 border border-violet-500/40">
                ON
              </span>
            )}
          </button>

          {/* 2. Add to Playlist */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setIsPlaylistModalOpen(true);
            }}
            disabled={!currentTrack}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] disabled:opacity-30 text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                Add to Playlist
              </span>
            </div>
          </button>

          {/* 3. Equalizer */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              dispatch(setEqualizerOpen(true));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                Equalizer
              </span>
            </div>
          </button>

          {/* 4. Queue */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              dispatch(setQueueOpen(true));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                Queue
              </span>
            </div>
            {userQueue.length > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-violet-500/25 text-violet-300">
                {userQueue.length}
              </span>
            )}
          </button>

          {/* 5. Lyrics & Credits */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              if (currentTrack) dispatch(setExpandedOpen(true));
            }}
            disabled={!currentTrack}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] disabled:opacity-30 text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                Lyrics & Credits
              </span>
            </div>
          </button>

          {/* 6. Download / Offline */}
          <button
            onClick={handleToggleDownload}
            disabled={!currentTrack || isDownloading}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] disabled:opacity-30 text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {isDownloading ? (
                <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              ) : isCurrentDownloaded ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                {isCurrentDownloaded ? 'Downloaded' : 'Download'}
              </span>
            </div>
            {isCurrentDownloaded && (
              <span className="text-[10px] text-emerald-400 font-medium">Saved</span>
            )}
          </button>

          {/* 7. Favorite */}
          {currentTrack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextLiked = !currentTrack.is_liked;
                dispatch(setLiked({ id: currentTrack.id, liked: nextLiked }));
                dispatch(toggleLike({ id: currentTrack.id, currentlyLiked: !!currentTrack.is_liked }))
                  .unwrap()
                  .catch(() => {
                    dispatch(setLiked({ id: currentTrack.id, liked: !!currentTrack.is_liked }));
                  });
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className={`w-4 h-4 transition-colors ${
                    currentTrack.is_liked ? 'text-rose-500 fill-rose-500' : 'text-zinc-400 group-hover:text-white'
                  }`}
                  fill={currentTrack.is_liked ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                  {currentTrack.is_liked ? 'Favorited' : 'Favorite'}
                </span>
              </div>
            </button>
          )}

          <div className="h-[1px] bg-white/[0.08] my-1" />

          {/* 8. Full Screen */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              if (currentTrack) dispatch(setExpandedOpen(true));
            }}
            disabled={!currentTrack}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] disabled:opacity-30 text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                Full Screen
              </span>
            </div>
          </button>
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
