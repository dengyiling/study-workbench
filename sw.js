// Service Worker v6 - 学习打卡工作台
// 策略：网络优先 + 温柔更新（不强制刷新，提示用户手动更新）
// v6: 修复 PWA 导入按钮无响应（label + for 替代 JS click）
const CACHE_NAME = 'study-workbench-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-144.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: 预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  // skipWaiting 让新SW立即激活（但不强制刷新正在打开的页面）
  self.skipWaiting();
});

// Activate: 清除旧缓存，接管页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
  // 通知已打开的页面"有新版本可用"，但不强制刷新
  // 页面收到消息后显示提示条，用户点击后才刷新
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'UPDATE_AVAILABLE' });
    });
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
          return caches.match('./index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
