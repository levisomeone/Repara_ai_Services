/* Service worker do Repara Aí
   - App shell em cache (funciona offline depois da primeira visita)
   - Tailwind/Fontes: stale-while-revalidate
   Ao mudar arquivos, aumente VERSION para limpar o cache antigo. */

const SUPABASE_URL = 'url_supabase';
const SUPABASE_ANON_KEY = 'url_supabase';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VERSION = 'v1';
const SHELL = `reparaai-shell-${VERSION}`;
const RUNTIME = `reparaai-runtime-${VERSION}`;
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'wa.me') return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  e.respondWith(
    caches.open(RUNTIME).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
