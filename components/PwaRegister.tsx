'use client';
// components/PwaRegister.tsx
// High-Fidelity In-App Update Card Modal (Matching Reference Image 2) + Automated Update Sync
import { useEffect, useState, useRef, useCallback } from 'react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Core update check logic
  const checkLiveVersion = useCallback(async (isManual = false) => {
    if (isManual) {
      setCheckingStatus('Checking for latest updates...');
    }

    try {
      if (registrationRef.current) {
        await registrationRef.current.update().catch(() => {});
      }

      const res = await fetch(`/api/version?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const storedVersion = localStorage.getItem('aura_app_version');

        if (!storedVersion) {
          localStorage.setItem('aura_app_version', data.version);
          if (isManual) {
            setUpdateAvailable(true);
            setCheckingStatus(null);
          }
        } else if (storedVersion !== data.version) {
          setUpdateAvailable(true);
          if (isManual) setCheckingStatus(null);
        } else {
          if (isManual) {
            setCheckingStatus(`Aura is up to date (v${data.version})`);
            setTimeout(() => setCheckingStatus(null), 3000);
          }
        }
      } else if (isManual) {
        setCheckingStatus('Could not reach update server.');
        setTimeout(() => setCheckingStatus(null), 3000);
      }
    } catch {
      if (isManual) {
        setCheckingStatus('Offline or connection error.');
        setTimeout(() => setCheckingStatus(null), 3000);
      }
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function setupServiceWorker() {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registrationRef.current = reg;

          if (reg.waiting) {
            waitingWorkerRef.current = reg.waiting;
            setUpdateAvailable(true);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                waitingWorkerRef.current = newWorker;
                setUpdateAvailable(true);
              }
            });
          });

          // Periodic check every 3 minutes
          const intervalId = setInterval(() => {
            checkLiveVersion(false);
          }, 3 * 60 * 1000);

          return () => clearInterval(intervalId);
        })
        .catch((err) => {
          console.warn('[Aura PWA] SW registration failed:', err);
        });

      checkLiveVersion(false);

      function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
          checkLiveVersion(false);
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    if (document.readyState === 'complete') {
      setupServiceWorker();
    } else {
      window.addEventListener('load', setupServiceWorker);
    }

    function handleManualCheck() {
      checkLiveVersion(true);
    }

    window.addEventListener('aura-check-update', handleManualCheck);

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem('aura_pwa_dismissed');
      if (!hasDismissed) {
        setShowInstallBanner(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('aura-check-update', handleManualCheck);
    };
  }, [checkLiveVersion]);

  // Trigger Immediate In-App Update
  async function handleApplyUpdate() {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.version) {
          localStorage.setItem('aura_app_version', data.version);
        }
      }
    } catch {}

    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
    }

    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  }

  return (
    <>
      {/* 1. Status Toast */}
      {checkingStatus && !updateAvailable && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[140] bg-[#1a1518]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
          <p className="text-xs font-medium text-zinc-200 truncate">{checkingStatus}</p>
        </div>
      )}

      {/* 2. MINIMAL UPDATE RELEASE CARD (Exact Match to Reference Image 2) */}
      {updateAvailable && (
        <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-[#1e171b]/98 border border-white/10 rounded-[30px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Top Pill Badge */}
            <div className="self-start mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3d262d] text-[#fca5a5] border border-[#f87171]/25 text-[11px] font-semibold">
                <span className="text-xs">↻</span>
                <span>Update available</span>
              </span>
            </div>

            {/* Version Title */}
            <h2 className="text-2xl font-bold text-white tracking-tight mb-4">
              Version v1.4.1 is available
            </h2>

            {/* Changelog Card Box */}
            <div className="bg-[#2a1f24]/90 border border-white/[0.06] rounded-2xl p-4 mb-5 space-y-3.5 text-xs text-zinc-300 max-h-72 overflow-y-auto custom-scrollbar">
              <p className="text-sm font-semibold text-[#fca5a5]">Changelog</p>

              {/* Fixes Section */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-white uppercase tracking-wider">• Fixes</p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Permanently suppressed Netlify badge watermark across all screen views.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Fixed Android hardware back button to navigate stack hierarchically.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Full lock screen & notification panel background media controls.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Continuous playlist queue generation without 10-song looping.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Minimized floating playcard quick like & hide direct buttons.
                </p>
              </div>

              {/* Improvements Section */}
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-bold text-white uppercase tracking-wider">• Improvements</p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • 120Hz fluid motion & hardware-accelerated transitions throughout.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Modern disconnected-bar Aura logo with radiant soundwave rings.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Clean header with mood & genre filter chips (Punjabi, Hindi, Romance, Workout).
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Speed Dial 3x3 grid with top Punjabi, Hindi, and Global hit charts.
                </p>
                <p className="pl-3 text-[11px] text-zinc-300 leading-relaxed">
                  • Dedicated Settings panel with 1-tap direct app updates.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setUpdateAvailable(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Next time
              </button>

              <button
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-full bg-[#fca5a5] hover:bg-[#f87171] text-[#1a1518] text-xs font-bold shadow-lg shadow-rose-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Install Banner */}
      {showInstallBanner && !updateAvailable && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-88 z-[100] bg-[#12121c]/95 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-md">
              <span className="text-xs text-white">✦</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Install Aura App</p>
              <p className="text-[10px] text-zinc-400 truncate">Add to Home Screen for offline music</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold transition-all shadow-md active:scale-95"
            >
              Install
            </button>
            <button
              onClick={() => {
                localStorage.setItem('aura_pwa_dismissed', 'true');
                setShowInstallBanner(false);
              }}
              className="p-1 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
