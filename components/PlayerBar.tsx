'use client';
// components/PlayerBar.tsx
// Echo & Spotify-Grade Responsive Music Player with Floating Pill Mini-Player, Direct Like/Hide Buttons & Lockscreen MediaSession
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

export default function PlayerBar({ queue }: { queue: Song[] }) {
  const dispatch = useAppDispatch();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
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

      // Initial seed recommendations if low
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
              dispatch(appendRecommendations(data.recommendations));
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

  // Periodic Infinite Queue Replenishment Check: Keep queue constantly stocked with 10 upcoming tracks
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

  function handleToggleLikeDirect(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentTrack) return;
    const nextLiked = !currentTrack.is_liked;
    dispatch(setLiked({ id: currentTrack.id, liked: nextLiked }));
    dispatch(toggleLike({ id: currentTrack.id, currentlyLiked: !!currentTrack.is_liked }))
      .unwrap()
      .catch(() => {
        dispatch(setLiked({ id: currentTrack.id, liked: !!currentTrack.is_liked }));
      });
  }

  function handleHideTrackDirect(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentTrack) return;
    dispatch(hideTrack(currentTrack.id));
  }

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
      {/* 1. FLOATING PILL MINI-PLAYCARD (DYNAMIC ISLAND STYLE)                */}
      {/* ==================================================================== */}
      {currentTrack && (
        <div
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          className="fixed bottom-[90px] sm:bottom-6 left-0 right-0 z-40 flex justify-center select-none pointer-events-none px-4"
        >
          <div
            onTouchStart={handleMiniTouchStart}
            onTouchMove={handleMiniTouchMove}
            onTouchEnd={handleMiniTouchEnd}
            onClick={() => dispatch(setExpandedOpen(true))}
            className="pointer-events-auto bg-[#1a1a24]/95 backdrop-blur-2xl border border-white/10 rounded-full px-2 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 cursor-pointer hover:border-white/25 transition-all max-w-[360px] w-full"
          >
            {/* Left: Circular Spinning Artwork */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10 shadow-md">
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
            </div>

            {/* Middle: Track Info */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-[13px] font-bold text-white truncate">
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {currentTrack.artist}
              </p>
            </div>

            {/* Right: Controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 shrink-0 pr-1"
            >
              <button
                onClick={handleToggleLikeDirect}
                className="p-1.5 text-zinc-400 hover:text-white transition-transform active:scale-125"
              >
                <svg className={`w-4 h-4 ${currentTrack.is_liked ? 'text-rose-500 fill-rose-500' : ''}`} fill={currentTrack.is_liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
              <button onClick={() => dispatch(previousTrack(queue))} className="p-1.5 text-zinc-300 active:scale-90"><svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg></button>
              <button
                onClick={() => dispatch(togglePlay())}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 mx-0.5"
              >
                {isPlaying ? <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={() => dispatch(nextTrack(queue))} className="p-1.5 text-zinc-300 active:scale-90"><svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg></button>
              <button onClick={handleHideTrackDirect} className="p-1 text-zinc-500 hover:text-rose-400"><span className="text-xs font-bold">⊘</span></button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. DEDICATED MOBILE BOTTOM NAVIGATION BAR (<md) - SEPARATE CIRCLES  */}
      {/* ==================================================================== */}
      <nav className="md:hidden fixed bottom-4 left-0 right-0 z-40 flex items-center justify-center gap-5 pb-safe pointer-events-none select-none">
        <button
          onClick={() => dispatch(selectPlaylist(null))}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full shadow-lg backdrop-blur-xl transition-all ${
            isHome ? 'bg-indigo-500/90 text-white border-2 border-indigo-400/30' : 'bg-[#12121e]/80 text-zinc-400 border border-white/5 hover:bg-[#1a1a24]/90'
          }`}
        >
          <svg className="w-5 h-5" fill={isHome ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? '0' : '2'}><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
        </button>

        <button
          onClick={() => dispatch(selectPlaylist('search'))}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full shadow-lg backdrop-blur-xl transition-all ${
            isSearch ? 'bg-emerald-500/90 text-white border-2 border-emerald-400/30' : 'bg-[#12121e]/80 text-zinc-400 border border-white/5 hover:bg-[#1a1a24]/90'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isSearch ? '2.8' : '2'}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>

        <button
          onClick={() => dispatch(selectPlaylist('discover'))}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full shadow-lg backdrop-blur-xl transition-all ${
            isDiscover ? 'bg-amber-500/90 text-white border-2 border-amber-400/30' : 'bg-[#12121e]/80 text-zinc-400 border border-white/5 hover:bg-[#1a1a24]/90'
          }`}
        >
          <svg className="w-5 h-5" fill={isDiscover ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isDiscover ? '0' : '2'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </button>

        <button
          onClick={() => dispatch(selectPlaylist('liked'))}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full shadow-lg backdrop-blur-xl transition-all ${
            isLibrary ? 'bg-rose-500/90 text-white border-2 border-rose-400/30' : 'bg-[#12121e]/80 text-zinc-400 border border-white/5 hover:bg-[#1a1a24]/90'
          }`}
        >
          <svg className="w-5 h-5" fill={isLibrary ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isLibrary ? '0' : '2'}><path d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
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
