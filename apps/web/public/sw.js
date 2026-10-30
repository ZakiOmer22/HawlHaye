/* eslint-disable no-undef */
// HAWLHAYE Service Worker
// Strategy:
// - Static assets (JS, CSS, fonts, images): cache-first (they're content-hashed)
// - HTML navigations: network-first with cache fallback
// - API calls and RSC payloads: never touched (security + freshness)

const CACHE_VERSION = "v1";
const STATIC_CACHE = `hawl-static-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/", "/offline", "/manifest.webmanifest"];

// ── Install: precache the essentials ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: clean up old cache versions ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("hawl-static-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: apply caching strategy ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Never intercept API
  if (url.pathname.startsWith("/api/")) return;

  // Never intercept Next.js RSC payloads (personalized + always fresh)
  if (
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  ) {
    return;
  }

  // Never intercept auth pages (fresh is critical)
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/accept-invite")) {
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|otf|css|js)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigations: network-first
  if (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("Accept")?.includes("text/html"))
  ) {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return new Response("", { status: 408, statusText: "Offline" });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offlinePage = await caches.match("/offline");
    if (offlinePage) return offlinePage;

    return new Response("You are offline", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain" },
    });
  }
}
