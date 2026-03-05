const CACHE_NAME = 'epic-quest-v11';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    const isHtml = event.request.headers.get('accept').includes('text/html');
    
    if (isHtml) {
        // HTML 採用 Network First
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        // 靜態資源採用 Cache First
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});

self.addEventListener('activate', (event) => {
    // 清除舊版本快取
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});