'use client';
// components/SettingsModal.tsx
// Comprehensive Settings Panel: 1-Tap Direct In-App Update, Audio Engine, Storage & Offline Management
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setEqualizerOpen } from '../features/player/playerSlice';
import { getAllDownloadedTrackIds, clearAllDownloadedTracks } from '../lib/offline-storage';
import { getDeviceProfile, getTopUserAttributes } from '../lib/personalization';

export default function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [offlineCount, setOfflineCount] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const deviceProfile = typeof window !== 'undefined' ? getDeviceProfile() : null;
  const userAttributes = typeof window !== 'undefined' ? getTopUserAttributes() : null;

  useEffect(() => {
    if (isOpen) {
      getAllDownloadedTrackIds().then((ids) => setOfflineCount(ids.length));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleCheckUpdate() {
    setUpdateStatus('Checking for latest version...');
    window.dispatchEvent(new CustomEvent('aura-check-update'));
    setTimeout(() => {
      setUpdateStatus(null);
    }, 4000);
  }

  async function handleClearStorage() {
    setClearing(true);
    await clearAllDownloadedTracks();
    setOfflineCount(0);
    setClearing(false);
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#12121c]/98 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">⚙</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
              <p className="text-[11px] text-zinc-400">Manage audio, updates & storage</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          
          {/* 1. APP UPDATES & VERSION SECTION (1-TAP UPDATE) */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-white">Application Updates</p>
                <p className="text-[10px] text-zinc-400">Keep Aura up-to-date with latest studio patches</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                v1.3.0
              </span>
            </div>

            <button
              onClick={handleCheckUpdate}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-md shadow-violet-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-sm">✦</span>
              <span>{updateStatus || 'Check for Updates & Refresh'}</span>
            </button>
          </div>

          {/* 2. AUDIO & EQUALIZER SETTINGS */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-white">Audio & Sound Master</p>
            
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs text-zinc-300 font-medium">10-Band Studio Equalizer</p>
                <p className="text-[10px] text-zinc-500">Custom frequencies & bass boost</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  dispatch(setEqualizerOpen(true));
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-all"
              >
                Open EQ
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <div>
                <p className="text-xs text-zinc-300 font-medium">Lossless Master Audio</p>
                <p className="text-[10px] text-emerald-400 font-medium">Active (Bit-perfect playback)</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </div>
          </div>

          {/* 3. OFFLINE STORAGE MANAGEMENT */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-white">Storage & Offline Music</p>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-300 font-medium">Downloaded Songs</p>
                <p className="text-[10px] text-zinc-500">{offlineCount} tracks saved locally</p>
              </div>
              {offlineCount > 0 && (
                <button
                  onClick={handleClearStorage}
                  disabled={clearing}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300 font-medium transition-all"
                >
                  {clearing ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {/* 4. ABOUT AURA BRANDING */}
          <div className="pt-2 text-center text-[10px] text-zinc-500 space-y-1">
            <p className="text-zinc-400 font-semibold">Aura Music • Lossless Sound Labs</p>
            <p>Version 1.3.0 • Built with Next.js & Web Audio DSP</p>
          </div>

        </div>
      </div>
    </div>
  );
}
