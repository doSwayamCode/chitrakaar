const CACHE_NAME = 'chitrakaar-v1.0.8';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/translations.js',
  '/leaderboard.js',
  '/share.js',
  '/manifest.json',
  '/chitrakaar-logo.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network-first for app files, cache-first for static assets
self.addEventListener('fetch', (event) => {
  // Skip socket.io and non-GET requests
  if (event.request.url.includes('socket.io') || event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isStaticAsset = /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$/i.test(url.pathname)
    || event.request.url.includes('fonts.googleapis.com')
    || event.request.url.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    // Cache-first for fonts and images (they rarely change)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  } else {
    // Network-first for HTML, JS, CSS — always get fresh updates
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: serve from cache
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
    );
  }
});

// Background sync for sharing
self.addEventListener('sync', (event) => {
  if (event.tag === 'share-drawing') {
    event.waitUntil(
      // Handle background sharing logic
      Promise.resolve()
    );
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Join your friends in Chitrakaar!',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Chitrakaar', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
