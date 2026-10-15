// Service Worker to enable PWA installability
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // A simple pass-through fetch handler is required by some browsers to trigger the PWA install prompt.
  e.respondWith(fetch(e.request).catch(() => {
    // Optional fallback logic if offline could go here
    return new Response('Offline format not supported yet.');
  }));
});
