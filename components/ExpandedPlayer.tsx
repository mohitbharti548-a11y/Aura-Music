'use client';
// components/ExpandedPlayer.tsx
// Spotify & Echo-Grade Full-Screen Now Playing Card with Drag-Down Dismiss & Smooth Lyrics
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setExpandedOpen,
  togglePlay,
  setCurrentTime,
  nextTrack,
  previousTrack,
  toggleShuffle,
  cycleRepeat,
  setQueueOpen,
  setEqualizerOpen,
  setSleepTimerOpen,
  addOfflineTrackId,
  removeOfflineTrackId,
  hideTrack,
} from '../features/player/playerSlice';
import { toggleLike, setLiked } from '../store/songsSlice';
import { fetchLyrics, LyricLine } from '../lib/lyrics-service';
import { getSongCredits, SongCredits } from '../lib/credits-service';
import { downloadTrack, removeDownloadedTrack } from '../lib/offline-storage';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ExpandedPlayer({
  queue,
  audioRef,
}: {
  queue: Song[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
}) {
  const dispatch = useAppDispatch();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isExpandedOpen,
    sleepTimer,
    offlineTrackIds,
  } = useAppSelector((s) => s.player);

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [credits, setCredits] = useState<SongCredits | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  // Gesture State
  const [dragY, setDragY] = useState(0);
  const [isDraggingDown, setIsDraggingDown] = useState(false);
  const [coverSwipeX, setCoverSwipeX] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const coverTouchStartX = useRef<number | null>(null);

  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top when player opens
  useEffect(() => {
    if (isExpandedOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isExpandedOpen]);

  // Fetch lyrics & credits on song change
  useEffect(() => {
    if (!currentTrack) return;
    setCredits(getSongCredits(currentTrack));

    fetchLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration_seconds).then(
      (lines) => {
        setLyrics(lines);
      }
    );
  }, [currentTrack?.id]);

  // Synchronize active lyric line with currentTime
  useEffect(() => {
    if (lyrics.length === 0) return;

    let index = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }

    setActiveLyricIndex(index);
  }, [currentTime, lyrics]);

  // Auto-scroll ONLY inside the lyrics container box (Never auto-scroll the main viewport)
  useEffect(() => {
    if (lyricsScrollRef.current && activeLyricIndex >= 0) {
      const activeEl = lyricsScrollRef.current.children[activeLyricIndex] as HTMLElement;
      if (activeEl) {
        const top = activeEl.offsetTop - lyricsScrollRef.current.offsetTop - 60;
        lyricsScrollRef.current.scrollTo({
          top: Math.max(0, top),
          behavior: 'smooth',
        });
      }
    }
  }, [activeLyricIndex]);

  if (!isExpandedOpen || !currentTrack) return null;

  const isOffline = offlineTrackIds.includes(currentTrack.id);
  const displayCurrentTime = isSeeking ? seekTime : currentTime;
  const progress = duration > 0 ? (displayCurrentTime / duration) * 100 : 0;
  const remainingTime = duration > 0 ? Math.max(duration - displayCurrentTime, 0) : 0;

  // --- SWIPE DOWN TO DISMISS GESTURE ---
  function handleContainerTouchStart(e: React.TouchEvent) {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop > 5) {
      touchStartY.current = null;
      return;
    }
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setIsDraggingDown(false);
  }

  function handleContainerTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = currentX - touchStartX.current;

    // Only trigger drag down if dragging vertically downwards from top
    if (deltaY > 10 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
      setIsDraggingDown(true);
      setDragY(deltaY);
    }
  }

  function handleContainerTouchEnd() {
    if (isDraggingDown) {
      if (dragY > 120) {
        dispatch(setExpandedOpen(false));
      }
      setDragY(0);
      setIsDraggingDown(false);
    }
    touchStartY.current = null;
    touchStartX.current = null;
  }

  // --- SWIPE LEFT / RIGHT ON ALBUM ART TO SKIP ---
  function handleCoverTouchStart(e: React.TouchEvent) {
    coverTouchStartX.current = e.touches[0].clientX;
  }

  function handleCoverTouchMove(e: React.TouchEvent) {
    if (coverTouchStartX.current === null) return;
    const deltaX = e.touches[0].clientX - coverTouchStartX.current;
    setCoverSwipeX(deltaX);
  }

  function handleCoverTouchEnd() {
    if (coverTouchStartX.current !== null) {
      if (coverSwipeX < -60) {
        dispatch(nextTrack(queue));
      } else if (coverSwipeX > 60) {
        dispatch(previousTrack(queue));
      }
    }
    setCoverSwipeX(0);
    coverTouchStartX.current = null;
  }

  async function handleToggleDownload() {
    if (!currentTrack) return;
    if (isOffline) {
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

  function handleSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setSeekTime(val);
  }

  function handleSeekStart() {
    setIsSeeking(true);
  }

  function handleSeekEnd(e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) {
    setIsSeeking(false);
    const val = Number((e.target as HTMLInputElement).value);
    dispatch(setCurrentTime(val));
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  }

  function handleSeekToLyric(time: number) {
    dispatch(setCurrentTime(time));
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleContainerTouchEnd}
      style={{
        transform: `translateY(${Math.max(dragY, 0)}px)`,
        transition: isDraggingDown ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
      className="fixed inset-0 z-[80] bg-[#070709] text-white overflow-y-auto select-none animate-in slide-in-from-bottom duration-300 pb-safe"
    >
      {/* Dynamic Background Ambient Gradient */}
      <div
        className="fixed inset-0 opacity-35 pointer-events-none blur-[140px] transition-all duration-700"
        style={{
          background: currentTrack.cover_url
            ? `radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.4), rgba(217, 70, 239, 0.2), transparent 70%)`
            : `radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.35), transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 sm:px-6 pt-safe min-h-screen flex flex-col justify-between">
        
        {/* 1. TOP HEADER & PULL BAR */}
        <div>
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex items-center justify-between py-3">
            <button
              onClick={() => dispatch(setExpandedOpen(false))}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition-transform active:scale-90"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="text-center px-4 min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Playing from Album
              </p>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {currentTrack.album ?? 'Aura Studio Master'}
              </p>
            </div>

            <button
              onClick={() => setIsPlaylistModalOpen(true)}
              className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition-transform active:scale-90"
              title="Add to Playlist"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. HERO ALBUM ARTWORK */}
        <div className="flex flex-col items-center justify-center my-auto py-4">
          <div
            onTouchStart={handleCoverTouchStart}
            onTouchMove={handleCoverTouchMove}
            onTouchEnd={handleCoverTouchEnd}
            style={{
              transform: `translateX(${coverSwipeX}px) rotate(${coverSwipeX * 0.04}deg)`,
              transition: coverTouchStartX.current !== null ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            className="relative w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10 group cursor-grab active:cursor-grabbing"
          >
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  isPlaying ? 'scale-100' : 'scale-[0.98] opacity-90'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-violet-800 to-indigo-950 flex items-center justify-center text-5xl">
                ✦
              </div>
            )}
          </div>
        </div>

        {/* 3. TRACK INFO & LIKE HEART */}
        <div className="w-full pt-2 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 pr-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {currentTrack.title}
              </h1>
              <p className="text-sm text-zinc-400 font-medium truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>

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
              className="p-2 -mr-2 text-zinc-400 hover:text-white transition-transform active:scale-125"
            >
              <svg
                className={`w-6 h-6 transition-colors ${
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
          </div>

          {/* 4. SCRUBBER TIMELINE */}
          <div className="mb-4">
            <div className="relative group/scrub py-2 cursor-pointer">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white group-hover/scrub:bg-violet-400 rounded-full transition-colors"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={displayCurrentTime}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex justify-between text-[11px] font-medium text-zinc-400">
              <span>{formatTime(displayCurrentTime)}</span>
              <span>-{formatTime(remainingTime)}</span>
            </div>
          </div>

          {/* 5. CONTROLS ROW */}
          <div className="flex items-center justify-between px-2 mb-6">
            <button
              onClick={() => dispatch(toggleShuffle())}
              className={`p-2 transition-colors relative ${
                isShuffle ? 'text-violet-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {isShuffle && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />}
            </button>

            <button
              onClick={() => dispatch(previousTrack(queue))}
              className="p-2 text-white hover:text-zinc-300 transition-transform active:scale-90"
              title="Previous"
            >
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={() => dispatch(togglePlay())}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl shadow-white/20 transition-transform active:scale-95 hover:scale-105 cursor-pointer"
            >
              {isPlaying ? (
                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => dispatch(nextTrack(queue))}
              className="p-2 text-white hover:text-zinc-300 transition-transform active:scale-90"
              title="Next"
            >
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            <button
              onClick={() => dispatch(cycleRepeat())}
              className={`p-2 transition-colors relative ${
                repeatMode !== 'off' ? 'text-violet-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Repeat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {repeatMode !== 'off' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />}
            </button>
          </div>

          {/* 6. BOTTOM TOOLBAR (Equalizer, Timer, Offline, Queue, Hide) */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-zinc-400">
            <button
              onClick={() => dispatch(setEqualizerOpen(true))}
              className="flex items-center gap-1 text-xs hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>EQ</span>
            </button>

            <button
              onClick={() => dispatch(setSleepTimerOpen(true))}
              className={`flex items-center gap-1 text-xs transition-colors ${
                sleepTimer.active ? 'text-violet-400 font-bold' : 'hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span>{sleepTimer.active ? 'Timer On' : 'Timer'}</span>
            </button>

            <button
              onClick={handleToggleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isOffline ? 'text-emerald-400 font-bold' : 'hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{isOffline ? 'Offline' : 'Download'}</span>
            </button>

            <button
              onClick={() => dispatch(setQueueOpen(true))}
              className="flex items-center gap-1 text-xs hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Queue</span>
            </button>

            <button
              onClick={() => dispatch(hideTrack(currentTrack.id))}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400 transition-colors"
              title="Hide this song"
            >
              <span className="text-sm">⊘</span>
              <span>Hide</span>
            </button>
          </div>
        </div>

        {/* 7. SYNCHRONIZED LYRICS & CREDITS (Strictly in its own scrollable sub-container) */}
        <div className="mt-8 pb-16">
          <div className="bg-[#14141e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center justify-between">
              <span>Lyrics</span>
              <span className="text-[10px] text-violet-400 lowercase font-medium">real-time sync</span>
            </h3>

            {lyrics.length > 0 ? (
              <div
                ref={lyricsScrollRef}
                className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar"
              >
                {lyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  const isPast = idx < activeLyricIndex;

                  return (
                    <p
                      key={idx}
                      onClick={() => handleSeekToLyric(line.time)}
                      className={`text-base sm:text-lg font-bold transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'text-white scale-105 translate-x-1 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : isPast
                          ? 'text-zinc-500 hover:text-zinc-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic py-4">
                No synchronized lyrics available for this track.
              </p>
            )}
          </div>

          {/* Credits Card */}
          {credits && (
            <div className="mt-4 bg-[#14141e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Credits
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Performed By</span>
                  <span className="text-white font-semibold">{credits.performedBy.join(', ')}</span>
                </div>
                {credits.writtenBy && credits.writtenBy.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Written By</span>
                    <span className="text-white font-semibold">{credits.writtenBy.join(', ')}</span>
                  </div>
                )}
                {credits.producedBy && credits.producedBy.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Produced By</span>
                    <span className="text-white font-semibold">{credits.producedBy.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Audio Quality</span>
                  <span className="text-emerald-400 font-semibold">{credits.audioSpecs.format} • {credits.audioSpecs.bitrate}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      <AddToPlaylistModal
        song={currentTrack}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
    </div>
  );
}
