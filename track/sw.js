/* Service Worker: macht die App vollständig offline nutzbar.
 * Strategie "stale-while-revalidate": sofort aus dem Cache antworten und im
 * Hintergrund aktualisieren – eine neue Version ist beim nächsten Start aktiv.
 * Die Nutzerdaten liegen in IndexedDB und werden hier nie angefasst. */
const CACHE = "themen-tracker-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/db.js",
  "./js/app.js",
  "./lib/chart.umd.js",
  "./lib/hammer.min.js",
  "./lib/chartjs-plugin-zoom.min.js",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("themen-tracker-") && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached || Response.error());
      if (cached) {
        e.waitUntil(fresh);
        return cached;
      }
      return fresh;
    })
  );
});
