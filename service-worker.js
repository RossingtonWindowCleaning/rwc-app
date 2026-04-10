// ============================================================
// service-worker.js — Rossington Window Cleaning PWA
// ============================================================
// v27 — Data-only push payload to fix double notifications
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA9NfQXYIRGdULIEv5jYaLLJtIusWc_j7w",
  authDomain: "rossington-wc.firebaseapp.com",
  projectId: "rossington-wc",
  storageBucket: "rossington-wc.firebasestorage.app",
  messagingSenderId: "228463613008",
  appId: "1:228463613008:web:2eebd32515b37172efad55"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload);

  const title = (payload.data && payload.data.title) || 'Rossington Window Cleaning';
  const options = {
    body: (payload.data && payload.data.body) || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'rwc-notification',
    renotify: true
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.includes('home.html') && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./home.html');
      }
    })
  );
});

// ============================================================
// PWA Caching
// ============================================================

const CACHE_NAME = 'rwc-v27';
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

  if (url.hostname === 'script.google.com' ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseinstallations') ||
      url.hostname.includes('fcmregistrations')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
