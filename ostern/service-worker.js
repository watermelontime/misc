/* ============================================================
   service-worker.js – Cache-first für Offline-Fähigkeit
   ============================================================ */

const CACHE_NAME = 'ostern-2026-v8';
const ASSETS = [
    './',
    'index.html',
    'spiel.html',
    'styles.css',
    'titel.css',
    'titel.js',
    'spiel.css',
    'spiel.js',
    'config.js',
    'manifest.json',
    'images/icon-192x192.svg',
    'images/icon-512x512.svg'
];

// Install: alle Assets cachen
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: alte Caches löschen
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: Cache first, then network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
