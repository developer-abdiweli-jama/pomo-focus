const SHELL = '/'
const CACHE_NAME = 'pomo-focus-shell-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const response = await fetch(SHELL)
      await cache.put(SHELL, response.clone())
      const html = await response.text()
      const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => match[1])
        .filter((url) => url.startsWith('/') && !url.startsWith('//'))
      await cache.addAll([...new Set([...assetUrls, '/manifest.json', '/favicon.svg', '/brand-mark.svg', '/pomo-focus-icon.svg', '/pwa-192.png', '/pwa-512.png', '/apple-touch-icon.png'])])
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith('pomo-focus-shell-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const cacheResponse = async () => {
    const cache = await caches.open(CACHE_NAME)
    return cache.match(request.url, { ignoreSearch: true, ignoreVary: true })
  }

  // Always serve the app shell from cache for navigations so the installed
  // PWA opens offline. Other assets are fetched from the network first.
  if (request.mode === 'navigate') {
    event.respondWith(
      cacheResponse().then((cached) => {
        if (cached) {
          return cached
        }
        return fetch(request)
      }),
    )
    return
  }

  event.respondWith((async () => {
    const cached = await cacheResponse()
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok && new URL(request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    } catch {
      return new Response('', { status: 503, statusText: 'Offline' })
    }
  })())
})
