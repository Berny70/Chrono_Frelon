self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("balance-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./app.js"
      ]);
    })
  );
});
