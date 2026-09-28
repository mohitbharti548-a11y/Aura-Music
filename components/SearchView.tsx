'use client';
// components/SearchView.tsx
// Spotify-Grade Search Experience with Queue, Add to Playlist Modal, Offline Download, and Lossless tags.
import { useState, useEffect, useRef, useTransition } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTrack,
  addToQueue,
  addOfflineTrackId,
  removeOfflineTrackId,
} from '../features/player/playerSlice';
import { fetchSongs, toggleLike, setLiked } from '../store/songsSlice';
import { downloadTrack, removeDownloadedTrack } from '../lib/offline-storage';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

interface SearchResponse {
  local: Song[];
  global: Song[];
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const BROWSE_GENRES = [
  {
    id: 'pop',
    title: 'Pop',
    query: 'Pop hits',
    gradient: 'from-pink-600 via-rose-600 to-pink-950',
    icon: '✨',
    art: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'hip-hop',
    title: 'Hip-Hop',
    query: 'Hip Hop',
    gradient: 'from-amber-600 via-orange-600 to-amber-950',
    icon: '🎤',
    art: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'bollywood',
    title: 'Bollywood',
    query: 'Bollywood Hits',
    gradient: 'from-red-600 via-rose-700 to-red-950',
    icon: '💃',
    art: 'https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'punjabi',
    title: 'Punjabi',
    query: 'Punjabi Hits',
    gradient: 'from-orange-500 via-amber-600 to-yellow-950',
    icon: '🔥',
    art: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'chill',
    title: 'Chill & Lo-Fi',
    query: 'Lofi Chill beats',
    gradient: 'from-indigo-600 via-violet-700 to-purple-950',
    icon: '☕',
    art: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'electronic',
    title: 'Dance / EDM',
    query: 'Electronic Dance',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-950',
    icon: '⚡',
    art: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'indie',
    title: 'Indie & Alt',
    query: 'Indie Rock',
    gradient: 'from-teal-600 via-emerald-700 to-teal-950',
    icon: '🎸',
    art: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'rock',
    title: 'Rock',
    query: 'Rock Classics',
    gradient: 'from-red-700 via-stone-800 to-black',
    icon: '⚡',
    art: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'focus',
    title: 'Focus & Study',
    query: 'Ambient Study piano',
    gradient: 'from-blue-600 via-indigo-800 to-slate-950',
    icon: '🎧',
    art: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'workout',
    title: 'Workout',
    query: 'Workout motivation',
    gradient: 'from-fuchsia-600 via-purple-700 to-violet-950',
    icon: '💪',
    art: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'rnb',
    title: 'R&B & Soul',
    query: 'R&B Hits',
    gradient: 'from-purple-700 via-pink-800 to-slate-950',
    icon: '🌙',
    art: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'acoustic',
    title: 'Acoustic',
    query: 'Acoustic guitar songs',
    gradient: 'from-emerald-700 via-teal-800 to-zinc-950',
    icon: '🍃',
    art: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=300&h=300&fit=crop&q=80',
  },
];

export default function SearchView() {
  const dispatch = useAppDispatch();
  const currentTrack = useAppSelector((s) => s.player.currentTrack);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);
  const offlineTrackIds = useAppSelector((s) => s.player.offlineTrackIds);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>({ local: [], global: [] });
  const [loading, setLoading] = useState(false);
  const [activeMenuSongId, setActiveMenuSongId] = useState<string | null>(null);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ local: [], global: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data: SearchResponse = await res.json();
          startTransition(() => {
            setResults(data);
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [query]);

  async function handleSelectSong(song: Song, isGlobal: boolean) {
    dispatch(setTrack(song));

    if (isGlobal) {
      try {
        await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration_seconds: song.duration_seconds,
            file_url: song.file_url,
            cover_url: song.cover_url,
            genre: song.genre,
            audio_format: song.audio_format || 'AAC',
            source: 'official',
          }),
        });
        dispatch(fetchSongs());
      } catch (err) {
        console.error('Auto-ingest error:', err);
      }
    }
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

  const allResults = [...results.local, ...results.global];
  const topResult = allResults[0] ?? null;
  const songResults = allResults.slice(0, 4);
  const remainingResults = allResults.slice(4);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-7 pb-32 sm:pb-28 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-black to-black select-none"
      onClick={() => setActiveMenuSongId(null)}
    >
      {/* 1. TOP SPOTIFY-STYLE SEARCH BAR */}
      <div className="mb-8 max-w-2xl">
        <div className="relative flex items-center group">
          <div className="absolute left-4.5 text-zinc-400 group-focus-within:text-white transition-colors text-base pointer-events-none">
            🔍
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.14] text-white placeholder-zinc-400 text-sm font-medium pl-12 pr-12 py-3.5 rounded-full border border-white/10 focus:border-white/25 focus:outline-none transition-all duration-200 shadow-lg shadow-black/40 backdrop-blur-md"
          />

          {loading ? (
            <div className="absolute right-4.5">
              <span className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin inline-block" />
            </div>
          ) : query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-4 text-zinc-400 hover:text-white text-xs w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* 2. DEFAULT VIEW: BROWSE ALL GENRES & CATEGORIES (SPOTIFY SEARCH HOME) */}
      {!query.trim() ? (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold tracking-tight text-white">Browse all</h3>
            <span className="text-xs text-zinc-500">Explore by mood & genre</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {BROWSE_GENRES.map((genre) => (
              <div
                key={genre.id}
                onClick={() => setQuery(genre.query)}
                className={`group relative h-36 rounded-2xl overflow-hidden cursor-pointer p-4 bg-gradient-to-br ${genre.gradient} border border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 depth-card hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between`}
              >
                <div className="z-10">
                  <span className="text-lg font-bold text-white tracking-tight drop-shadow-sm block">
                    {genre.title}
                  </span>
                </div>

                {/* Angled Spotify-Style Corner Cover Art */}
                <div className="absolute -bottom-2 -right-3 w-20 h-20 rounded-xl overflow-hidden shadow-2xl rotate-[22deg] group-hover:rotate-[14deg] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                  <img
                    src={genre.art}
                    alt={genre.title}
                    className="w-full h-full object-cover shadow-inner"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 3. ACTIVE SEARCH RESULTS (SPOTIFY SPLIT VIEW) */
        <div className="space-y-8 animate-in fade-in duration-200">
          {loading && allResults.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mb-3" />
              <p className="text-xs">Searching global library & streaming catalogs...</p>
            </div>
          ) : allResults.length === 0 ? (
            <div className="py-20 text-center text-zinc-400">
              <p className="text-base font-semibold text-white">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-zinc-500 mt-1">
                Please check the spelling or search for another artist, song, or album.
              </p>
            </div>
          ) : (
            <>
              {/* TOP RESULT & SONGS SPLIT (CLASSIC SPOTIFY DESKTOP LAYOUT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Top Result Hero Card */}
                {topResult && (
                  <div className="lg:col-span-5 flex flex-col">
                    <h3 className="text-lg font-bold text-white tracking-tight mb-3">
                      Top result
                    </h3>

                    <div
                      onClick={() => handleSelectSong(topResult, !results.local.some((s) => s.id === topResult.id))}
                      className="group relative flex-1 p-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 cursor-pointer transition-all duration-300 depth-card flex flex-col justify-between min-h-[220px]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-lg shadow-black/50">
                          {topResult.cover_url ? (
                            <img
                              src={topResult.cover_url}
                              alt={topResult.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-800 flex items-center justify-center text-xl">
                              ✦
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-xl font-bold text-white tracking-tight truncate group-hover:text-violet-300 transition-colors">
                          {topResult.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-400 font-medium truncate">
                            {topResult.artist}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Song
                          </span>
                        </div>
                      </div>

                      {/* Floating Play Button */}
                      <div className="absolute right-5 bottom-5">
                        <button
                          className={`w-12 h-12 rounded-full bg-violet-500 text-white flex items-center justify-center text-base shadow-xl shadow-violet-600/40 hover:scale-105 active:scale-95 transition-all duration-200 ${
                            currentTrack?.id === topResult.id && isPlaying
                              ? 'opacity-100 scale-100'
                              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                          }`}
                        >
                          {currentTrack?.id === topResult.id && isPlaying ? '❚❚' : '▶'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Right: Top 4 Song Rows */}
                <div className="lg:col-span-7 flex flex-col">
                  <h3 className="text-lg font-bold text-white tracking-tight mb-3">
                    Songs
                  </h3>

                  <div className="space-y-1">
                    {songResults.map((song) => {
                      const isActive = currentTrack?.id === song.id;
                      const isGlobal = !results.local.some((s) => s.id === song.id);
                      const isDownloaded = offlineTrackIds.includes(song.id);

                      return (
                        <div
                          key={song.id}
                          onClick={() => handleSelectSong(song, isGlobal)}
                          className={`group flex items-center justify-between px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-150 depth-card ${
                            isActive ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-violet-600/30 flex items-center justify-center text-xs">
                                  ✦
                                </div>
                              )}
                              <div
                                className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                                  isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                <span className="text-white text-xs">
                                  {isActive && isPlaying ? '❚❚' : '▶'}
                                </span>
                              </div>
                            </div>

                            <div className="min-w-0">
                              <p className={`font-semibold text-xs truncate ${isActive ? 'text-violet-300' : 'text-white'}`}>
                                {song.title}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isGlobal && (
                              <span className="hidden sm:inline-block text-[9px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                Official Release
                              </span>
                            )}
                            <span className="text-xs text-zinc-500 font-mono tabular-nums">
                              {formatDuration(song.duration_seconds)}
                            </span>

                            {/* Menu Button */}
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
              </div>

              {/* REMAINING SEARCH RESULTS (MORE RELEASES / CATALOG) */}
              {remainingResults.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-lg font-bold text-white tracking-tight mb-3">
                    More matching releases
                  </h3>

                  <div className="space-y-1">
                    {remainingResults.map((song, idx) => {
                      const isActive = currentTrack?.id === song.id;
                      const isGlobal = !results.local.some((s) => s.id === song.id);
                      const isDownloaded = offlineTrackIds.includes(song.id);

                      return (
                        <div
                          key={song.id}
                          onClick={() => handleSelectSong(song, isGlobal)}
                          className={`group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-150 depth-card ${
                            isActive ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="text-xs text-zinc-600 group-hover:hidden font-medium w-4 text-center">
                              {idx + 5}
                            </span>
                            <span className="hidden group-hover:flex text-white text-xs w-4 justify-center">
                              ▶
                            </span>

                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-violet-600/30 flex items-center justify-center text-xs">
                                  ✦
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className={`font-semibold text-xs truncate ${isActive ? 'text-violet-300' : 'text-white'}`}>
                                {song.title}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {song.artist} {song.album ? `• ${song.album}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isGlobal && (
                              <span className="hidden md:inline-block text-[9px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                                Cloud Ingestion Ready
                              </span>
                            )}
                            <span className="text-xs text-zinc-500 font-mono tabular-nums">
                              {formatDuration(song.duration_seconds)}
                            </span>

                            {/* Menu Button */}
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
              )}
            </>
          )}
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
