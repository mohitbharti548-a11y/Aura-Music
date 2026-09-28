'use client';
// components/DiscoverBrowse.tsx
import { useState, useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setTrack } from '../features/player/playerSlice';
import type { Song } from '../types/music';

interface GenreCategory {
  id: string;
  name: string;
  query: string;
  gradient: string;
  icon: string;
}

const MOOD_CATEGORIES: GenreCategory[] = [
  { id: 'happy', name: 'Happy & Upbeat', query: 'happy feel good pop', gradient: 'from-amber-500 to-rose-500', icon: '☀️' },
  { id: 'chill', name: 'Chill & Relax', query: 'chillout lofi lounge', gradient: 'from-teal-500 to-indigo-600', icon: '☕' },
  { id: 'sad', name: 'Sad & Melancholy', query: 'sad acoustic piano', gradient: 'from-slate-600 to-indigo-900', icon: '🌧️' },
  { id: 'workout', name: 'Workout & Energy', query: 'workout high energy edm', gradient: 'from-orange-500 to-red-600', icon: '⚡' },
  { id: 'party', name: 'Party & Dance', query: 'party dance club hits', gradient: 'from-fuchsia-600 to-purple-600', icon: '🪩' },
  { id: 'focus', name: 'Focus & Study', query: 'ambient study instrumental', gradient: 'from-emerald-600 to-cyan-700', icon: '🎧' },
  { id: 'late_night', name: 'Late Night Vibes', query: 'late night synthwave', gradient: 'from-purple-900 to-pink-900', icon: '🌙' },
  { id: 'acoustic', name: 'Acoustic & Pure', query: 'acoustic guitar indie', gradient: 'from-amber-700 to-yellow-800', icon: '🎸' },
];

const LANGUAGE_CATEGORIES: GenreCategory[] = [
  { id: 'english', name: 'English Top Hits', query: 'top hits english pop', gradient: 'from-blue-600 to-violet-600', icon: '🌐' },
  { id: 'hindi', name: 'Hindi & Bollywood', query: 'bollywood hindi hits', gradient: 'from-rose-600 to-orange-500', icon: '🇮🇳' },
  { id: 'punjabi', name: 'Punjabi Beats', query: 'punjabi pop hits', gradient: 'from-amber-500 to-red-500', icon: '🔥' },
  { id: 'latin', name: 'Latin & Reggaeton', query: 'reggaeton latin hits', gradient: 'from-emerald-500 to-lime-600', icon: '🌴' },
  { id: 'kpop', name: 'K-Pop & Asian', query: 'k-pop top hits', gradient: 'from-pink-500 to-rose-600', icon: '✨' },
  { id: 'sufi', name: 'Sufi & Indie Classical', query: 'sufi indie acoustic', gradient: 'from-amber-800 to-orange-950', icon: '🪕' },
];

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DiscoverBrowse({
  onSelectSong,
}: {
  onSelectSong?: (song: Song) => void;
}) {
  const dispatch = useAppDispatch();
  const [activeCategory, setActiveCategory] = useState<GenreCategory | null>(null);
  const [categoryTracks, setCategoryTracks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeCategory) {
      setCategoryTracks([]);
      return;
    }

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(activeCategory.query)}`)
      .then((res) => res.json())
      .then((data) => {
        const combined = [...(data.local || []), ...(data.global || [])];
        setCategoryTracks(combined);
      })
      .catch((err) => {
        console.error('Failed to load category tracks:', err);
      })
      .finally(() => setLoading(false));
  }, [activeCategory]);

  function handlePlay(song: Song) {
    dispatch(setTrack(song));
    if (onSelectSong) onSelectSong(song);
  }

  function handlePlayAll() {
    if (categoryTracks.length > 0) {
      dispatch(setTrack(categoryTracks[0]));
    }
  }

  // Active Category View
  if (activeCategory) {
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-7 pb-32 sm:pb-28 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-black to-black select-none">
        {/* Back Button */}
        <button
          onClick={() => setActiveCategory(null)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs mb-6 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] w-fit transition-all duration-200"
        >
          <span>←</span>
          <span>Back to Discover</span>
        </button>

        {/* Hero Category Banner */}
        <div
          className={`p-8 rounded-3xl bg-gradient-to-r ${activeCategory.gradient} mb-8 shadow-2xl shadow-black/60 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative overflow-hidden`}
        >
          <div className="relative z-10">
            <span className="text-4xl mb-2 block">{activeCategory.icon}</span>
            <span className="text-xs uppercase tracking-widest font-bold text-white/70">Category</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
              {activeCategory.name}
            </h1>
            <p className="text-xs text-white/80 mt-1 font-medium">
              Hand-picked studio masters & curated tracks
            </p>
          </div>

          <button
            onClick={handlePlayAll}
            disabled={categoryTracks.length === 0}
            className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/40 disabled:opacity-40"
          >
            <span>▶</span>
            <span>Play All</span>
          </button>
        </div>

        {/* Category Tracks Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-white/[0.03] rounded-xl shimmer-effect border border-white/[0.05]" />
            ))}
          </div>
        ) : categoryTracks.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            No tracks found in this category right now.
          </div>
        ) : (
          <div className="space-y-1">
            {categoryTracks.map((song, idx) => (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all duration-200 depth-card"
              >
                <div className="flex items-center gap-3.5 min-w-0">
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
                      <div className="w-full h-full bg-gradient-to-tr from-violet-600/40 to-fuchsia-600/40 flex items-center justify-center text-xs">
                        ✦
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-violet-300">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-zinc-500 font-mono tabular-nums">
                    {formatDuration(song.duration_seconds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main Discover Category Grid
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-7 pb-32 sm:pb-28 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-black to-black select-none">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white">Discover</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Browse by mood, vibe, language, and curated genres.
        </p>
      </div>

      {/* Mood & Types Section */}
      <div className="mb-10">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-4">
          Moods & Vibes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {MOOD_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`depth-card p-5 rounded-2xl bg-gradient-to-br ${cat.gradient} cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                  {cat.icon}
                </span>
                <span className="text-xs opacity-0 group-hover:opacity-100 text-white font-bold transition-opacity">
                  Explore →
                </span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">{cat.name}</h4>
            </div>
          ))}
        </div>
      </div>

      {/* Languages & Regions Section */}
      <div className="mb-10">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-4">
          Languages & Regions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {LANGUAGE_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`depth-card p-5 rounded-2xl bg-gradient-to-br ${cat.gradient} cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                  {cat.icon}
                </span>
                <span className="text-xs opacity-0 group-hover:opacity-100 text-white font-bold transition-opacity">
                  Explore →
                </span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">{cat.name}</h4>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
