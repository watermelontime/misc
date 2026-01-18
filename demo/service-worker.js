/* Simple cache-first PWA service worker */
const CACHE_NAME = 'sensors-demo-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './images/logo.svg',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME) return caches.delete(k);
    })))
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navigation requests: serve cached index.html (SPA-like)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((res) => res || fetch(req))
    );
    return;
  }

  // Same-origin: cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return resp;
      }))
    );
    return;
  }

  // Cross-origin (e.g., ZXing CDN): try cache-first then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return resp;
    }).catch(() => cached))
  );
});
