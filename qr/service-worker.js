const cacheName = 'hello-world-pwa-cache-v1';
const filesToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js'
];

// Service Worker installieren und Dateien cachen
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheName)
            .then((cache) => {
                console.log('Service Worker installiert und gecachte Dateien');
                return cache.addAll(filesToCache);
            })
    );
});

// Service Worker aktivieren und Dateien aus dem Cache bereitstellen
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [cacheName];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Netzwerk und Cache-Fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request);
            })
    );
});