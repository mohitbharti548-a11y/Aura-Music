'use client';
// components/PwaRegister.tsx
// Comprehensive PWA Manager: Install Banner + Automated In-App Live Update Detection
import { useEffect, useState, useRef } from 'react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    // Helper: Register & attach update listeners
    function setupServiceWorker() {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registration = reg;
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

          // 3. Periodic update polling every 5 minutes
          const intervalId = setInterval(() => {
            reg.update().catch(() => {});
          }, 5 * 60 * 1000);

          return () => clearInterval(intervalId);
        })
        .catch((err) => {
          console.warn('[Aura PWA] Service Worker registration failed:', err);
        });

      // 4. Check for updates on app focus / phone unlock
      function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && registration) {
          registration.update().catch(() => {});
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
    };
  }, []);

  // Trigger Immediate In-App Update
  function handleApplyUpdate() {
    setIsUpdating(true);
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
      {/* 1. Live In-App Update Toast */}
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[120] bg-[#12121e]/95 backdrop-blur-2xl border border-violet-500/50 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300 ring-1 ring-violet-500/30">
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

      {/* 2. Mobile / Desktop PWA Install Banner */}
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
