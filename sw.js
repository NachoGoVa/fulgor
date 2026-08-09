/**
 * Cache local de FULGOR. Sirve para dos cosas:
 *   1) que el juego abra al instante en visitas siguientes,
 *   2) que se pueda jugar sin conexión (la partida ya vive en localStorage).
 *
 * Estrategia: stale-while-revalidate. Se responde YA desde la caché y en paralelo
 * se pide la versión nueva a la red para la próxima carga. Así nunca se queda
 * pillado en una versión vieja, que es el clásico problema de los service workers.
 *
 * ⚠️ Al desplegar cambios hay que subir VERSION: es lo que borra la caché anterior.
 */
const VERSION = 'fulgor-v3';

const ASSETS = [
  './', './index.html', './src/styles.css', './src/main.js',
  './src/engine/config.js', './src/engine/engine.js',
  './src/engine/format.js', './src/engine/save.js',
  './src/ui/art.js', './src/ui/scene.js', './src/ui/shop.js',
  './src/ui/hud.js', './src/ui/fx.js',
];

self.addEventListener('install', (ev) => {
  // addAll falla entero si un fichero falla; los metemos de uno en uno para que
  // un 404 puntual no deje al usuario sin caché ninguna.
  ev.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(ASSETS.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  ev.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });

    const fresh = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    // Si hay copia local se sirve al momento; si no, se espera a la red.
    if (hit) { ev.waitUntil(fresh); return hit; }
    const res = await fresh;
    if (res) return res;
    // Sin red y sin caché: al menos devolvemos la portada si la pedían navegando.
    return (req.mode === 'navigate' && await cache.match('./index.html')) ||
           new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});
