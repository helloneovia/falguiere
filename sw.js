const CACHE_NAME = 'falguiere-cache-v11';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/don.html',
  '/projets.html',
  '/politique-confidentialite.html',
  '/mentions-legales.html',
  '/footer.html',
  '/styles.css',
  '/script.js',
  '/assets/favicon.svg',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/assets/screenshot-wide.jpg',
  '/assets/screenshot-narrow.jpg',
  '/assets/background-photo.jpg',
  '/assets/background-photo.webp',
  '/assets/background-photo-mobile.webp',
  '/assets/background-photo-mobile.jpg',
  '/assets/galerie-1.jpg',
  '/assets/galerie-2.jpg',
  '/assets/galerie-3.jpg',
  '/assets/galerie-4.jpg',
  '/assets/galerie-5.jpg',
  '/assets/galerie-1.webp',
  '/assets/galerie-2.webp',
  '/assets/galerie-3.webp',
  '/assets/galerie-4.webp',
  '/assets/galerie-5.webp'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Ne jamais mettre en cache les requêtes vers l'API
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Stratégie "Network First" pour le HTML, CSS, JS et la navigation
  if (
    event.request.mode === 'navigate' || 
    event.request.destination === 'document' || 
    event.request.url.includes('.html') || 
    event.request.url.includes('.css') || 
    event.request.url.includes('.js')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Met en cache la nouvelle version récupérée sur le réseau
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // En cas d'échec (hors ligne), on cherche dans le cache
          return caches.match(event.request).then(response => {
            if (response) {
              return response;
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
        })
    );
  } else {
    // Stratégie "Cache First" pour le reste (images, polices, etc.)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(fetchRes => {
            const fetchResClone = fetchRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchResClone));
            return fetchRes;
          }).catch(() => {});
        })
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim()); // Force the active service worker to take control of all clients
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Periodic background sync for PWABuilder
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      console.log('Periodic sync triggered for data update')
    );
  }
});
