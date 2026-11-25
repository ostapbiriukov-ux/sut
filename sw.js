/* Служебный работник «Сути»: держит приложение в памяти устройства, чтобы оно открывалось мгновенно и без интернета.
   Страница и значки отдаются из кэша. Новая сборка приходит с новым номером версии: кэш собирается заново,
   старый удаляется, а открытая страница узнаёт об обновлении и предлагает перезагрузиться. */
const VERSION = 'aa271848a8';
const SHELL = 'sut-shell-' + VERSION;
const FONTS = 'sut-fonts-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.indexOf('sut-shell-') === 0 && key !== SHELL).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      // любое открытие приложения: сама страница из кэша, сеть только если кэша почему-то нет
      event.respondWith(caches.match('./index.html').then((hit) => hit || fetch(request)));
      return;
    }
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
    return;
  }

  // шрифты Google: после первой загрузки берём из кэша, чтобы оформление не менялось без сети
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then((cache) => cache.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
        return response;
      })))
    );
  }
});
