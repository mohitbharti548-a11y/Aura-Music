'use client';
// components/HomeView.tsx
// Home View with Recently Played cards, All Tracks, and Context Menus.
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTrack,
  addToQueue,
  addOfflineTrackId,
  removeOfflineTrackId,
} from '../features/player/playerSlice';
import { toggleLike, setLiked } from '../store/songsSlice';
import { downloadTrack, removeDownloadedTrack } from '../lib/offline-storage';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const GRADIENTS = [
  'from-indigo-600/30 via-violet-600/20 to-purple-800/40',
  'from-cyan-600/30 via-blue-600/20 to-indigo-800/40',
  'from-emerald-600/30 via-teal-600/20 to-cyan-800/40',
  'from-rose-600/30 via-pink-600/20 to-purple-800/40',
  'from-amber-600/30 via-orange-600/20 to-rose-800/40',
];

export default function HomeView({
  allSongs,
}: {
  allSongs: Song[];
}) {
  const dispatch = useAppDispatch();
  const currentTrack = useAppSelector((s) => s.player.currentTrack);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);
  const recentlyPlayed = useAppSelector((s) => s.player.recentlyPlayed);
  const offlineTrackIds = useAppSelector((s) => s.player.offlineTrackIds);

  const [activeMenuSongId, setActiveMenuSongId] = useState<string | null>(null);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  function handlePlay(song: Song) {
    dispatch(setTrack(song));
  }

  function handleLike(e: React.MouseEvent, song: Song) {
    e.stopPropagation();
    const nextLiked = !song.is_liked;
    dispatch(setLiked({ id: song.id, liked: nextLiked }));
    dispatch(toggleLike({ id: song.id, currentlyLiked: !!song.is_liked }))
      .unwrap()
      .catch(() => {
        dispatch(setLiked({ id: song.id, liked: !!song.is_liked }));
      });
  }

  async function handleToggleDownload(e: React.MouseEvent, song: Song) {
    e.stopPropagation();
    const isDownloaded = offlineTrackIds.includes(song.id);
    if (isDownloaded) {
      await removeDownloadedTrack(song.id);
      dispatch(removeOfflineTrackId(song.id));
    } else {
      try {
        await downloadTrack(song);
        dispatch(addOfflineTrackId(song.id));
      } catch (err) {
        console.error('Download error:', err);
      }
    }
    setActiveMenuSongId(null);
  }

  const recentList = recentlyPlayed.length > 0 ? recentlyPlayed : allSongs.slice(0, 6);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-7 pb-32 sm:pb-28 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-black to-black select-none"
      onClick={() => setActiveMenuSongId(null)}
    >
      {/* Top Welcome Banner */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Home</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Pick up right where you left off.
          </p>
        </div>
      </div>

      {/* 1. RECENTLY PLAYED SECTION */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">
            Recently Played
          </h3>
          <span className="text-[11px] text-zinc-500">
            {recentlyPlayed.length > 0 ? 'Your latest history' : 'Suggested tracks'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recentList.map((song, i) => {
            const isActive = currentTrack?.id === song.id;
            const isDownloaded = offlineTrackIds.includes(song.id);
            const grad = GRADIENTS[i % GRADIENTS.length];

            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className={`depth-card group p-3 rounded-2xl cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  isActive ? 'ring-1 ring-violet-400/50 bg-violet-950/25' : ''
                }`}
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 shadow-md">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                      <span className="text-2xl opacity-40">✦</span>
                    </div>
                  )}

                  {isDownloaded && (
                    <span className="absolute top-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/80 text-white shadow-sm">
                      OFFLINE
                    </span>
                  )}

                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                      isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-xs shadow-xl">
                      {isActive && isPlaying ? '❚❚' : '▶'}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className={`font-semibold text-xs truncate ${isActive ? 'text-violet-300' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. ALL TRACKS IN SEQUENCE */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">
            All Tracks
          </h3>
          <span className="text-[11px] text-zinc-500">{allSongs.length} songs</span>
        </div>

        <div className="space-y-1">
          {allSongs.map((song, idx) => {
            const isActive = currentTrack?.id === song.id;
            const isDownloaded = offlineTrackIds.includes(song.id);

            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className={`group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 depth-card ${
                  isActive ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-xs text-zinc-600 group-hover:hidden font-medium w-4 text-center">
                    {idx + 1}
                  </span>
                  <button
                    className="hidden group-hover:flex text-white text-xs w-4 justify-center"
                    aria-label="Play"
                  >
                    ▶
                  </button>

                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/30 flex items-center justify-center text-xs">
                        ✦
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-xs truncate ${isActive ? 'text-violet-300' : 'text-white'}`}>
                        {song.title}
                      </p>
                      {isDownloaded && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-zinc-500 font-mono tabular-nums">
                    {formatDuration(song.duration_seconds)}
                  </span>

                  {/* Context Menu Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuSongId(activeMenuSongId === song.id ? null : song.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-white text-xs"
                    >
                      •••
                    </button>

                    {activeMenuSongId === song.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-7 z-40 w-48 bg-[#121218]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-1.5 space-y-1 animate-in zoom-in-95 duration-150"
                      >
                        <button
                          onClick={() => {
                            dispatch(addToQueue(song));
                            setActiveMenuSongId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <span>≣</span>
                          <span>Add to Queue</span>
                        </button>

                        <button
                          onClick={() => {
                            setPlaylistModalSong(song);
                            setActiveMenuSongId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <span>+</span>
                          <span>Add to Playlist...</span>
                        </button>

                        <button
                          onClick={(e) => handleToggleDownload(e, song)}
                          className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <span>{isDownloaded ? '✓' : '↓'}</span>
                          <span>{isDownloaded ? 'Remove Offline' : 'Download Offline'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleLike(e, song)}
                    className="p-1 text-xs hover:scale-125 transition-transform"
                    aria-label="Like"
                  >
                    {song.is_liked ? (
                      <span className="text-rose-500">♥</span>
                    ) : (
                      <span className="text-zinc-600 group-hover:text-zinc-400">♡</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={playlistModalSong}
        isOpen={!!playlistModalSong}
        onClose={() => setPlaylistModalSong(null)}
      />
    </div>
  );
}
