const CACHE_NAME = 'campus-link-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
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
    })
  );
  self.clients.claim();
});

// Stratégie Cache First pour une PWA hors ligne de base
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourne la version en cache si elle existe, sinon fait la requête réseau
        return response || fetch(event.request).catch(() => {
          // Fallback optionnel pour index.html si hors ligne et non en cache (théoriquement impossible si bien mis en cache)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
