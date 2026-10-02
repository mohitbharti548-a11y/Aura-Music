'use client';
// components/HomeView.tsx
// Echo & Spotify-Grade Personalized Home with Speed Dial 3x3 Grid & Curated Shelves
import { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTrack,
  addToQueue,
  addOfflineTrackId,
  removeOfflineTrackId,
} from '../features/player/playerSlice';
import { toggleLike, setLiked } from '../store/songsSlice';
import { downloadTrack, removeDownloadedTrack } from '../lib/offline-storage';
import {
  getTopUserAttributes,
  getPersonalizedFeeds,
} from '../lib/personalization';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

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
  const hiddenTrackIds = useAppSelector((s) => s.player.hiddenTrackIds);

  const [greeting, setGreeting] = useState('Good evening');
  const [speedDialPage, setSpeedDialPage] = useState(0);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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

  const userAttributes = useMemo(() => getTopUserAttributes(), [recentlyPlayed]);
  const personalized = useMemo(
    () => getPersonalizedFeeds(availableSongs),
    [availableSongs, recentlyPlayed]
  );

  // Speed Dial: 3 columns x 3 rows = 9 items per page (or 8 items)
  const speedDialTotal = personalized.dailyMix.length > 0 ? personalized.dailyMix : availableSongs;
  const PAGE_SIZE = 9;
  const totalPages = Math.ceil(Math.min(speedDialTotal.length, 18) / PAGE_SIZE);
  const speedDialCurrentPage = speedDialTotal.slice(
    speedDialPage * PAGE_SIZE,
    (speedDialPage + 1) * PAGE_SIZE
  );

  // Keep Listening Shelf (Recent plays or top picks)
  const keepListeningList = availableRecent.length > 0 ? availableRecent : availableSongs.slice(0, 8);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-5 sm:pt-7 pb-36 sm:pb-32 bg-[#08080c] select-none">
      
      {/* 1. SPEED DIAL (3x3 Grid Matching Reference Design) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Speed Dial
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
                {/* Artwork */}
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

                {/* Subtle dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Center Circular Play Button Overlay (Matching Image) */}
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

                {/* Bottom Overlay Title (Bold Capital or Compact) */}
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

        {/* Bottom Pagination Indicator for Speed Dial */}
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

      {/* 2. KEEP LISTENING SHELF (Matching Reference Design) */}
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

                    {/* Central Play Badge */}
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

      {/* 3. MADE FOR YOU / TIME OF DAY SHELF */}
      {personalized.habitMix.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Made For You • {userAttributes.dominantPeriod}
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 custom-scrollbar">
            {personalized.habitMix.map((song) => {
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
              );
            })}
          </div>
        </section>
      )}

      <AddToPlaylistModal
        song={playlistModalSong}
        isOpen={!!playlistModalSong}
        onClose={() => setPlaylistModalSong(null)}
      />
    </div>
  );
}
