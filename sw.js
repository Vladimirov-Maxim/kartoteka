/* Service worker: чтобы приложение открывалось без сети.
   Кэшируем только свои файлы. Запросы к Supabase и к CDN не трогаем никогда —
   иначе можно показать устаревшие данные вместо свежих. */

const CACHE = "kartoteka-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;   // Supabase и CDN — мимо кэша

  // навигация: сначала сеть, чтобы после деплоя сразу увидеть новую версию
  if (e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // остальное: отдаём из кэша сразу, в фоне подтягиваем свежее
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
