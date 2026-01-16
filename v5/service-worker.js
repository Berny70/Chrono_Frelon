const APP_VERSION = "5.9";
const CACHE = "chrono-pwa-v5.9";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// ==========================
// INSTALL
// ==========================
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

// ==========================
// ACTIVATE (NETTOYAGE)
// ==========================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ==========================
// FETCH
// ==========================
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(
      response => response || fetch(event.request)
    )
  );
});

// ==========================
// MESSAGE (VERSION)
// ==========================
self.addEventListener("message", event => {
  if (event.data === "GET_VERSION") {
    event.source.postMessage({ version: APP_VERSION });
  }
});




