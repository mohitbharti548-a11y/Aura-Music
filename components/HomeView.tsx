'use client';
// components/HomeView.tsx
// Echo-Grade Clean Header (Matching Image 3) with Mood/Genre Filter Chips, Speed Dial 3x3 Grid & Curated Shelves
import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTrack, setQueueOpen } from '../features/player/playerSlice';
import { selectPlaylist } from '../store/playlistsSlice';
import { getPersonalizedFeeds } from '../lib/personalization';
import SettingsModal from './SettingsModal';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

const GENRE_CHIPS = [
  'All',
  'Punjabi',
  'Hindi',
  'Romance',
  'Workout',
  'Relax',
  'Feel good',
  'Energy',
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
  const [speedDialPage, setSpeedDialPage] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  function handlePlay(song: Song) {
    dispatch(setTrack(song));
  }

  // Filter hidden tracks
  const availableSongs = useMemo(
    () => allSongs.filter((s) => !hiddenTrackIds.includes(s.id)),
    [allSongs, hiddenTrackIds]
  );
  const availableRecent = useMemo(
    () => recentlyPlayed.filter((s) => !hiddenTrackIds.includes(s.id)),
    [recentlyPlayed, hiddenTrackIds]
  );

  const personalized = useMemo(
    () => getPersonalizedFeeds(availableSongs),
    [availableSongs, recentlyPlayed]
  );

  // Filter songs based on active category chip (Punjabi, Hindi, Romance, etc.)
  const filteredSpeedDial = useMemo(() => {
    if (activeChip === 'All') {
      return personalized.dailyMix.length > 0 ? personalized.dailyMix : availableSongs;
    }
    const query = activeChip.toLowerCase();
    const matches = availableSongs.filter((s) => {
      const genre = (s.genre || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      const artist = (s.artist || '').toLowerCase();
      return (
        genre.includes(query) ||
        title.includes(query) ||
        artist.includes(query) ||
        (query === 'punjabi' && (artist.includes('diljit') || artist.includes('karan aujla') || artist.includes('sidhu') || artist.includes('ap dhillon') || artist.includes('honey singh') || artist.includes('shubh'))) ||
        (query === 'hindi' && (artist.includes('arijit') || artist.includes('mithoon') || artist.includes('pritam') || artist.includes('atif') || artist.includes('badshah') || artist.includes('jubin') || artist.includes('jasleen')))
      );
    });
    return matches.length > 0 ? matches : availableSongs;
  }, [activeChip, personalized.dailyMix, availableSongs]);

  // Speed Dial: 3 columns x 3 rows = 9 items per page
  const PAGE_SIZE = 9;
  const totalPages = Math.ceil(Math.min(filteredSpeedDial.length, 18) / PAGE_SIZE);
  const speedDialCurrentPage = filteredSpeedDial.slice(
    speedDialPage * PAGE_SIZE,
    (speedDialPage + 1) * PAGE_SIZE
  );

  // Keep Listening Shelf
  const keepListeningList = availableRecent.length > 0 ? availableRecent : availableSongs.slice(0, 8);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-5 sm:pt-6 pb-36 sm:pb-32 bg-[#08080c] select-none">
      
      {/* 1. CLEAN TOP HEADER (Matching Reference Image 3) */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
          Aura Music
        </h1>

        {/* Top-Right Action Icons (History, Trending, Party/Group, Settings) */}
        <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
          {/* History Icon */}
          <button
            onClick={() => dispatch(setQueueOpen(true))}
            className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Listening History & Queue"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Trending / Charts Icon */}
          <button
            onClick={() => dispatch(selectPlaylist('discover'))}
            className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Top Charts & Trending"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </button>

          {/* Shared / Library Icon */}
          <button
            onClick={() => dispatch(selectPlaylist('liked'))}
            className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Favorite Music"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {/* Settings Gear Icon (Opens Settings Modal) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Settings & Updates"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. HORIZONTAL MOOD & GENRE PILL CHIPS ROW (Matching Reference Image 3) */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 pt-1 custom-scrollbar mb-5">
        {GENRE_CHIPS.map((chip) => {
          const isActive = activeChip === chip;

          return (
            <button
              key={chip}
              onClick={() => {
                setActiveChip(chip);
                setSpeedDialPage(0);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-white text-black shadow-md scale-105'
                  : 'bg-[#181822] text-zinc-300 hover:text-white hover:bg-[#222230] border border-white/[0.06]'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* 3. SPEED DIAL (3x3 Grid with Punjabi, Hindi, and Global Hits) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Speed Dial • {activeChip}
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSpeedDialPage(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    speedDialPage === idx ? 'w-5 bg-white' : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Page ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-2xl">
          {speedDialCurrentPage.map((song) => {
            const isCurrent = currentTrack?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08] hover:border-white/20 transition-all duration-200 cursor-pointer shadow-md"
              >
                {song.cover_url ? (
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-violet-900 to-indigo-950 flex items-center justify-center text-xl text-white">
                    ✦
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-transform duration-200 ${
                    isCurrent && isPlaying ? 'scale-105 ring-2 ring-violet-400' : 'group-hover:scale-110'
                  }`}>
                    {isCurrent && isPlaying ? (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2 pointer-events-none">
                  <p className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-tight truncate drop-shadow-md">
                    {song.title}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-zinc-300 truncate drop-shadow-sm">
                    {song.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-3">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <div
                key={idx}
                onClick={() => setSpeedDialPage(idx)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                  speedDialPage === idx ? 'w-4 bg-white' : 'bg-white/25'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. KEEP LISTENING SHELF */}
      {keepListeningList.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Keep Listening
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 custom-scrollbar">
            {keepListeningList.map((song) => {
              const isCurrent = currentTrack?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song)}
                  className="group shrink-0 w-32 sm:w-40 bg-[#101018]/80 hover:bg-[#161622] p-2.5 rounded-xl border border-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-2 shadow-sm">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-violet-800 to-indigo-950 flex items-center justify-center text-lg text-white">
                        ✦
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-md transition-transform ${
                        isCurrent && isPlaying ? 'scale-105 ring-1 ring-violet-400' : 'group-hover:scale-110'
                      }`}>
                        {isCurrent && isPlaying ? (
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-white truncate">
                    {song.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {song.artist}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. MADE FOR YOU SHELF */}
      {personalized.habitMix.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Made For You • Studio Selection
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 custom-scrollbar">
            {personalized.habitMix.map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group shrink-0 w-32 sm:w-40 bg-[#101018]/80 hover:bg-[#161622] p-2.5 rounded-xl border border-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer shadow-sm"
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-2 shadow-sm">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-violet-800 to-indigo-950 flex items-center justify-center text-lg text-white">
                      ✦
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-bold text-white truncate">
                  {song.title}
                </p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {song.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AddToPlaylistModal
        song={playlistModalSong}
        isOpen={!!playlistModalSong}
        onClose={() => setPlaylistModalSong(null)}
      />
    </div>
  );
}
