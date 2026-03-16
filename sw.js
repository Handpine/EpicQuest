// 升級快取版本號，強迫手機下載最新的 index.html 與 app.js
const CACHE_NAME = 'epic-quest-v12';

// 更新需要快取的資源清單，特別是替換成最新的史詩魔法字體
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    // 確保離線時也能載入我們精美的中世紀與宋體字
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=MedievalSharp&family=Noto+Serif+TC:wght@400;700;900&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    // 魔法：強制新的 Service Worker 立即進入 waiting 狀態，不要等待舊版關閉
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const isHtml = event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html');
    
    if (isHtml) {
        // HTML 採用 Network First：確保每次打開 App 都能抓到最新的骨架
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        // 靜態資源採用 Cache First：加速載入，省流量
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});

self.addEventListener('activate', (event) => {
    // 清除舊版本快取，釋放手機空間並確保不卡舊 Bug
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('Service Worker: 刪除舊快取', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            // 魔法：讓新的 Service Worker 立即接管所有開啟的網頁客戶端
            return self.clients.claim();
        })
    );
});