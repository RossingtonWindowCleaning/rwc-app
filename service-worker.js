// ============================================================
// service-worker.js — Rossington Window Cleaning PWA
// ============================================================
// ⬆️ BUMP THE VERSION NUMBER EVERY TIME YOU DEPLOY CHANGES
// e.g. rwc-v15 → rwc-v16 → rwc-v17
// This forces all devices to clear old cache and load fresh files
// ============================================================

const CACHE_NAME = 'rwc-v16';
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

  // ===== THE FIX =====
  // Let ALL Google Apps Script calls bypass the service worker completely.
  // By returning WITHOUT calling event.respondWith(), the browser handles
  // the request natively — no redirect or CORS interference.
  // The old code used event.respondWith(fetch(event.request)) which broke
  // because Google Apps Script POST returns a 302 redirect that the
  // service worker fetch() cannot follow properly.
  if (url.hostname === 'script.google.com' || url.hostname.includes('googleapis.com')) {
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
