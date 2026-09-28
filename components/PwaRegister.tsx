'use client';
// components/PwaRegister.tsx
import { useEffect, useState } from 'react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[Aura PWA] Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('[Aura PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Handle Android & Desktop PWA Install Prompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user hasn't dismissed before
      const hasDismissed = localStorage.getItem('aura_pwa_dismissed');
      if (!hasDismissed) {
        setShowInstallBanner(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

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

  function handleDismiss() {
    localStorage.setItem('aura_pwa_dismissed', 'true');
    setShowInstallBanner(false);
  }

  if (!showInstallBanner) return null;

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-88 z-[100] bg-[#12121c]/95 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-md">
          <span className="text-xs">✦</span>
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
          onClick={handleDismiss}
          className="p-1 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
