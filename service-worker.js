const CACHE_NAME = 'drumsheet-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/add-song.html',
  '/sheet.html',
  '/js/db.js',
  '/manifest.json'
];

// 설치 이벤트 - 캐시 생성
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('캐시 생성 실패:', error);
      })
  );
  // 새 서비스 워커가 즉시 활성화되도록
  self.skipWaiting();
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 모든 클라이언트에 즉시 적용
  self.clients.claim();
});

// Fetch 이벤트 - 네트워크 우선, 캐시 폴백 전략
self.addEventListener('fetch', (event) => {
  // YouTube API와 외부 CDN은 캐싱하지 않음
  if (
    event.request.url.includes('youtube.com') ||
    event.request.url.includes('cdnjs.cloudflare.com') ||
    event.request.url.includes('img.youtube.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 유효한 응답만 캐시
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // 응답을 복제하여 캐시에 저장
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 가져오기
        return caches.match(event.request);
      })
  );
});

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-songs') {
    event.waitUntil(syncSongs());
  }
});

async function syncSongs() {
  // 향후 온라인 동기화 기능 구현 시 사용
  console.log('곡 동기화 시작');
}
