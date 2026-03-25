const VERSION = 'v4'
const STATIC_CACHE = `cantoni-static-${VERSION}`
const PAGE_CACHE = `cantoni-pages-${VERSION}`
const ASSET_CACHE = `cantoni-assets-${VERSION}`
const OFFLINE_URL = '/offline'
const CORE_ASSETS = [OFFLINE_URL, '/manifest.webmanifest', '/logo-cantoni.svg', '/icon', '/apple-icon']

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isCacheablePage(pathname) {
  return pathname === '/' || pathname === '/offline'
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, PAGE_CACHE, ASSET_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  const url = new URL(request.url)
  if (!isSameOrigin(url)) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isCacheablePage(url.pathname)) {
            const copy = response.clone()
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cachedPage = await caches.match(request)
          if (cachedPage) return cachedPage

          const cachedByPath = await caches.match(url.pathname)
          if (cachedByPath) return cachedByPath

          return caches.match(OFFLINE_URL)
        })
    )
    return
  }

  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          })
          .catch(() => cached)

        return cached || networkFetch
      })
    )
  }
})
