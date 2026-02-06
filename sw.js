// assets/js/sw.js
// IMPORTANT:
// Bump CACHE_NAME on EVERY release (data or code)
// to guarantee PWA clients receive updates.

// Bump this when you change core assets or caching strategy
const CACHE_NAME = 'rb-judge-codex-v1.0.7';

// Resolve a relative asset path against the SW scope (important for GitHub Pages / subpaths)
const toScopeUrl = (p) => new URL(p, self.registration.scope).toString();
const OFFLINE_FALLBACK_URL = toScopeUrl('index.html');

const CORE_ASSETS = [
  '',
  'index.html',
  'view.html',
  'docs.html',
  'about.html',
  'sw.js',
  'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/app.js',
  'assets/js/search.js',
  'assets/js/view.js',
  'assets/js/docs.js',
  'assets/js/index.js',

  // Data
  'assets/data/manifest.json',
  'assets/data/documents/core_rules.json',
  'assets/data/documents/tr.json',

  // Images used in UI
  'assets/img/logo.png',
  'assets/img/logo-icon.png',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(CORE_ASSETS.map(toScopeUrl));
      } catch (e) {
        // Allow install to succeed even if some optional assets are missing
        await Promise.all(
          CORE_ASSETS.map(async (u) => {
            try {
              await cache.add(toScopeUrl(u));
            } catch (_) {
              /* ignore */
            }
          })
        );
      }
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
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations so updates show up, with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
          return res;
        } catch (e) {
          // Offline: prefer the requested page from cache (e.g. view.html), then fallback to index
          return (
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match(OFFLINE_FALLBACK_URL, { ignoreSearch: true }))
          );
        }
      })()
    );
    return;
  }

  // Cache-first for other same-origin requests (js/css/json/img)
  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        return cached;
      }
    })()
  );
});
