// ============================================================
// service-worker.js — Rossington Window Cleaning PWA
// Caches app shell for fast loading + offline fallback
// ============================================================

const CACHE_NAME = 'rwc-v1';
const APP_SHELL = [
  '/rwc-app/home.html',
  '/rwc-app/payments.html',
  '/rwc-app/tracker.html',
  '/rwc-app/referral.html',
  '/rwc-app/terms.html',
  '/rwc-app/index.html',
  '/rwc-app/rossington-data.js',
  '/rwc-app/manifest.json'
];

// INSTALL — cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ACTIVATE — clean up old caches when we deploy updates
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// FETCH — network first, fall back to cache
// This means customers always get fresh data when online,
// but the app still loads if they're offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Don't cache API calls to Google Apps Script — always go to network
  if (url.hostname === 'script.google.com') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Save a copy to cache for offline use
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Offline — serve from cache
        return caches.match(event.request);
      })
  );
});
