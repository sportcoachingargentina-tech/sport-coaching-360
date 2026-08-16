// Service Worker — Sport Coaching 360
// Solo cachea el "cascarón" de la app (los archivos HTML) para que abra
// rápido y funcione la instalación. Las llamadas a Supabase (datos reales)
// NUNCA se cachean — siempre van a la red, para no mostrar información vieja.

const CACHE_NAME = 'sc360-v1';
const APP_SHELL = [
  '/panel.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a Supabase (ni cualquier request que no sea GET) — siempre red.
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // Para el resto (archivos propios del sitio): red primero, caché como respaldo offline.
  event.respondWith(
    fetch(event.request)
      .then(function(resp) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
        return resp;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});
