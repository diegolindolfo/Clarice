const CACHE_NAME = 'clarice-v1';

// Arquivos essenciais para funcionar offline
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/emprestimos',
  '/acervo',
  '/alunos',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Instalar: cachear os recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first para navegação, Cache-first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar requests que não são GET
  if (request.method !== 'GET') return;

  // Ignorar requests para o Supabase (API calls)
  if (request.url.includes('supabase.co')) return;

  // Navegação (páginas HTML): Network-first com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salvar no cache para uso offline
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline'))
        )
    );
    return;
  }

  // Assets estáticos (JS, CSS, imagens): Cache-first com fallback para network
  if (
    request.url.includes('/_next/static/') ||
    request.url.includes('/icon-') ||
    request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Demais: Network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
