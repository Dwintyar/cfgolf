// GolfBuana Service Worker v3

const CACHE_VERSION = 'gb-v3';

self.addEventListener('install', (event) => {
  // Force new SW to take over immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clear ALL old caches
      caches.keys().then(keys => 
        Promise.all(keys.map(key => {
          console.log('[SW] Deleting cache:', key);
          return caches.delete(key);
        }))
      )
    ])
  );
});

// Network-only for navigation, network-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // For navigation requests (HTML pages) — always network only, no cache
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For other requests — network first, no cache fallback (always fresh)
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'GolfBuana', body: event.data.text() }; }

  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || 'golfbuana-notif',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'GolfBuana', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
