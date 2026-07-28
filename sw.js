// Service Worker for 学习打卡工作台
// 策略：网络优先（保证总是拿到最新版），离线时回退缓存
const CACHE_NAME = 'study-workbench-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-144.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: 预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: 清除旧缓存，立即接管
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
  // 立即通知所有页面刷新
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

// Fetch: 网络优先，失败时回退缓存
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(response => {
      // 成功拿到网络响应，更新缓存
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(() => {
      // 网络失败（离线），回退缓存
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        // 导航请求离线时回退到 index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
