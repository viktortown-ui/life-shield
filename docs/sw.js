const CACHE_VERSION = 'life-shield-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/reset.css',
  './styles/main.css',
  './core/app.js',
  './core/shield.js',
  './ui/navigation.js',
  './ui/theme.js',
  './ui/missions.js',
  './ui/copy.js',
  './ui/tone-settings.js',
  './ui/shield.js',
  './ui/snapshot.js',
  './ui/stress.js',
  './ui/history.js',
  './ui/pwa.js',
  './storage/tone.js',
  './storage/shield.js',
  './storage/stress.js',
  './modules/missions/data.js',
  './assets/copy/ru.json',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, HTML_CACHE].includes(key)) {
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request) => {
  const cache = await caches.open(HTML_CACHE);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match('./index.html');
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
