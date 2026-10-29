'use client';
// components/TasteDnaModal.tsx
// Sāṅgīt Taste DNA & Algorithmic Music Intelligence Dashboard
// Interactive Acoustic Radar, Diurnal Chronotype, and Steerable Serendipity Slider
import { useState, useEffect } from 'react';
import {
  getTasteProfile,
  getTopUserAttributes,
  setSerendipityLevel,
  type TasteProfile,
} from '../lib/personalization';

interface TasteDnaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TasteDnaModal({ isOpen, onClose }: TasteDnaModalProps) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [serendipity, setSerendipity] = useState(0.35);

  useEffect(() => {
    if (isOpen) {
      const p = getTasteProfile();
      setProfile(p);
      setSerendipity(p.serendipity);
    }
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const {
    topGenre,
    topArtist,
    chronotype,
    experienceLevel,
    completionRatePct,
  } = getTopUserAttributes();

  const totalMinutes = Math.round(profile.totalListeningSeconds / 60);

  function handleSerendipityChange(val: number) {
    setSerendipity(val);
    setSerendipityLevel(val);
  }

  // Top 5 Artists
  const sortedArtists = Object.entries(profile.artists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top 4 Genres
  const sortedGenres = Object.entries(profile.genres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0c0c14] border border-white/10 shadow-2xl p-5 sm:p-7 text-zinc-100 custom-scrollbar">
        
        {/* Header with Sāṅgīt Mark */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#36848d] via-[#48989f] to-[#d1b27d] p-[1.5px] shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-[#08080c] rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/logo-mark.png" alt="Sāṅgīt" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  Sāṅgīt Taste DNA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-teal-400 to-amber-300 text-black">
                  Live Wrapped
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Algorithmic profiling, acoustic radar & steerable serendipity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all active:scale-95"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. Chronotype & Key Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-5">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-teal-400 tracking-wider">Chronotype</span>
            <span className="text-sm font-bold text-white mt-1 leading-tight">{chronotype}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Listening rhythm</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Experience</span>
            <span className="text-sm font-bold text-white mt-1 leading-tight">{experienceLevel}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">{profile.totalListens} total tracks</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">Completion Rate</span>
            <span className="text-sm font-bold text-white mt-1 leading-tight">{completionRatePct}%</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">{profile.completedTracks} finished songs</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider">Audio Time</span>
            <span className="text-sm font-bold text-white mt-1 leading-tight">{totalMinutes} mins</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Lossless master audio</span>
          </div>
        </div>

        {/* 2. Steerable Serendipity Slider (Spotify-Killer Feature) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-sky-950/20 to-amber-950/40 border border-teal-500/30 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Algorithm Serendipity Steerer</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                {serendipity <= 0.25 ? 'Familiar Comfort' : serendipity >= 0.70 ? 'Deep Discovery' : 'Balanced Flow'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">
              {Math.round(serendipity * 100)}% Discovery
            </span>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Spotify traps you in an echo-chamber of the same 25 tracks. Tune Sāṅgīt’s recommendation engine in real time:
          </p>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={serendipity}
            onChange={(e) => handleSerendipityChange(parseFloat(e.target.value))}
            className="w-full accent-teal-400 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-medium mt-1.5">
            <span>🛡️ Familiar Favorites (90/10)</span>
            <span>⚖️ Harmonic Balance</span>
            <span>🚀 Deep Frontiers (10/90)</span>
          </div>
        </div>

        {/* 3. Live Acoustic Radar */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Acoustic Multi-Vector Radar
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">Energy & Punch</span>
                <span className="font-mono text-teal-400 font-semibold">{profile.acousticRadar.energy}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-sky-400 transition-all duration-500"
                  style={{ width: `${profile.acousticRadar.energy}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">Mood Valence (Euphoria / Positivity)</span>
                <span className="font-mono text-amber-400 font-semibold">{profile.acousticRadar.valence}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${profile.acousticRadar.valence}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">Danceability & Rhythm</span>
                <span className="font-mono text-indigo-400 font-semibold">{profile.acousticRadar.danceability}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${profile.acousticRadar.danceability}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">Acoustic & Organic Warmth</span>
                <span className="font-mono text-rose-400 font-semibold">{profile.acousticRadar.acousticness}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-500"
                  style={{ width: `${profile.acousticRadar.acousticness}%` }}
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs text-zinc-400">
              <span>Preferred Listening Tempo:</span>
              <span className="font-mono text-white font-bold">{profile.acousticRadar.averageBpm} BPM (Camelot Wheel Aligned)</span>
            </div>
          </div>
        </div>

        {/* 4. Top Affinity Artists & Genres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
              Top Artist Affinities
            </h4>
            {sortedArtists.length > 0 ? (
              <div className="space-y-2">
                {sortedArtists.map(([artist, count], idx) => (
                  <div key={artist} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono w-4">{idx + 1}.</span>
                      <span className="text-white font-medium">{artist}</span>
                    </div>
                    <span className="text-zinc-500 font-mono text-[11px]">{count} spins</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Play more songs to build your artist affinity map.</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
              Genre Breakdown
            </h4>
            {sortedGenres.length > 0 ? (
              <div className="space-y-2">
                {sortedGenres.map(([genre, count]) => (
                  <div key={genre} className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{genre}</span>
                    <span className="text-teal-400 font-mono text-[11px]">{count} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Exploring diverse musical genres.</p>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-500">
          <span>🔒 100% Client-Side Privacy • Zero 3rd Party Ad Trackers</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
