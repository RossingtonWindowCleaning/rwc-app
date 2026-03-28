// ============================================================
// service-worker.js — Rossington Window Cleaning PWA
// ============================================================
// ⬆️ BUMP THE VERSION NUMBER EVERY TIME YOU DEPLOY CHANGES
// e.g. rwc-v4 → rwc-v5 → rwc-v6
// This forces all devices to clear old cache and load fresh files
// ============================================================

const CACHE_NAME = 'rwc-v15';
const APP_SHELL = [
  './home.html',
  './payments.html',
  './tracker.html',
  './referral.html',
  './terms.html',
  './index.html',
  './rossington-data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-header.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Always let API calls go directly to network — never cache or intercept
  if (url.hostname === 'script.google.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
