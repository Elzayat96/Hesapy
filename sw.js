/* ============================================================
   Service Worker — حسابي
   بيخلي التطبيق يشتغل من غير إنترنت
   ============================================================ */

const CACHE_NAME = 'hesaby-v1.0.0';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ---------- التثبيت: خزّن الملفات ---------- */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS).catch(err => {
          console.warn('[SW] Failed to cache some assets:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

/* ---------- التفعيل: امسح الكاش القديم ---------- */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- جلب الطلبات ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  // تجاهل الطلبات مش GET
  if (request.method !== 'GET') return;

  // تجاهل طلبات chrome-extension وغيرها
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          // رجّع من الكاش + حدّث في الخلفية
          fetch(request).then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME).then(c => c.put(request, res));
            }
          }).catch(() => {});
          return cached;
        }

        // مش موجود في الكاش — نجيبه من النت
        return fetch(request)
          .then(res => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(request, copy));
            }
            return res;
          })
          .catch(() => {
            // لو مفيش نت وطلب صفحة — رجّع index.html
            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

/* ---------- استقبال رسائل من الصفحة ---------- */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});