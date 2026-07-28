// ═══════════════════════════════════════════════════════════════════
// Service Worker — Offline Support via Cache API
// Cache-first strategy: serve from cache, update in background
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'pkl-v1.2.0';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/src/app.js',
  '/src/engine.js',
  '/src/audio.js',
  '/src/keyboard.js',
  '/src/ui.js',
  '/src/modes/modes.js',
  '/src/stats-engine.js',
  '/src/stats-ui.js',
  '/src/custom-sets.js',
  '/src/srs-engine.js',
  '/src/data-mgmt.js',
  '/src/curriculum.js',
  '/src/auth.js',
  '/src/auth-ui.js',
  '/src/sync.js',
  '/src/supabase.js',
  '/public/assets/img/icon-192.svg',
  '/public/assets/img/icon-512.svg',
];

// ─── Install: precache all static assets ──────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        // Individual file failures shouldn't block install
        console.warn('SW precache partial failure:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ───────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch: cache-first, network fallback ─────────────────────────

self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin resources
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Don't cache API calls or live-reload
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.includes('hot-reload')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Stale-while-revalidate: return cache, update in background
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => { /* network unavailable, cached is fine */ });
        return cached;
      }
      // Not in cache — fetch from network
      return fetch(event.request).then(response => {
        if (!response.ok) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
