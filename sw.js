const CACHE_NAME = 'golden-hour-shell-v23';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/light-times.js',
  '/js/location.js',
  '/js/transition-window.js',
  '/js/transition-diagram.js',
  '/js/weather.js',
  '/js/notifications.js',
  '/js/share.js',
  '/js/vendor/suncalc.js',
  '/js/components/light-window-card.js',
  '/manifest.webmanifest',
  '/images/icons/logo-dark.png',
  '/images/icons/logo-light.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch((error) => {
        // Only navigations (loading a page) get the offline fallback — a failed, uncached
        // asset request (script/style/image) just fails naturally, same as before.
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        throw error;
      });
    })
  );
});
