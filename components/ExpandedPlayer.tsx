'use client';
// components/ExpandedPlayer.tsx
// Full-Screen / Expanded Now Playing Screen with Synchronized Lyrics & Spotify-Style Credits.
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
  setVolume,
  setQueueOpen,
  setEqualizerOpen,
  setSleepTimerOpen,
  addOfflineTrackId,
  removeOfflineTrackId,
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
    volume,
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
  const [downloadProgress, setDownloadProgress] = useState(0);

  const activeLyricRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  if (!isExpandedOpen || !currentTrack) return null;

  const isOffline = offlineTrackIds.includes(currentTrack.id);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  async function handleToggleDownload() {
    if (!currentTrack) return;
    if (isOffline) {
      await removeDownloadedTrack(currentTrack.id);
      dispatch(removeOfflineTrackId(currentTrack.id));
    } else {
      setIsDownloading(true);
      setDownloadProgress(10);
      try {
        await downloadTrack(currentTrack, (p) => setDownloadProgress(p));
        dispatch(addOfflineTrackId(currentTrack.id));
      } catch (err) {
        console.error('Download error:', err);
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
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
      className="fixed inset-0 z-[80] bg-[#07070a] text-white overflow-y-auto select-none animate-in slide-in-from-bottom-6 duration-300 scroll-smooth"
    >
      {/* Dynamic Ambient Cover Glow */}
      <div
        className="fixed inset-0 opacity-25 pointer-events-none blur-[120px] transition-all duration-700"
        style={{
          background: currentTrack.cover_url
            ? `radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.45), rgba(217, 70, 239, 0.25), transparent 70%)`
            : `radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.4), transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 min-h-screen flex flex-col justify-between">
        {/* 1. TOP HEADER & QUICK TOOLBAR */}
        <div className="flex items-center justify-between pb-6">
          <button
            onClick={() => dispatch(setExpandedOpen(false))}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95"
            title="Minimize (Close)"
          >
            ▼
          </button>

          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Playing from Library
            </p>
            <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {currentTrack.album ?? 'Aura Music Master'}
            </p>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2">
            {/* Sleep timer button */}
            <button
              onClick={() => dispatch(setSleepTimerOpen(true))}
              className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs transition-all ${
                sleepTimer.active
                  ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-600/40'
                  : 'bg-white/5 hover:bg-white/15 border-white/10 text-zinc-300 hover:text-white'
              }`}
              title="Sleep Timer"
            >
              🌙
            </button>

            {/* Equalizer button */}
            <button
              onClick={() => dispatch(setEqualizerOpen(true))}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center text-xs transition-all"
              title="Audio Equalizer"
            >
              🎚
            </button>

            {/* Queue button */}
            <button
              onClick={() => dispatch(setQueueOpen(true))}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center text-xs transition-all"
              title="View Queue"
            >
              ≣
            </button>
          </div>
        </div>

        {/* 2. MAIN HERO PLAYBACK STAGE */}
        <div className="flex flex-col items-center justify-center my-auto py-8">
          {/* Vinyl / Cover Art Container */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/15 group">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-violet-700 via-purple-900 to-indigo-950 flex items-center justify-center text-5xl">
                ✦
              </div>
            )}

            {/* Overlay equalizers on playing */}
            {isPlaying && (
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 flex items-center gap-1">
                <span className="w-1 h-3 bg-violet-400 rounded-full animate-eq-1" />
                <span className="w-1 h-5 bg-fuchsia-400 rounded-full animate-eq-2" />
                <span className="w-1 h-3 bg-cyan-400 rounded-full animate-eq-3" />
                <span className="text-[10px] font-semibold text-white ml-1">PLAYING</span>
              </div>
            )}
          </div>

          {/* Track Meta & Like */}
          <div className="w-full max-w-md flex items-center justify-between mt-8">
            <div className="min-w-0 pr-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                {currentTrack.title}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 font-medium truncate mt-1">
                {currentTrack.artist}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Add to Playlist button */}
              <button
                onClick={() => setIsPlaylistModalOpen(true)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center text-base transition-all"
                title="Add to Playlist"
              >
                +
              </button>

              {/* Download / Offline button */}
              <button
                onClick={handleToggleDownload}
                disabled={isDownloading}
                className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm transition-all ${
                  isOffline
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/5 hover:bg-white/15 border-white/10 text-zinc-300 hover:text-white'
                }`}
                title={isOffline ? 'Downloaded for Offline Listen' : 'Download Offline'}
              >
                {isDownloading ? (
                  <span className="text-[10px] font-mono">{downloadProgress}%</span>
                ) : isOffline ? (
                  '✓'
                ) : (
                  '↓'
                )}
              </button>

              {/* Like Heart */}
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
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-90"
              >
                {currentTrack.is_liked ? (
                  <span className="text-rose-500">♥</span>
                ) : (
                  <span className="text-zinc-400 hover:text-white">♡</span>
                )}
              </button>
            </div>
          </div>

          {/* Scrub Bar */}
          <div className="w-full max-w-md mt-6">
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer group">
              <div
                className="absolute inset-y-0 bg-gradient-to-r from-violet-500 via-fuchsia-400 to-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
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
              />
            </div>

            <div className="flex justify-between text-xs font-mono text-zinc-400 mt-2">
              <span>{formatTime(currentTime)}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                  {currentTrack.audio_format?.toUpperCase() || 'LOSSLESS'}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="w-full max-w-md flex items-center justify-between mt-6 px-4">
            <button
              onClick={() => dispatch(toggleShuffle())}
              className={`text-sm transition-colors ${
                isShuffle ? 'text-violet-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              ⇄
            </button>

            <button
              onClick={() => dispatch(previousTrack(queue))}
              className="text-zinc-400 hover:text-white text-xl transition-transform active:scale-90"
            >
              ◀◀
            </button>

            <button
              onClick={() => dispatch(togglePlay())}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center text-xl font-bold shadow-xl shadow-white/20 transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>

            <button
              onClick={() => dispatch(nextTrack(queue))}
              className="text-zinc-400 hover:text-white text-xl transition-transform active:scale-90"
            >
              ▶▶
            </button>

            <button
              onClick={() => dispatch(cycleRepeat())}
              className={`text-sm transition-colors ${
                repeatMode !== 'off' ? 'text-violet-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {repeatMode === 'one' ? '↺1' : '↺'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="w-full max-w-xs flex items-center gap-3 mt-6">
            <span className="text-zinc-500 text-xs">🔈</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => dispatch(setVolume(Number(e.target.value)))}
              className="w-full accent-violet-500 h-1 cursor-pointer"
            />
            <span className="text-zinc-500 text-xs">🔊</span>
          </div>

          {/* Scroll Down Hint */}
          <div className="mt-10 flex flex-col items-center text-zinc-500 animate-bounce">
            <span className="text-[11px] font-semibold tracking-wider uppercase">
              Scroll down for lyrics & credits
            </span>
            <span className="text-base mt-1">↓</span>
          </div>
        </div>

        {/* 3. SYNCHRONIZED LYRICS SECTION (SPOTIFY STYLE) */}
        <div className="mt-16 pt-12 border-t border-white/10 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎙</span>
              <h2 className="text-2xl font-bold text-white tracking-tight">Lyrics</h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {lyrics.length > 0 ? 'Synchronized Mode' : 'Loading Lyrics...'}
            </span>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl space-y-6">
            {lyrics.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-10">
                Fetching lyrics for this track...
              </p>
            ) : (
              lyrics.map((line, idx) => {
                const isActive = activeLyricIndex === idx;
                const isPast = activeLyricIndex > idx;

                return (
                  <div
                    key={idx}
                    ref={isActive ? activeLyricRef : null}
                    onClick={() => handleSeekToLyric(line.time)}
                    className={`cursor-pointer transition-all duration-300 py-1 ${
                      isActive
                        ? 'text-2xl sm:text-3xl font-extrabold text-white scale-[1.02] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                        : isPast
                        ? 'text-lg sm:text-xl font-medium text-zinc-500 hover:text-zinc-300'
                        : 'text-lg sm:text-xl font-medium text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. CREDITS & SONG DETAILS (SPOTIFY STYLE) */}
        {credits && (
          <div className="mt-16 pt-12 pb-24 border-t border-white/10 max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="text-xl">ℹ</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">Credits & Details</h2>
              </div>
              <span className="text-xs text-zinc-400">{credits.source}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Performed By */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Performed By
                </p>
                <div className="space-y-1">
                  {credits.performedBy.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <p className="text-sm font-semibold text-white">{p}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Written By */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Written By
                </p>
                <div className="space-y-1">
                  {credits.writtenBy.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <p className="text-sm font-medium text-zinc-300">{w}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Produced & Composed By */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Produced & Composed By
                </p>
                <div className="space-y-1">
                  {credits.producedBy.map((prod, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                      <p className="text-sm font-medium text-zinc-300">{prod}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audio Specifications */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Audio Quality & Master
                </p>
                <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Codec:</span>
                    <span className="text-violet-400 font-bold">{credits.audioSpecs.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sample Rate:</span>
                    <span>{credits.audioSpecs.sampleRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Bit Depth:</span>
                    <span>{credits.audioSpecs.bitDepth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Bitrate:</span>
                    <span>{credits.audioSpecs.bitrate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={currentTrack}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
    </div>
  );
}
