// assets/js/sw.js
const CACHE_NAME = 'rb-rules-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/view.html',
  '/docs.html',
  '/about.html',
  '/assets/css/app.css',
  '/assets/js/app.js',
  '/assets/js/search.js',
  '/assets/js/view.js',
  '/assets/js/docs.js',
  '/assets/data/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      const req = event.request;
      const url = new URL(req.url);

      // Cache-first for same-origin
      if (url.origin === location.origin) {
        const cached = await caches.match(req);
        if (cached) return cached;

        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      }

      return fetch(req);
    })()
  );
});
