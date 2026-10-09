/*!
 * GIFS Поисковик — sw.js (Service Worker)
 * Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/>
 * Licensed under the MIT License (see LICENSE)
 * https://github.com/PsyGioX/gifs-search-ru
 */

const VERSION = 'gifs-v3';
const SHELL = [
  '/',
  '/css/styles.css',
  '/js/config.js',
  '/js/i18n.js',
  '/js/app.js',
  '/favicon/favicon.ico',
  '/favicon/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Только свои GET-запросы; API и сторонние домены не трогаем
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // HTML — сначала сеть, при обрыве — кэш
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Статика — из кэша с фоновым обновлением
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone(); // клонируем сразу, пока тело не прочитано
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
