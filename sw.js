/* ===== Cinebruh · service worker: deixa o site abrir rápido e funcionar como app =====
   - Página e arquivos .json (catálogo, site, cronograma): sempre tenta a internet primeiro;
     a cópia guardada só é usada sem conexão. Assim o catálogo nunca fica velho.
   - CSS, JS e imagens do site: abre na hora com a cópia guardada e atualiza por trás.
   - Drive, TMDB, Twitch etc. (outros sites): o navegador cuida sozinho, nada é guardado.
   Ao mudar CSS/JS num update grande, troque a VERSAO pra todo mundo receber de uma vez. */
const VERSAO = 'cinebruh-2026-11-11c';
const BASICO = [
  './', 'index.html', 'manifest.webmanifest', 'favicon.png',
  'css/base.css', 'css/layout.css', 'css/catalogo.css', 'css/patrocinar.css', 'css/paginas.css', 'css/intro.css',
  'js/core.js', 'js/player.js', 'js/catalogo.js', 'js/patrocinar.js', 'js/inicio.js', 'js/setup.js',
  'js/midiakit.js', 'js/apoiar.js', 'js/comunidade.js', 'js/cronograma.js', 'js/offline.js',
  'js/tierlist.js', 'js/continuar.js', 'js/pwa.js', 'js/intro.js', 'js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO)
    .then(c => Promise.allSettled(BASICO.map(u => c.add(u))))   // se um arquivo faltar, os outros ainda entram
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function internetPrimeiro(req){
  return fetch(req).then(res => {
    if(res.ok){ const copia = res.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
    return res;
  }).catch(() => caches.match(req, {ignoreSearch:true})
    .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
}
function guardadoPrimeiro(req){
  return caches.match(req).then(guardado => {
    const daRede = fetch(req).then(res => {
      if(res.ok){ const copia = res.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => guardado);
    return guardado || daRede;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === 'navigate' || url.pathname.endsWith('.json')) e.respondWith(internetPrimeiro(req));
  else e.respondWith(guardadoPrimeiro(req));
});
