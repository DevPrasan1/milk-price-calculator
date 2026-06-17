const CACHE = 'milk-calc-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/resources/styles/style.css',
  '/resources/scripts/app.js',
  '/resources/scripts/language.js',
  '/pwa/appstore-images/ios/180.png',
  '/pwa/appstore-images/android/launchericon-192x192.png',
  '/pwa/appstore-images/android/launchericon-512x512.png',
  '/resources/images/farmer-calculating-the-milk-price.jpg',
  '/resources/images/milk-price-calculator-dashboard.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
