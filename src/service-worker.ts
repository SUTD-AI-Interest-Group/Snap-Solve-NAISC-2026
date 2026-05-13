/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `snap-solve-${version}`;
// `build` is the compiled JS/CSS bundle; `files` is everything under static/;
// `prerendered` is the list of prerendered HTML routes (typically ['/']).
// Including all three means an offline hard-refresh of the app shell hits
// cache instead of failing.
const PRECACHE = [...build, ...files, ...prerendered];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation fallback: an offline page load for an uncached route should
  // still serve the cached app shell (prerendered "/"), letting the SPA
  // bootstrap and render whatever screen makes sense.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches
        .match(event.request)
        .then((hit) => hit ?? caches.match('/'))
        .then((hit) => hit ?? fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      });
    })
  );
});

export {};
