const CACHE_NAME = 'host-system-shell-v3';
const BASE_URL = new URL('./', self.registration.scope);
const MANIFEST_URL = new URL('manifest.webmanifest', BASE_URL).href;
const ASSETS_URL = new URL('assets/', BASE_URL).pathname;
const SHELL = [BASE_URL.href, MANIFEST_URL, new URL('assets/sigils/initial.svg', BASE_URL).href];

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch(new URL('precache-manifest.json', BASE_URL))
      .then((response) => {
        if (!response.ok) throw new Error('Could not read the application asset manifest.');
        return response.json();
      })
      .then((assets) => caches.open(CACHE_NAME).then((cache) => cache.addAll([...SHELL, ...assets]))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(BASE_URL.href)));
    return;
  }

  if (url.pathname.startsWith(ASSETS_URL) || url.pathname === new URL(MANIFEST_URL).pathname) {
    const refresh = fetch(request)
      .then((response) => {
        if (response.ok) return caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())).then(() => response);
        return response;
      })
      .catch(() => undefined);
    event.waitUntil(refresh.then(() => undefined));
    event.respondWith(caches.match(request).then((cached) => {
      if (cached) return cached;
      return refresh.then((response) => response ?? Response.error());
    }));
  }
});
