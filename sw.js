const CACHE = 'dighv-v8';
// Relatieve paden: werkt op GitHub Pages, een eigen domein en lokaal.
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];
// Niet cachen: locatie-opzoekingen (privacy) en GitHub (niet nodig offline).
const NO_CACHE_HOSTS = ['nominatim.openstreetmap.org', 'api.github.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    // cache: 'reload' slaat de HTTP-cache over, anders kan een oude versie in de precache belanden
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      // Alleen eigen caches opruimen: andere projecten op dezelfde github.io-origin delen Cache Storage.
      Promise.all(keys.filter(k => k.startsWith('dighv-') && k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try live data, fall back to cache when offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (NO_CACHE_HOSTS.includes(url.hostname)) return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(hit => {
        if (hit) return hit;
        // Eigen assets worden geprecachet zonder ?v= query; match die alsnog
        if (url.origin === location.origin) {
          return caches.match(event.request, { ignoreSearch: true });
        }
      }))
  );
});
