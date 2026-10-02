'use client';
// components/PwaRegister.tsx
// Comprehensive PWA & Update Manager: Minimal "What's New" Update Card Modal + Install Prompt
import { useEffect, useState, useRef, useCallback } from 'react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateData, setUpdateData] = useState<any>(null);
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
        setUpdateData(data);
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
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[140] bg-[#12121e]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping shrink-0" />
          <p className="text-xs font-medium text-zinc-200 truncate">{checkingStatus}</p>
        </div>
      )}

      {/* 2. MINIMAL UPDATE RELEASE CARD (Flash Card Notification) */}
      {updateAvailable && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-250 select-none">
          <div className="w-full max-w-sm bg-[#12121c]/98 border border-violet-500/40 rounded-3xl p-5 shadow-[0_20px_60px_rgba(139,92,246,0.25)] ring-1 ring-violet-500/20 animate-in zoom-in-95 duration-250 flex flex-col">
            
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                <span className="text-sm font-bold text-white">✦</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Aura Update Ready
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    v{updateData?.version || '1.2.0'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  New studio enhancements & fixes are live
                </p>
              </div>
            </div>

            {/* What's Fixed & Added Bullets */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 mb-4 space-y-2 text-xs text-zinc-300">
              <div className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5 text-[11px]">✦</span>
                <p><strong className="text-white font-semibold">Floating Pill Playcard:</strong> Spotify & Echo-grade sleek mini player with lock screen media controls.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-violet-400 mt-0.5 text-[11px]">✦</span>
                <p><strong className="text-white font-semibold">Speed Dial 3x3 Grid:</strong> High-res album cards with 1-tap playback and smooth pagination.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-pink-400 mt-0.5 text-[11px]">✦</span>
                <p><strong className="text-white font-semibold">Infinite Sliding Queue:</strong> Fixed track looping so next sequence never repeats previous tracks.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 text-[11px]">✦</span>
                <p><strong className="text-white font-semibold">75% Queue Sheet:</strong> Optimized compact queue drawer and smooth lyrics scroll.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isUpdating ? 'Updating & Restarting...' : 'Update & Restart Now'}
              </button>

              <button
                onClick={() => setUpdateAvailable(false)}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
              >
                Later
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
