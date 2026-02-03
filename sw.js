// SteelSolver Enhanced Service Worker with Push Notifications
const CACHE_NAME = 'steelsolver-v2-' + Date.now();
const APP_VERSION = '2.0';
const NOTIFICATION_ICON = 'https://www.steelsolver.com/favicon.ico';

// Push Notification Configuration
const NOTIFICATION_CONFIG = {
  title: 'SteelSolver',
  icon: NOTIFICATION_ICON,
  badge: NOTIFICATION_ICON,
  vibrate: [200, 100, 200],
  data: {
    url: 'https://www.steelsolver.com/'
  }
};

// ========== PUSH NOTIFICATION HANDLER ==========
self.addEventListener('push', function(event) {
  console.log('📬 Push notification received');
  
  let notificationData = {
    title: 'SteelSolver Update',
    body: 'New content available!',
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    data: {
      url: 'https://www.steelsolver.com/',
      timestamp: Date.now()
    }
  };
  
  // Try to parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        icon: data.icon || NOTIFICATION_ICON,
        badge: data.badge || NOTIFICATION_ICON
      };
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('📌 Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || 'https://www.steelsolver.com/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if window is already open
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-new-content') {
    event.waitUntil(syncNewContent());
  }
});

// Periodic background updates
self.addEventListener('periodicsync', function(event) {
  console.log('⏰ Periodic sync:', event.tag);
  
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

// ========== INSTALL & ACTIVATE ==========
self.addEventListener('install', function(event) {
  console.log('🛠️ SteelSolver installing v' + APP_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Caching app shell');
        return cache.addAll([
          '/',
          'https://www.steelsolver.com/',
          NOTIFICATION_ICON
        ]);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('⚡ SteelSolver activating');
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      clearOldCaches(),
      registerPeriodicSync()
    ])
  );
});

// ========== FETCH HANDLING ==========
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached response if available
        if (response) {
          console.log('💾 Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(function(response) {
            // Cache the response for future use
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(function(error) {
            console.log('🌐 Fetch failed:', error);
            // Return offline page or fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// ========== HELPER FUNCTIONS ==========
function clearOldCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        if (cacheName !== CACHE_NAME && cacheName.startsWith('steelsolver-')) {
          console.log('🗑️ Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
      })
    );
  });
}

async function checkForUpdates() {
  try {
    console.log('🔍 Checking for updates...');
    
    // Check for new posts
    const response = await fetch('https://www.steelsolver.com/feeds/posts/default?alt=json&max-results=1');
    const data = await response.json();
    
    const latestPost = data.feed.entry[0];
    const postTitle = latestPost.title.$t;
    const postUrl = latestPost.link.find(l => l.rel === 'alternate').href;
    
    // Check if this is new content
    const lastUpdate = await getLastUpdate();
    const postDate = new Date(latestPost.updated.$t);
    
    if (!lastUpdate || postDate > new Date(lastUpdate)) {
      console.log('🆕 New post found:', postTitle);
      
      // Show notification
      await self.registration.showNotification('📝 New Blog Post!', {
        body: postTitle,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        data: { url: postUrl },
        tag: 'new-post',
        requireInteraction: true
      });
      
      // Update last check time
      await updateLastCheck();
    }
    
    return true;
  } catch (error) {
    console.log('Update check failed:', error);
    return false;
  }
}

async function syncNewContent() {
  console.log('📡 Syncing new content in background');
  return checkForUpdates();
}

async function registerPeriodicSync() {
  if ('periodicSync' in self.registration) {
    try {
      await self.registration.periodicSync.register('check-updates', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
      console.log('✅ Periodic sync registered');
    } catch (error) {
      console.log('❌ Periodic sync failed:', error);
    }
  }
}

async function getLastUpdate() {
  const cache = await caches.open('steelsolver-settings');
  const response = await cache.match('last-update');
  return response ? await response.text() : null;
}

async function updateLastCheck() {
  const cache = await caches.open('steelsolver-settings');
  await cache.put('last-update', new Response(Date.now().toString()));
}

console.log('🚀 SteelSolver Service Worker loaded v' + APP_VERSION);
