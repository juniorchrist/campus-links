// Campus Link Service Worker - v5 (Network First + Clean Update)
const CACHE_NAME = 'campus-link-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Installation : mise en cache des assets de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Prend le contrôle immédiatement sans attendre
  self.skipWaiting();
});

// Répondre aux messages du client (ex: SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activation : nettoie les anciens caches, prend le contrôle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notifier tous les clients qu'une mise à jour est prête
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME });
        });
      });
    })
  );
  // Prend immédiatement le contrôle de tous les clients ouverts
  return self.clients.claim();
});

// Stratégie : Network First avec fallback cache
// → Toujours la version la plus récente si en ligne
// → Cache en fallback si hors ligne
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les API, socket.io et les uploads
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return; // Laisser passer sans cache
  }

  // Uniquement pour les requêtes de navigation (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Mettre à jour le cache avec la réponse réseau
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return networkResponse;
        })
        .catch(() => {
          // Fallback vers le cache si hors ligne
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Pour les autres assets (CSS, JS CDN...) : cache avec fallback réseau
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
