'use client';
// components/SpotlightSearch.tsx
import { useState, useEffect, useRef, useTransition } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setTrack } from '../features/player/playerSlice';
import { fetchSongs } from '../store/songsSlice';
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

export default function SpotlightSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>({ local: [], global: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ local: [], global: [] });
    }
  }, [isOpen]);

  // Handle Ctrl+K / Cmd+K and Esc globally
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open trigger handled by parent, or toggle
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query
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

  // Play & Auto-Ingest
  async function handleSelectSong(song: Song, isGlobal: boolean) {
    // 1. Play track immediately with pristine original audio
    dispatch(setTrack(song));
    onClose();

    // 2. Persist to Neon DB cleanly in the background
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

        // Refresh library
        dispatch(fetchSongs());
      } catch (err) {
        console.error('Auto-ingest error:', err);
      }
    }
  }

  if (!isOpen) return null;

  const totalResults = results.local.length + results.global.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0e0e12]/95 border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08]">
          <span className="text-zinc-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search millions of songs, artists, albums..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          {loading && (
            <span className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:inline-block text-[10px] text-zinc-500 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!query.trim() ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              <p className="text-sm font-medium text-zinc-400">Search any song or artist</p>
              <p className="mt-1 text-zinc-600">
                Instant play & automatic background saving into your library.
              </p>
            </div>
          ) : !loading && totalResults === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No results found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {/* Local Library Matches */}
              {results.local.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    In Your Library
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.local.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => handleSelectSong(song, false)}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all duration-150 depth-button"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
                            {song.cover_url ? (
                              <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-violet-600/30 flex items-center justify-center text-xs">
                                ✦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate group-hover:text-violet-300">
                              {song.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-zinc-500 tabular-nums">
                            {formatDuration(song.duration_seconds)}
                          </span>
                          <span className="text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            ▶ Play
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Global Cloud Matches (iTunes API) */}
              {results.global.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Global Music Catalog</span>
                    <span className="text-[9px] text-zinc-600">Auto-saves to Library</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.global.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => handleSelectSong(song, true)}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all duration-150 depth-button"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
                            {song.cover_url ? (
                              <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-blue-600/30 flex items-center justify-center text-xs">
                                ✦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300">
                              {song.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                            Official Release
                          </span>
                          <span className="text-[10px] text-zinc-500 tabular-nums">
                            {formatDuration(song.duration_seconds)}
                          </span>
                          <span className="text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            ▶ Play
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-black/40 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500">
          <span>Click any track to play instantly</span>
          <span>Tip: Press <kbd className="font-mono bg-white/[0.06] px-1 rounded">Ctrl+K</kbd> anytime</span>
        </div>
      </div>
    </div>
  );
}
