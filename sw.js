const CACHE = 'dighv-v2';
const PRECACHE = [
  '/Moetikeenjasaan.paul/',
  '/Moetikeenjasaan.paul/index.html',
  '/Moetikeenjasaan.paul/style.css',
  '/Moetikeenjasaan.paul/script.js',
  '/Moetikeenjasaan.paul/favicon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try live data, fall back to cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
