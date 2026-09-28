'use client';
// components/QueueDrawer.tsx
// Spotify-Grade Interactive Play Queue & Dynamic 30-Song Radio Drawer.
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTrack,
  addToQueue,
  removeFromQueue,
  clearQueue,
  setQueueOpen,
  toggleAutoplay,
} from '../features/player/playerSlice';
import type { Song } from '../types/music';

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function QueueDrawer({ queue }: { queue: Song[] }) {
  const dispatch = useAppDispatch();
  const {
    isQueueOpen: isOpen,
    currentTrack,
    userQueue,
    isPlaying,
    recommendations,
    recommendationsLoading,
    isAutoplayEnabled,
  } = useAppSelector((s) => s.player);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-md flex justify-end animate-in fade-in duration-200 select-none"
      onClick={() => dispatch(setQueueOpen(false))}
    >
      <div
        className="w-full max-w-md h-full bg-[#0c0c11]/98 border-l border-white/10 p-5 sm:p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Autoplay Radio Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-violet-400 font-bold">≣</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Play Queue & Radio
              </h3>
              <p className="text-[10px] text-zinc-400">
                {userQueue.length} queued • {recommendations.length} recommended
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Autoplay Toggle Switch */}
            <button
              onClick={() => dispatch(toggleAutoplay())}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1.5 ${
                isAutoplayEnabled
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
              title={
                isAutoplayEnabled
                  ? 'Infinite Autoplay is ON (Plays similar songs automatically)'
                  : 'Autoplay is OFF'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAutoplayEnabled ? 'bg-violet-400 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              Autoplay {isAutoplayEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => dispatch(setQueueOpen(false))}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar">
          
          {/* 1. NOW PLAYING */}
          {currentTrack && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400 mb-2 px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Now Playing
              </p>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-violet-600/15 border border-violet-500/30 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 shrink-0 shadow-md relative">
                    {currentTrack.cover_url ? (
                      <img
                        src={currentTrack.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-violet-600/40 flex items-center justify-center text-xs">
                        ✦
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                        <span className="w-1 h-3.5 bg-white rounded-full animate-eq-1" />
                        <span className="w-1 h-5 bg-white rounded-full animate-eq-2" />
                        <span className="w-1 h-3 bg-white rounded-full animate-eq-3" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 font-mono tabular-nums">
                  {formatDuration(currentTrack.duration_seconds)}
                </span>
              </div>
            </div>
          )}

          {/* 2. USER ENQUEUED TRACKS */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Next in Queue ({userQueue.length})
              </p>
              {userQueue.length > 0 && (
                <button
                  onClick={() => dispatch(clearQueue())}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {userQueue.length === 0 ? (
              <p className="text-xs text-zinc-600 px-3 py-3 bg-white/[0.02] rounded-xl text-center border border-white/[0.04]">
                Your manual queue is empty.
              </p>
            ) : (
              <div className="space-y-1">
                {userQueue.map((song, i) => (
                  <div
                    key={`${song.id}-${i}`}
                    onClick={() => dispatch(setTrack(song))}
                    className="group flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-violet-600/30 flex items-center justify-center text-xs">
                            ✦
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{song.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatDuration(song.duration_seconds)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(removeFromQueue(song.id));
                        }}
                        className="w-6 h-6 rounded-md hover:bg-white/10 text-zinc-500 hover:text-rose-400 text-xs flex items-center justify-center transition-colors"
                        title="Remove from queue"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. DYNAMIC SIMILAR RECOMMENDATIONS (UP TO 30 TRACKS) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-indigo-400">✦</span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  Recommended Radio ({recommendations.length})
                </p>
              </div>
              <span className="text-[10px] text-zinc-500">
                {currentTrack ? `Based on ${currentTrack.title}` : 'Similar Vibe'}
              </span>
            </div>

            {recommendationsLoading && recommendations.length === 0 ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-lg bg-white/10" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 bg-white/10 rounded" />
                      <div className="h-2 w-1/2 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-xs text-zinc-600 px-3 py-3 bg-white/[0.02] rounded-xl text-center">
                Play any song to load 30 similar track recommendations!
              </p>
            ) : (
              <div className="space-y-1">
                {recommendations.map((song, i) => (
                  <div
                    key={`${song.id}-${i}`}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/10"
                  >
                    <div
                      onClick={() => dispatch(setTrack(song))}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 group-hover:scale-105 transition-transform">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-indigo-600/30 flex items-center justify-center text-xs">
                            ✦
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-[10px] font-bold">▶</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatDuration(song.duration_seconds)}
                      </span>
                      {/* 1-Tap Add to Queue Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(addToQueue(song));
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-violet-300 text-xs transition-colors"
                        title="Add to queue"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. NEXT UP FROM PLAYLIST / LIBRARY */}
          {queue.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
                From Current Playlist
              </p>
              <div className="space-y-1">
                {queue
                  .filter((s) => s.id !== currentTrack?.id)
                  .slice(0, 6)
                  .map((song) => (
                    <div
                      key={song.id}
                      onClick={() => dispatch(setTrack(song))}
                      className="group flex items-center justify-between p-2 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                          {song.cover_url ? (
                            <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs">
                              ✦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
                        </div>
                      </div>

                      <span className="text-[10px] text-zinc-600 font-mono">
                        {formatDuration(song.duration_seconds)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
