const APP_VERSION = "7.0";
const CACHE = "chrono-pwa-v7.0";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./version.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(
      response => response || fetch(event.request)
    )
  );
});

self.addEventListener("message", event => {
  if (event.data === "GET_VERSION") {
    event.source.postMessage({ version: APP_VERSION });
  }
});






