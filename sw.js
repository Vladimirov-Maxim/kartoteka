/* Service worker: чтобы приложение открывалось без сети.
   Кэшируем только свои файлы. Запросы к Supabase и к CDN не трогаем никогда —
   иначе можно показать устаревшие данные вместо свежих. */

const CACHE = "kartoteka-v2";
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

  // no-cache — чтобы обойти собственный кэш браузера: GitHub Pages отдаёт
  // файлы с запасом на десять минут, и без этого свежая выкладка приезжает не сразу.
  const fresh = (req, revalidate) => fetch(req, revalidate ? { cache: "no-cache" } : undefined)
    .then(r => {
      if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
      return r;
    });

  // Разметка, стили, логика — всегда сначала из сети, кэш только как запасной
  // вариант офлайн. Иначе после выкладки можно поймать смесь версий:
  // новый index.html со старым styles.css, и вёрстка разъезжается.
  const code = e.request.mode === "navigate" || /\.(html|css|js|webmanifest)$/.test(url.pathname);
  if (code){
    e.respondWith(
      fresh(e.request, true).catch(() =>
        caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Картинки и иконки меняются редко — их отдаём из кэша сразу,
  // а свежие подтягиваем в фоне.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fresh(e.request))
  );
});
