const CACHE_NAME = 'falguiere-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
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
  '/assets/galerie-1.jpg',
  '/assets/galerie-2.jpg',
  '/assets/galerie-3.jpg',
  '/assets/galerie-4.jpg',
  '/assets/galerie-5.jpg'
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Stale-while-revalidate for HTML files to always get the latest in background
          if (event.request.destination === 'document' || event.request.url.includes('.html')) {
             fetch(event.request).then(fetchRes => {
                 caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchRes));
             }).catch(() => {});
          }
          return response;
        }
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
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
