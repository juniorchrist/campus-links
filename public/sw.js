// ================================================================
// Campus Link - Service Worker PWA Avancé
// Stratégies de cache optimisées pour une expérience hors-ligne complète
// ================================================================

const CACHE_NAME = 'campus-link-v1';
const STATIC_CACHE = 'campus-link-static-v1';
const API_CACHE = 'campus-link-api-v1';
const OFFLINE_URL = '/offline.html';

// Assets statiques à mettre en cache (cache-first)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    // CSS
    'https://cdn.tailwindcss.com',
    // JS Libraries
    'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
    // Fonts
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
];

// ================================================================
// Installation du Service Worker
// ================================================================
self.addEventListener('install', (event) => {
    console.log('[Campus SW] Installation...');
    
    event.waitUntil(
        (async () => {
            // Créer les caches
            const staticCache = await caches.open(STATIC_CACHE);
            const apiCache = await caches.open(API_CACHE);
            
            // Mettre en cache les assets statiques
            try {
                await staticCache.addAll(STATIC_ASSETS);
                console.log('[Campus SW] Assets statiques mis en cache');
            } catch (error) {
                console.warn('[Campus SW] Erreur lors du cache des assets:', error);
                // Continuer même si certains assets échouent
            }
            
            // Mettre en cache la page offline
            const offlineResponse = await fetch(OFFLINE_URL);
            if (offlineResponse.ok) {
                await staticCache.put(OFFLINE_URL, offlineResponse);
            }
        })()
    );
});

// ================================================================
// Activation du Service Worker
// ================================================================
self.addEventListener('activate', (event) => {
    console.log('[Campus SW] Activation...');
    
    event.waitUntil(
        (async () => {
            // Nettoyer les anciens caches
            const cacheNames = await caches.keys();
            const deletions = cacheNames
                .filter(name => name !== STATIC_CACHE && name !== API_CACHE)
                .map(name => caches.delete(name));
            
            await Promise.all(deletions);
            console.log('[Campus SW] Anciens caches nettoyés');
            
            // Prendre le contrôle immédiatement
            self.clients.claim();
        })()
    );
});

// ================================================================
// Stratégie de cache principale
// ================================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // ============================================================
    // Stratégie 1: Cache First pour les assets statiques
    // ============================================================
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }
    
    // ============================================================
    // Stratégie 2: Network First pour les API
    // ============================================================
    if (isAPIRequest(request)) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }
    
    // ============================================================
    // Stratégie 3: Cache First pour la navigation (SPA)
    // ============================================================
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }
    
    // ============================================================
    // Fallback: Network First pour tout le reste
    // ============================================================
    event.respondWith(networkFirst(request, API_CACHE));
});

// ================================================================
// Fonctions utilitaires de stratégie de cache
// ================================================================

// Cache First: Vérifier le cache d'abord, puis réseau
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
        console.log(`[Campus SW] Cache hit pour: ${request.url}`);
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            // Mettre en cache uniquement si la réponse est valide
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn(`[Campus SW] Erreur réseau pour: ${request.url}`, error);
        return new Response('Hors ligne', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Network First: Essayer le réseau d'abord, puis cache
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const response = await fetch(request);
        
        // Mettre en cache uniquement les réponses GET réussies
        if (response.ok && request.method === 'GET') {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log(`[Campus SW] Réseau indisponible, utilisation du cache pour: ${request.url}`);
        
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        
        // Pour les requêtes de navigation, retourner la page offline
        if (request.mode === 'navigate') {
            return await cache.match(OFFLINE_URL) || createOfflineResponse();
        }
        
        return new Response('Hors ligne', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Gestion spéciale pour la navigation (SPA)
async function handleNavigation(request) {
    try {
        // Essayer le réseau d'abord
        const response = await fetch(request);
        if (response.ok) {
            // Mettre en cache la page principale
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
            return response;
        }
    } catch (error) {
        console.log('[Campus SW] Navigation hors ligne, utilisation du cache');
    }
    
    // Fallback vers le cache
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    
    // Fallback final vers la page offline
    return await cache.match(OFFLINE_URL) || createOfflineResponse();
}

// ================================================================
// Fonctions utilitaires
// ================================================================

function isStaticAsset(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Extensions de fichiers statiques
    const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];
    
    return staticExtensions.some(ext => pathname.endsWith(ext)) ||
           pathname.includes('/cdn/') ||
           request.url.includes('tailwindcss.com') ||
           request.url.includes('jsdelivr.net') ||
           request.url.includes('unpkg.com') ||
           request.url.includes('cdnjs.cloudflare.com');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    return pathname.startsWith('/api/') || 
           pathname.startsWith('/socket.io/') ||
           request.url.includes('localhost:3000');
}

function createOfflineResponse() {
    return new Response(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hors ligne - Campus Link</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #FF9A8B, #FFD080);
                    margin: 0;
                    padding: 2rem;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .offline-container {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    border-radius: 1rem;
                    padding: 2rem;
                    text-align: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    max-width: 400px;
                }
                .offline-icon {
                    width: 4rem;
                    height: 4rem;
                    background: #FF6B35;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                    color: white;
                    font-size: 2rem;
                }
                h1 { color: #2D3436; margin: 0 0 1rem 0; }
                p { color: #636e72; margin: 0; line-height: 1.6; }
                .retry-btn {
                    background: #FF6B35;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 1.5rem;
                    transition: opacity 0.2s;
                }
                .retry-btn:hover { opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1>Vous êtes hors ligne</h1>
                <p>Impossible de se connecter à Campus Link. Vérifiez votre connexion Internet et réessayez.</p>
                <button class="retry-btn" onclick="window.location.reload()">Réessayer</button>
            </div>
        </body>
        </html>
    `, {
        status: 200,
        statusText: 'OK',
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    });
}

// ================================================================
// Gestion des messages du client
// ================================================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ================================================================
// Synchronisation en arrière-plan (Background Sync)
// ================================================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('[Campus SW] Synchronisation en arrière-plan...');
    // Logique de synchronisation quand la connexion revient
    // À implémenter selon les besoins spécifiques
}

// ================================================================
// Push Notifications (optionnel)
// ================================================================
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Nouveau message sur Campus Link',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
            url: '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('Campus Link', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
