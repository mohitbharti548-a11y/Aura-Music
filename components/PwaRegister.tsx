'use client';
// components/PwaRegister.tsx
// Comprehensive PWA Manager: Install Banner + Automated & On-Demand In-App Live Update Detection
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
      // 1. Force check Service Worker registration update
      if (registrationRef.current) {
        await registrationRef.current.update().catch(() => {});
      }

      // 2. Query Version API with cache-busting
      const res = await fetch(`/api/version?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const storedVersion = localStorage.getItem('aura_app_version');

        if (!storedVersion) {
          localStorage.setItem('aura_app_version', data.version);
          if (isManual) {
            setCheckingStatus(`Aura is running latest v${data.version}`);
            setTimeout(() => setCheckingStatus(null), 3000);
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
        setCheckingStatus('Could not reach update server. Check network.');
        setTimeout(() => setCheckingStatus(null), 3500);
      }
    } catch {
      if (isManual) {
        setCheckingStatus('Offline or connection error.');
        setTimeout(() => setCheckingStatus(null), 3500);
      }
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Helper: Register & attach update listeners
    function setupServiceWorker() {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registrationRef.current = reg;
          console.log('[Aura PWA] Service Worker registered:', reg.scope);

          // 1. Check if there is already a waiting service worker
          if (reg.waiting) {
            waitingWorkerRef.current = reg.waiting;
            setUpdateAvailable(true);
          }

          // 2. Listen for new service worker installation
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update has downloaded and is waiting
                waitingWorkerRef.current = newWorker;
                setUpdateAvailable(true);
              }
            });
          });

          // 3. Periodic update polling every 3 minutes
          const intervalId = setInterval(() => {
            checkLiveVersion(false);
          }, 3 * 60 * 1000);

          return () => clearInterval(intervalId);
        })
        .catch((err) => {
          console.warn('[Aura PWA] Service Worker registration failed:', err);
        });

      // Run initial check
      checkLiveVersion(false);

      // 4. Check for updates on app focus / phone unlock
      function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
          checkLiveVersion(false);
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 5. Reload on controller change (when new SW activates)
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

    // Handle Manual Trigger Event
    function handleManualCheck() {
      checkLiveVersion(true);
    }

    window.addEventListener('aura-check-update', handleManualCheck);

    // Handle Android & Desktop PWA Install Prompt
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
    } catch {
      // Ignore
    }

    // Clear caches
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Ignore
      }
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
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[Aura PWA] User accepted install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  }

  function handleDismissInstall() {
    localStorage.setItem('aura_pwa_dismissed', 'true');
    setShowInstallBanner(false);
  }

  return (
    <>
      {/* 1. Manual Check Status Feedback Toast */}
      {checkingStatus && !updateAvailable && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[130] bg-[#12121e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping shrink-0" />
          <p className="text-xs font-medium text-zinc-200 truncate">{checkingStatus}</p>
        </div>
      )}

      {/* 2. Live In-App Update Toast */}
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[140] bg-[#12121e]/95 backdrop-blur-2xl border border-violet-500/50 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300 ring-1 ring-violet-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30 animate-pulse">
              <span className="text-xs text-white">✦</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">New Update Ready</p>
              <p className="text-[10px] text-zinc-400 truncate">A new version of Aura is live</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-[11px] font-bold shadow-md shadow-violet-600/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              {isUpdating ? 'Updating...' : 'Update Now'}
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="p-1 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. Mobile / Desktop PWA Install Banner */}
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
              onClick={handleDismissInstall}
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
