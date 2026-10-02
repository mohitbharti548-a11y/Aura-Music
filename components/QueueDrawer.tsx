'use client';
// components/QueueDrawer.tsx
// 75% Compact Responsive Queue Drawer & Dynamic 10-Song Radio Drawer
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTrack,
  addToQueue,
  removeFromQueue,
  clearQueue,
  setQueueOpen,
  toggleAutoplay,
  playTrackFromRecommendations,
  appendRecommendations,
  hideTrack,
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
    hiddenTrackIds,
  } = useAppSelector((s) => s.player);

  if (!isOpen) return null;

  async function handlePlayRecommendationAtIndex(index: number, song: Song) {
    dispatch(playTrackFromRecommendations(index));

    // Replenish sliding queue to keep 10 songs
    const replenishCount = index + 1;
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedSong: song,
          hiddenTrackIds,
          limit: replenishCount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recommendations)) {
          dispatch(appendRecommendations(data.recommendations));
        }
      }
    } catch (err) {
      console.error('Failed to replenish recommendations:', err);
    }
  }

  function handleHideSong(e: React.MouseEvent, songId: string) {
    e.stopPropagation();
    dispatch(hideTrack(songId));
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md flex items-end sm:items-center sm:justify-end sm:p-6 animate-in fade-in duration-200 select-none"
      onClick={() => dispatch(setQueueOpen(false))}
    >
      {/* 75% Window Container */}
      <div
        className="w-full sm:max-w-md h-[75vh] max-h-[75vh] bg-[#0d0d14]/98 border border-white/10 rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom sm:slide-in-from-right duration-250 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header with Autoplay Radio Toggle */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base text-violet-400 font-bold">≣</span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                Play Queue & Radio
              </h3>
              <p className="text-[10px] text-zinc-400">
                {userQueue.length} queued • {recommendations.length}/10 in radio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Autoplay Toggle Switch */}
            <button
              onClick={() => dispatch(toggleAutoplay())}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1.5 ${
                isAutoplayEnabled
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Continuous radio autoplay"
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

        {/* Scrollable Queue Content */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-5 pr-1 custom-scrollbar">
          
          {/* 1. NOW PLAYING */}
          {currentTrack && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2 px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Now Playing
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 shadow-inner">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 shrink-0 shadow-md relative">
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
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
                    {formatDuration(currentTrack.duration_seconds)}
                  </span>
                  <button
                    onClick={(e) => handleHideSong(e, currentTrack.id)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                    title="Hide this song"
                  >
                    ⊘
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. USER ENQUEUED TRACKS */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Next in Queue ({userQueue.length})
              </p>
              {userQueue.length > 0 && (
                <button
                  onClick={() => dispatch(clearQueue())}
                  className="text-[10px] text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {userQueue.length === 0 ? (
              <p className="text-[11px] text-zinc-600 px-3 py-2.5 bg-white/[0.02] rounded-xl text-center border border-white/[0.04]">
                Manual queue is empty.
              </p>
            ) : (
              <div className="space-y-1">
                {userQueue.map((song, i) => (
                  <div
                    key={`${song.id}-${i}`}
                    onClick={() => dispatch(setTrack(song))}
                    className="group flex items-center justify-between p-2 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatDuration(song.duration_seconds)}
                      </span>
                      <button
                        onClick={(e) => handleHideSong(e, song.id)}
                        className="w-5 h-5 rounded-md hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 text-xs flex items-center justify-center transition-colors"
                        title="Hide this song"
                      >
                        ⊘
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(removeFromQueue(song.id));
                        }}
                        className="w-5 h-5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-white text-xs flex items-center justify-center transition-colors"
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

          {/* 3. DYNAMIC SLIDING 10-SONG RECOMMENDATION QUEUE */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-indigo-400">✦</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Radio Recommendations ({recommendations.length}/10)
                </p>
              </div>
              <span className="text-[10px] text-zinc-500">
                {currentTrack ? `Based on ${currentTrack.artist}` : 'Dynamic Radio'}
              </span>
            </div>

            {recommendationsLoading && recommendations.length === 0 ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-white/10" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-3/4 bg-white/10 rounded" />
                      <div className="h-2 w-1/2 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-[11px] text-zinc-600 px-3 py-2.5 bg-white/[0.02] rounded-xl text-center">
                Play any track to generate 10 dynamic recommendations.
              </p>
            ) : (
              <div className="space-y-1">
                {recommendations.map((song, i) => (
                  <div
                    key={`${song.id}-${i}`}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/10"
                  >
                    <div
                      onClick={() => handlePlayRecommendationAtIndex(i, song)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="text-[10px] text-zinc-500 font-mono w-4 text-center group-hover:hidden">
                        {i + 1}
                      </span>
                      <span className="text-[10px] text-violet-400 font-bold w-4 text-center hidden group-hover:inline-block">
                        ▶
                      </span>

                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 shrink-0 group-hover:scale-105 transition-transform">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-indigo-600/30 flex items-center justify-center text-xs">
                            ✦
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatDuration(song.duration_seconds)}
                      </span>

                      <button
                        onClick={(e) => handleHideSong(e, song.id)}
                        className="p-1 rounded-md hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 text-xs transition-colors"
                        title="Hide this song"
                      >
                        ⊘
                      </button>

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

        </div>
      </div>
    </div>
  );
}
