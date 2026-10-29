'use client';
// components/HomeView.tsx
// Reverse-Engineered Spotify Premium Page Layout & BaRT Recommendation Algorithm
// Features: Dynamic Time Greeting, 6-Pack Quick Access Grid, Daily Mixes 1-4, Curated Shelves & Silky Spring Animations
import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTrack, setRecommendations, clearQueue } from '../features/player/playerSlice';
import { selectPlaylist } from '../store/playlistsSlice';
import { getPersonalizedFeeds } from '../lib/personalization';
import SettingsModal from './SettingsModal';
import AddToPlaylistModal from './AddToPlaylistModal';
import TasteDnaModal from './TasteDnaModal';
import type { Song } from '../types/music';

const GENRE_CHIPS = [
  'All',
  'Music',
  'Made For You',
  'Punjabi',
  'Hindi',
  'Chill',
  'Workout',
  'Party',
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
  const hiddenTrackIds = useAppSelector((s) => s.player.hiddenTrackIds);

  const [activeChip, setActiveChip] = useState('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTasteDnaOpen, setIsTasteDnaOpen] = useState(false);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  // Time-of-day dynamic greeting (Spotify Premium style)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Filter hidden tracks
  const availableSongs = useMemo(
    () => allSongs.filter((s) => !hiddenTrackIds.includes(s.id)),
    [allSongs, hiddenTrackIds]
  );
  const availableRecent = useMemo(
    () => recentlyPlayed.filter((s) => !hiddenTrackIds.includes(s.id)),
    [recentlyPlayed, hiddenTrackIds]
  );

  // BaRT Personalization Engine Feeds
  const personalized = useMemo(
    () => getPersonalizedFeeds(availableSongs),
    [availableSongs, recentlyPlayed]
  );

  // 1. Spotify 6-Pack Quick Access Grid (Top 6 familiar & recent tracks)
  const quickAccess6Pack = useMemo(() => {
    const pool = availableRecent.length >= 6 
      ? availableRecent.slice(0, 6) 
      : [...availableRecent, ...availableSongs].slice(0, 6);
    return pool;
  }, [availableRecent, availableSongs]);

  // 2. Extracted Popular Artists for the Circular Artists Shelf
  const popularArtists = useMemo(() => {
    const artistMap = new Map<string, { name: string; cover: string; count: number; sampleSong: Song }>();
    availableSongs.forEach((song) => {
      const primary = (song.artist.split(/,|&|feat\./i)[0] || song.artist).trim();
      if (!artistMap.has(primary)) {
        artistMap.set(primary, {
          name: primary,
          cover: song.cover_url || '',
          count: 1,
          sampleSong: song,
        });
      } else {
        const item = artistMap.get(primary)!;
        item.count++;
      }
    });
    return Array.from(artistMap.values())
      .filter((a) => a.name.length > 2)
      .slice(0, 8);
  }, [availableSongs]);

  // 3. Recommended Radio (BaRT Exploration vs Exploitation)
  const recommendedRadio = useMemo(() => {
    if (availableRecent.length > 0) {
      const seed = availableRecent[0];
      const seedArtist = seed.artist.toLowerCase();
      const seedGenre = (seed.genre || '').toLowerCase();
      return availableSongs
        .filter((s) => s.id !== seed.id)
        .sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (a.artist.toLowerCase().includes(seedArtist)) scoreA += 3;
          if (b.artist.toLowerCase().includes(seedArtist)) scoreB += 3;
          if (a.genre && a.genre.toLowerCase() === seedGenre) scoreA += 2;
          if (b.genre && b.genre.toLowerCase() === seedGenre) scoreB += 2;
          return scoreB - scoreA;
        })
        .slice(0, 10);
    }
    return availableSongs.slice(6, 16);
  }, [availableRecent, availableSongs]);

  // 4. Filtered content based on Active Chip
  const activeChipSongs = useMemo(() => {
    if (activeChip === 'All') return null;
    if (activeChip === 'Made For You') return personalized.dailyMix;
    const query = activeChip.toLowerCase();
    return availableSongs.filter((s) => {
      const genre = (s.genre || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      const artist = (s.artist || '').toLowerCase();
      return (
        genre.includes(query) ||
        title.includes(query) ||
        artist.includes(query) ||
        (query === 'punjabi' && (artist.includes('diljit') || artist.includes('karan') || artist.includes('sidhu') || artist.includes('ap dhillon') || artist.includes('shubh') || artist.includes('honey'))) ||
        (query === 'hindi' && (artist.includes('arijit') || artist.includes('pritam') || artist.includes('atif') || artist.includes('jubin') || artist.includes('badshah'))) ||
        (query === 'chill' && (genre.includes('acoustic') || genre.includes('ambient') || genre.includes('soul'))) ||
        (query === 'workout' && (genre.includes('energy') || genre.includes('pop') || genre.includes('dance')))
      );
    });
  }, [activeChip, availableSongs, personalized.dailyMix]);

  function handlePlay(song: Song) {
    dispatch(setTrack(song));
  }

  function handlePlayQueue(tracks: Song[], startIndex = 0) {
    if (tracks.length === 0) return;
    dispatch(clearQueue());
    dispatch(setRecommendations(tracks));
    dispatch(setTrack(tracks[startIndex] || tracks[0]));
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-5 sm:pt-7 pb-44 sm:pb-36 bg-[#07070a] select-none">
      
      {/* 1. SPOTIFY AMBIENT HEADER & DYNAMIC GREETING */}
      <div className="relative mb-5">
        {/* Soft Ambient Radial Glow Backdrop */}
        <div className="absolute -top-10 left-0 w-96 h-48 bg-teal-500/10 blur-[80px] pointer-events-none rounded-full" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#36848d] via-[#48989f] to-[#d1b27d] p-[1.5px] shadow-lg shadow-teal-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#08080c] rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/logo-mark.png" alt="Sāṅgīt Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 font-mono">
                Sāṅgīt Premium
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                {greeting}
              </h1>
            </div>
          </div>

          {/* Clean Top-Right Actions (No Redundant clutter) */}
          <div className="flex items-center gap-2.5">
            {/* Taste DNA Button */}
            <button
              onClick={() => setIsTasteDnaOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white transition-all active:scale-95 text-xs font-semibold shadow-sm cursor-pointer"
              title="Acoustic Taste DNA & Serendipity Steerer"
            >
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="hidden sm:inline">Taste DNA</span>
            </button>

            {/* Settings Gear */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 hover:text-white transition-all active:scale-95 border border-white/[0.06] cursor-pointer"
              title="Settings & Updates"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SPOTIFY FILTER PILLS ROW */}
      <div className="flex gap-2 overflow-x-auto pb-4 pt-1 custom-scrollbar mb-5">
        {GENRE_CHIPS.map((chip) => {
          const isActive = activeChip === chip;
          return (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-white text-black shadow-md scale-105'
                  : 'bg-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.15] border border-white/[0.05]'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* ACTIVE CHIP FILTERED SECTION (If user clicked a filter chip) */}
      {activeChipSongs && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {activeChip} • Selection
            </h2>
            <button
              onClick={() => setActiveChip('All')}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
            >
              Clear filter
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {activeChipSongs.slice(0, 12).map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group relative bg-[#121218]/80 hover:bg-[#181822] p-3 rounded-xl border border-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer shadow-sm flex flex-col"
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-2.5 shadow-md">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-teal-800 to-indigo-950 flex items-center justify-center text-lg text-white">
                      ✦
                    </div>
                  )}
                  <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
                <p className="text-xs font-bold text-white truncate">{song.title}</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. SPOTIFY SIGNATURE 6-PACK QUICK ACCESS GRID */}
      {activeChip === 'All' && (
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {quickAccess6Pack.map((song) => {
              const isCurrent = currentTrack?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song)}
                  className={`group relative h-14 sm:h-16 flex items-center bg-white/[0.07] hover:bg-white/[0.14] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 shadow-sm border ${
                    isCurrent && isPlaying
                      ? 'border-teal-500/40 bg-white/[0.12]'
                      : 'border-white/[0.05] hover:border-white/10'
                  }`}
                >
                  {/* Square Artwork Left */}
                  <div className="w-14 sm:w-16 h-14 sm:h-16 shrink-0 bg-zinc-900 overflow-hidden relative shadow-md">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-teal-700 to-amber-700 flex items-center justify-center text-xs text-white">
                        ✦
                      </div>
                    )}
                  </div>

                  {/* Title and Artist Right */}
                  <div className="flex-1 min-w-0 px-3 py-1 flex flex-col justify-center">
                    <p className="text-xs sm:text-[13px] font-bold text-white truncate group-hover:text-teal-200 transition-colors">
                      {song.title}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                      {song.artist}
                    </p>
                  </div>

                  {/* Floating Spotify Play Button */}
                  <div className="mr-2 sm:mr-3 shrink-0">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-lg shadow-teal-500/30 transition-all duration-300 ${
                        isCurrent && isPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. MADE FOR YOU (DAILY MIXES 1 - 4 SPOTIFY PREMIUM) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Made For You
            </h2>
            <p className="text-xs text-zinc-400 -mt-0.5">
              Personalized with Zero-Payola & Camelot harmonic sequencing
            </p>
          </div>
          <button
            onClick={() => setIsTasteDnaOpen(true)}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Radar</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {personalized.dailyMixes.map((mix, index) => {
            return (
              <div
                key={mix.id}
                onClick={() => {
                  handlePlayQueue(mix.tracks, 0);
                }}
                className="group relative p-3 sm:p-4 rounded-2xl bg-[#121218]/90 hover:bg-[#181824] border border-white/[0.08] hover:border-teal-500/30 transition-all duration-300 cursor-pointer shadow-md flex flex-col justify-between hover:-translate-y-1"
              >
                {/* Spotify-style Gradient Header Bar */}
                <div className={`h-2 rounded-full bg-gradient-to-r ${mix.color} mb-3 opacity-80 group-hover:opacity-100 transition-opacity`} />
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-mono">
                      Daily Mix {index + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-teal-400 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-md">
                      <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-teal-200 transition-colors">
                    {mix.title.split('•')[1]?.trim() || mix.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                    {mix.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06] text-[10px] text-zinc-500">
                  <span className="text-zinc-400 font-medium">{mix.tracks.length} tracks</span>
                  <span>•</span>
                  <span className="text-teal-400/90 font-medium">Harmonic Flow</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. RECENTLY PLAYED SHELF (HORIZONTAL SCROLL WITH SPOTIFY HOVER CARDS) */}
      {availableRecent.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Recently Played
            </h2>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-4 pt-1 custom-scrollbar">
            {availableRecent.slice(0, 10).map((song) => {
              const isCurrent = currentTrack?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song)}
                  className="group shrink-0 w-36 sm:w-44 bg-[#111118]/80 hover:bg-[#171722] p-3 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer shadow-sm hover:-translate-y-1.5"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 mb-2.5 shadow-md">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-teal-800 to-indigo-950 flex items-center justify-center text-lg text-white">
                        ✦
                      </div>
                    )}

                    {/* Floating Hover Play Button */}
                    <div
                      className={`absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-xl shadow-teal-500/30 transition-all duration-300 ${
                        isCurrent && isPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 scale-100'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-[13px] font-bold text-white truncate group-hover:text-teal-200 transition-colors">
                    {song.title}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">
                    {song.artist}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. RECOMMENDED RADIOS / BASED ON RECENT LISTENING */}
      {recommendedRadio.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Recommended For You
              </h2>
              <p className="text-xs text-zinc-400 -mt-0.5">
                Multi-vector recommendations matching your sonic DNA
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-4 pt-1 custom-scrollbar">
            {recommendedRadio.map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group shrink-0 w-36 sm:w-44 bg-[#111118]/80 hover:bg-[#171722] p-3 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer shadow-sm hover:-translate-y-1.5"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 mb-2.5 shadow-md">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-teal-800 to-indigo-950 flex items-center justify-center text-lg text-white">
                      ✦
                    </div>
                  )}

                  <div className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] font-bold text-white truncate group-hover:text-teal-200 transition-colors">
                  {song.title}
                </p>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">
                  {song.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. POPULAR ARTISTS SHELF (CIRCULAR PORTRAITS) */}
      {popularArtists.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Popular Artists
            </h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
            {popularArtists.map((artist) => (
              <div
                key={artist.name}
                onClick={() => handlePlay(artist.sampleSong)}
                className="group shrink-0 w-32 sm:w-36 flex flex-col items-center text-center cursor-pointer p-2 rounded-2xl hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-zinc-900 mb-2.5 shadow-xl border border-white/10 group-hover:border-teal-400/50 transition-colors">
                  {artist.cover ? (
                    <img
                      src={artist.cover}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-teal-700 to-indigo-900 flex items-center justify-center text-xl text-white">
                      ✦
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] font-bold text-white truncate max-w-full group-hover:text-teal-200 transition-colors">
                  {artist.name}
                </p>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mt-0.5">
                  Artist
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. TODAY'S TOP HITS / ALL SONGS */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Today's Top Hits
            </h2>
            <p className="text-xs text-zinc-400 -mt-0.5">
              The hottest lossless studio tracks right now
            </p>
          </div>
          <button
            onClick={() => dispatch(selectPlaylist('discover'))}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {availableSongs.slice(0, 12).map((song, idx) => (
            <div
              key={song.id}
              onClick={() => handlePlay(song)}
              className="group relative bg-[#111118]/80 hover:bg-[#171722] p-3 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer shadow-sm flex flex-col hover:-translate-y-1.5"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 mb-2.5 shadow-md">
                {song.cover_url ? (
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-teal-800 to-indigo-950 flex items-center justify-center text-lg text-white">
                    ✦
                  </div>
                )}

                {/* Rank Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-teal-300 border border-white/10">
                  #{idx + 1}
                </div>

                <div className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>

              <p className="text-xs font-bold text-white truncate group-hover:text-teal-200 transition-colors">
                {song.title}
              </p>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                {song.artist}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        song={playlistModalSong}
        isOpen={!!playlistModalSong}
        onClose={() => setPlaylistModalSong(null)}
      />

      {/* Taste DNA Modal */}
      <TasteDnaModal
        isOpen={isTasteDnaOpen}
        onClose={() => setIsTasteDnaOpen(false)}
      />
    </div>
  );
}
