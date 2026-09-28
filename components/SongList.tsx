'use client';
// components/SongList.tsx
// High-fidelity Song List & Cards grid with Queue, Playlist Modal, Offline Download, and lossless tags.
import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTrack,
  addToQueue,
  addOfflineTrackId,
  removeOfflineTrackId,
} from '../features/player/playerSlice';
import { toggleLike, setLiked } from '../store/songsSlice';
import { removeSongFromPlaylist } from '../store/playlistsSlice';
import { detectFormat, isLossless } from '@/lib/codec-utils';
import { downloadTrack, removeDownloadedTrack } from '@/lib/offline-storage';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

interface Props {
  songs: Song[];
  loading: boolean;
  title: string;
  queue: Song[];
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const GRADIENT_PALETTES = [
  'from-indigo-600/30 via-violet-600/20 to-purple-800/40 border-violet-500/20',
  'from-cyan-600/30 via-blue-600/20 to-indigo-800/40 border-cyan-500/20',
  'from-emerald-600/30 via-teal-600/20 to-cyan-800/40 border-emerald-500/20',
  'from-rose-600/30 via-pink-600/20 to-purple-800/40 border-rose-500/20',
  'from-amber-600/30 via-orange-600/20 to-rose-800/40 border-amber-500/20',
  'from-fuchsia-600/30 via-purple-600/20 to-indigo-800/40 border-fuchsia-500/20',
];

export default function SongList({ songs, loading, title, queue }: Props) {
  const dispatch = useAppDispatch();
  const currentTrack = useAppSelector((s) => s.player.currentTrack);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);
  const offlineTrackIds = useAppSelector((s) => s.player.offlineTrackIds);
  const { selectedId } = useAppSelector((s) => s.playlists);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activeMenuSongId, setActiveMenuSongId] = useState<string | null>(null);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        (song.album && song.album.toLowerCase().includes(q));

      const matchesGenre =
        !selectedGenre ||
        (song.genre && song.genre.toLowerCase() === selectedGenre.toLowerCase());

      return matchesSearch && matchesGenre;
    });
  }, [songs, searchQuery, selectedGenre]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const song of songs) {
      if (song.genre) set.add(song.genre);
    }
    return Array.from(set);
  }, [songs]);

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

  async function handleRemoveFromCurrentPlaylist(songId: string) {
    if (!selectedId || selectedId === 'liked' || selectedId === 'downloaded') return;
    await dispatch(removeSongFromPlaylist({ playlistId: selectedId, songId }));
    setActiveMenuSongId(null);
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-7 pb-32 sm:pb-28 select-none relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/15 via-black to-black"
      onClick={() => setActiveMenuSongId(null)}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
          <span className="text-xs text-zinc-500 font-medium">
            {filteredSongs.length} {filteredSongs.length === 1 ? 'track' : 'tracks'}
          </span>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.04] p-0.5 rounded-full border border-white/[0.06]">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Minimal Genre Filter Chips */}
      {genres.length > 0 && (
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all depth-button ${
              selectedGenre === null
                ? 'bg-white text-black font-semibold'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
            }`}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all depth-button ${
                selectedGenre === g
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSongs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-zinc-400 text-sm">No tracks found.</p>
          <span className="text-zinc-600 text-xs mt-1">Try another filter or search in the Search tab.</span>
        </div>
      )}

      {/* GRID VIEW WITH COLOR GRADIENT CARDS */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredSongs.map((song, i) => {
            const isActive = currentTrack?.id === song.id;
            const isDownloaded = offlineTrackIds.includes(song.id);
            const gradientClass = GRADIENT_PALETTES[i % GRADIENT_PALETTES.length];
            const format = song.audio_format || detectFormat(song.file_url);

            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className={`depth-card group relative p-3.5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 ${
                  isActive
                    ? 'ring-1 ring-violet-500/50 bg-violet-950/20'
                    : ''
                }`}
              >
                {/* Artwork Container */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 shadow-md">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
                    >
                      <span className="text-2xl opacity-40">✦</span>
                    </div>
                  )}

                  {/* Format & Offline Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {isDownloaded && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/80 text-white shadow-sm">
                        OFFLINE
                      </span>
                    )}
                    {format && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/15 text-zinc-300">
                        {format.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Play / Pause Floating Indicator */}
                  <div
                    className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center transition-all duration-200 ${
                      isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-xs shadow-xl group-hover:scale-110 transition-transform">
                      {isActive && isPlaying ? '❚❚' : '▶'}
                    </div>
                  </div>
                </div>

                {/* Track Info */}
                <div className="min-w-0 pr-1">
                  <p className={`font-semibold text-xs truncate ${isActive ? 'text-violet-300' : 'text-zinc-100'}`}>
                    {song.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                    {song.artist}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {formatDuration(song.duration_seconds)}
                  </span>

                  <div className="flex items-center gap-1.5">
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

                          {selectedId && selectedId !== 'liked' && selectedId !== 'downloaded' && (
                            <button
                              onClick={() => handleRemoveFromCurrentPlaylist(song.id)}
                              className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 transition-colors"
                            >
                              <span>✕</span>
                              <span>Remove from Playlist</span>
                            </button>
                          )}
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
              </div>
            );
          })}
        </div>
      ) : (
        /* MINIMAL LIST VIEW */
        <div className="space-y-1">
          {filteredSongs.map((song, idx) => {
            const isActive = currentTrack?.id === song.id;
            const isDownloaded = offlineTrackIds.includes(song.id);

            return (
              <div
                key={song.id}
                onDoubleClick={() => handlePlay(song)}
                className={`group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 depth-card ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                {/* Index / Play / Equalizer */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-5 text-center flex items-center justify-center">
                    {isActive && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-violet-400 rounded-full animate-eq-1" />
                        <span className="w-0.5 bg-violet-400 rounded-full animate-eq-2" />
                        <span className="w-0.5 bg-violet-400 rounded-full animate-eq-3" />
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-zinc-600 group-hover:hidden font-medium">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => handlePlay(song)}
                          className="hidden group-hover:flex text-white text-xs"
                          aria-label="Play track"
                        >
                          ▶
                        </button>
                      </>
                    )}
                  </div>

                  {/* Artwork + Title */}
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
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
                    <p className="text-[11px] text-zinc-400 truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                {/* Duration & Like */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-zinc-500 font-medium">
                    {formatDuration(song.duration_seconds)}
                  </span>
                  <button
                    onClick={(e) => handleLike(e, song)}
                    className="p-1 text-sm hover:scale-125 transition-transform"
                    aria-label="Like"
                  >
                    {song.is_liked ? (
                      <span className="text-rose-500">♥</span>
                    ) : (
                      <span className="text-zinc-600 group-hover:text-zinc-400">♡</span>
                    )}
                  </button>

                  {/* Options Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuSongId(activeMenuSongId === song.id ? null : song.id);
                      }}
                      className="text-zinc-600 hover:text-white p-1 text-xs"
                    >
                      •••
                    </button>

                    {activeMenuSongId === song.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-7 z-40 w-48 bg-[#121218]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-1.5 space-y-1 animate-in zoom-in-95 duration-150"
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

                        {selectedId && selectedId !== 'liked' && selectedId !== 'downloaded' && (
                          <button
                            onClick={() => handleRemoveFromCurrentPlaylist(song.id)}
                            className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 transition-colors"
                          >
                            <span>✕</span>
                            <span>Remove from Playlist</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={playlistModalSong}
        isOpen={!!playlistModalSong}
        onClose={() => setPlaylistModalSong(null)}
      />
    </div>
  );
}
