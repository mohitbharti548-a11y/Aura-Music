'use client';
// components/SleepTimerModal.tsx
// Sleep timer with minute presets, end-of-track option, and live countdown.
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setSleepTimer,
  cancelSleepTimer,
  setSleepTimerOpen,
} from '../features/player/playerSlice';

const PRESETS = [5, 10, 15, 30, 45, 60];

export default function SleepTimerModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.player.isSleepTimerOpen);
  const sleepTimer = useAppSelector((s) => s.player.sleepTimer);
  const duration = useAppSelector((s) => s.player.duration);
  const currentTime = useAppSelector((s) => s.player.currentTime);

  const [remainingText, setRemainingText] = useState<string | null>(null);

  useEffect(() => {
    if (!sleepTimer.active || !sleepTimer.targetTimestamp) {
      setRemainingText(null);
      return;
    }

    function update() {
      const msLeft = (sleepTimer.targetTimestamp ?? 0) - Date.now();
      if (msLeft <= 0) {
        setRemainingText('Expired');
        dispatch(cancelSleepTimer());
      } else {
        const totalSecs = Math.floor(msLeft / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        setRemainingText(`${m}m ${s.toString().padStart(2, '0')}s`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer, dispatch]);

  if (!isOpen) return null;

  function handleSetEndOfSong() {
    const secsLeft = Math.max(10, duration - currentTime);
    const mins = Math.ceil(secsLeft / 60);
    dispatch(setSleepTimer(mins));
    dispatch(setSleepTimerOpen(false));
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={() => dispatch(setSleepTimerOpen(false))}
    >
      <div
        className="w-full max-w-sm bg-[#0f0f14]/95 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-base text-violet-400">🌙</span>
            <h3 className="text-base font-bold text-white tracking-tight">Sleep Timer</h3>
          </div>
          <button
            onClick={() => dispatch(setSleepTimerOpen(false))}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Active Status */}
        {sleepTimer.active && remainingText && (
          <div className="my-4 p-4 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">
                Timer Running
              </p>
              <p className="text-lg font-bold text-white font-mono">{remainingText}</p>
            </div>
            <button
              onClick={() => dispatch(cancelSleepTimer())}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
            >
              Turn Off
            </button>
          </div>
        )}

        {/* Presets Grid */}
        <div className="py-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
            Stop Audio In
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {PRESETS.map((mins) => (
              <button
                key={mins}
                onClick={() => {
                  dispatch(setSleepTimer(mins));
                  dispatch(setSleepTimerOpen(false));
                }}
                className={`py-3 rounded-2xl text-xs font-semibold transition-all depth-button border ${
                  sleepTimer.durationMinutes === mins && sleepTimer.active
                    ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-600/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>

          <button
            onClick={handleSetEndOfSong}
            className="w-full py-3 rounded-2xl text-xs font-semibold transition-all depth-button bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center gap-2 mt-2"
          >
            <span>⏭</span>
            <span>End of current track</span>
          </button>
        </div>
      </div>
    </div>
  );
}
