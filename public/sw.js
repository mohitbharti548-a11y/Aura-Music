// public/sw.js - Aura Music Progressive Web App Service Worker with In-App Auto-Update
const CACHE_VERSION = 'aura-v1.2.0';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// 1. Install: Cache core static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Allow immediate activation when updated
  self.skipWaiting();
});

// 2. Message: Listen for SKIP_WAITING or check triggers from PwaRegister UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 3. Activate: Purge old cache versions and claim immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION && key.startsWith('aura-v')) {
            console.log('[Aura SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 4. Fetch: Stale-while-revalidate for UI assets, Network-first for dynamic routes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API requests, audio streaming, and Range header requests from service worker cache
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/audio/') ||
    event.request.headers.get('range')
  ) {
    return;
  }

  // Bypass cache for sw.js itself to ensure instant update discovery
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting navigation, return cached home
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
