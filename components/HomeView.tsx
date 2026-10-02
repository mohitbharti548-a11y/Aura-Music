'use client';
// components/HomeView.tsx
// Spotify-Grade Personalized Home View with Device Taste Profiling & Adaptive Habit Shelves.
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
  getDeviceProfile,
  getTasteProfile,
  getTopUserAttributes,
  getPersonalizedFeeds,
  DeviceProfile,
} from '../lib/personalization';
import AddToPlaylistModal from './AddToPlaylistModal';
import type { Song } from '../types/music';

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(null);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  useEffect(() => {
    setDeviceProfile(getDeviceProfile());
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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

  // Filter hidden tracks
  const availableSongs = useMemo(
    () => allSongs.filter((s) => !hiddenTrackIds.includes(s.id)),
    [allSongs, hiddenTrackIds]
  );
  const availableRecent = useMemo(
    () => recentlyPlayed.filter((s) => !hiddenTrackIds.includes(s.id)),
    [recentlyPlayed, hiddenTrackIds]
  );

  // Personalized feeds based on user's device and taste habits
  const userAttributes = useMemo(() => getTopUserAttributes(), [recentlyPlayed]);
  const personalized = useMemo(
    () => getPersonalizedFeeds(availableSongs),
    [availableSongs, recentlyPlayed]
  );

  // Quick 6 top cards
  const quickList =
    availableRecent.length >= 6
      ? availableRecent.slice(0, 6)
      : personalized.dailyMix.slice(0, 6);

  // Dynamic Daily Mix
  const dailyMixList = personalized.dailyMix;
  // Habit-based time-of-day shelf
  const habitList = personalized.habitMix;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-36 sm:pb-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-[#070709] to-[#070709] select-none">
      
      {/* 1. GREETING HEADER WITH DEVICE PROFILE & TASTE BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {greeting}
            </h1>
            {userAttributes.topGenre && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                {userAttributes.topGenre}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            {userAttributes.topArtist
              ? `Tuned for you • Frequently listening to ${userAttributes.topArtist}`
              : 'Lossless studio masters & personalized radio'}
          </p>
        </div>

        {deviceProfile && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-zinc-300">
              {deviceProfile.deviceName}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              • {userAttributes.dominantPeriod}
            </span>
          </div>
        )}
      </div>

      {/* 2. SPOTIFY TOP QUICK-PLAY 6-GRID */}
      {quickList.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 mb-8">
          {quickList.map((song) => {
            const isCurrent = currentTrack?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className={`group relative flex items-center bg-white/[0.06] hover:bg-white/[0.12] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-sm ${
                  isCurrent ? 'bg-white/[0.12] ring-1 ring-violet-500/50' : ''
                }`}
              >
                {/* 52x52 Mini Cover Thumbnail */}
                <div className="w-13 h-13 sm:w-14 sm:h-14 shrink-0 bg-zinc-900 overflow-hidden relative">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-violet-700 to-indigo-950 flex items-center justify-center text-xs">
                      ✦
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="px-3 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {song.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {song.artist}
                  </p>
                </div>

                {/* Floating Play Icon on Hover/Active */}
                <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                  <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    {isCurrent && isPlaying ? '⏸' : '▶'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. PERSONALIZED DAILY MIX SHELF */}
      {dailyMixList.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Your Daily Mix
              </h2>
              <p className="text-[11px] text-zinc-400">
                Crafted for your taste & device listening habits
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar">
            {dailyMixList.map((song) => {
              const isCurrent = currentTrack?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song)}
                  className="group shrink-0 w-36 sm:w-44 bg-[#111119]/80 hover:bg-[#181824] p-3 rounded-xl border border-white/[0.06] hover:border-white/[0.14] transition-all duration-300 cursor-pointer shadow-md"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-3 shadow-sm">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-violet-700 to-indigo-950 flex items-center justify-center text-xl">
                        ✦
                      </div>
                    )}

                    {/* Floating Hover Play Button */}
                    <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      {isCurrent && isPlaying ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {song.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                    {song.artist}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. ADAPTIVE TIME-OF-DAY HABIT SHELF */}
      {habitList.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{personalized.habitTitle}</span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                {personalized.habitSubtitle}
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar">
            {habitList.map((song) => {
              const isCurrent = currentTrack?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song)}
                  className="group shrink-0 w-36 sm:w-44 bg-[#111119]/80 hover:bg-[#181824] p-3 rounded-xl border border-white/[0.06] hover:border-white/[0.14] transition-all duration-300 cursor-pointer shadow-md"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-3 shadow-sm">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-fuchsia-700 to-indigo-950 flex items-center justify-center text-xl">
                        ✦
                      </div>
                    )}

                    <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      {isCurrent && isPlaying ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {song.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                    {song.artist}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. ALL TRACKS VERTICAL TRACKLIST */}
      <section className="mt-6">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-4">
          All Songs ({availableSongs.length})
        </h2>

        <div className="space-y-1">
          {availableSongs.map((song, index) => {
            const isCurrent = currentTrack?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer ${
                  isCurrent ? 'bg-white/[0.08]' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="w-5 text-center text-xs text-zinc-500 font-medium group-hover:hidden">
                    {isCurrent && isPlaying ? (
                      <span className="text-violet-400 animate-pulse">▶</span>
                    ) : (
                      index + 1
                    )}
                  </span>

                  <span className="w-5 text-center text-xs text-white hidden group-hover:inline-block">
                    ▶
                  </span>

                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-violet-700 to-indigo-950 flex items-center justify-center text-xs">
                        ✦
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-violet-400' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => handleLike(e, song)}
                    className="p-1 text-zinc-500 hover:text-white transition-transform active:scale-125"
                  >
                    <svg
                      className={`w-4 h-4 ${song.is_liked ? 'text-rose-500 fill-rose-500' : 'text-zinc-500'}`}
                      fill={song.is_liked ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  <span className="text-xs text-zinc-500 font-medium">
                    {formatDuration(song.duration_seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AddToPlaylistModal
        song={playlistModalSong}
        isOpen={playlistModalSong !== null}
        onClose={() => setPlaylistModalSong(null)}
      />
    </div>
  );
}
