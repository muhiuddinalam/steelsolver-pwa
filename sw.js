// SteelSolver Service Worker
const CACHE_NAME = 'steelsolver-v1';

self.addEventListener('install', event => {
  console.log('SteelSolver: Service Worker installing');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('SteelSolver: Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
