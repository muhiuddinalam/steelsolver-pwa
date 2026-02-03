// SteelSolver Minimal Service Worker
const CACHE_NAME = 'steelsolver-v1';

self.addEventListener('install', (event) => {
  console.log('SteelSolver: Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('SteelSolver: Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through
  event.respondWith(fetch(event.request));
});
