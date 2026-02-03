// SteelSolver Service Worker
const CACHE_NAME = 'steelsolver-' + new Date().getTime();

self.addEventListener('install', function(event) {
  console.log('SteelSolver PWA: Installing');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  console.log('SteelSolver PWA: Activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
  // Basic fetch handler
  event.respondWith(
    fetch(event.request)
      .catch(function() {
        // If offline, you could return cached response
        return new Response('SteelSolver is offline. Please check your connection.', {
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
