const CACHE_NAME = 'phonetrack-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Push notification support
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100]
  };
  
  event.waitUntil(
    self.registration.showNotification('PhoneTrack', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
