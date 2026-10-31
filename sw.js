const CACHE = 'dighv-v15';
// Weerdata apart en klein houden: alleen als terugval offline, en met
// coördinaten erin, dus niet onbeperkt bewaren.
const API_CACHE = 'dighv-api';
const API_CACHE_MAX = 6;
// Relatieve paden: werkt op GitHub Pages, een eigen domein en lokaal.
const PRECACHE = [
  './',
  './index.html',
  './huisstijl/huisstijl.css',
  './huisstijl/tokens.css',
  './huisstijl/base.css',
  './huisstijl/components.css',
  './huisstijl/theme.css',
  './style.css',
  './logic.js',
  './script.js',
  './theme-init.js',
  './manifest.json',
  './fonts/inter-latin.woff2',
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
      Promise.all(keys.filter(k => k.startsWith('dighv-') && k !== CACHE && k !== API_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// De plek van het laatst gestarte API-verzoek. Een antwoord dat nog onderweg was
// voor een vorige plek (locatie net gewisseld) komt niet meer in de cache.
let lastApiSpot = '';
const spotOf = url => `${url.searchParams.get('latitude')},${url.searchParams.get('longitude')}`;

// Bewaar een API-antwoord en gooi de oudste weg boven de limiet.
async function putApi(request, response) {
  const cache = await caches.open(API_CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - API_CACHE_MAX)).map(k => cache.delete(k)));
}

// Network-first: altijd live proberen, offline terugvallen op de cache.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (NO_CACHE_HOSTS.includes(url.hostname)) return;
  const own = url.origin === location.origin;
  if (!own) lastApiSpot = spotOf(url);
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          if (own) caches.open(CACHE).then(cache => cache.put(event.request, clone));
          else if (spotOf(url) === lastApiSpot) putApi(event.request, clone).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(hit => {
        if (hit) return hit;
        // Eigen assets worden geprecachet zonder ?v= query; match die alsnog
        if (own) {
          return caches.match(event.request, { ignoreSearch: true });
        }
      }))
  );
});
