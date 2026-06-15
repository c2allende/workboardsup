// Firebase recommends registering custom click behavior before importing Messaging.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/TurnosSup';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(client => new URL(client.url).pathname.startsWith('/TurnosSup'));
      if(existing) {
        existing.focus();
        return existing.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    })
  );
});

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'workboard-carmelo',
  appId: '1:45199402595:web:be8cd97cf9a43890cdfa56',
  apiKey: 'AIzaSyASSpZRHvbj_BeQJ9qOEYCQSKVwjI_7q0E',
  authDomain: 'workboard-carmelo.firebaseapp.com',
  messagingSenderId: '45199402595'
});

firebase.messaging();

const CACHE_NAME = 'workboard-cache-v75';

const APP_ASSETS = [
  '/',
  '/TurnosSup',
  '/TurnosSup.html',
  '/programa-oficial-jun-2026.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/TurnosSup') || caches.match('/TurnosSup.html'))
    );
    return;
  }

  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
