/* ===== Cinebruh · inicialização: carrega os dados e abre a aba do endereço ===== */
let SITE = null;
const getJSON = url => fetch(url, {cache:'no-cache'}).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); });

route();   // mostra a aba certa já, enquanto os dados carregam

const siteP = getJSON('site.json')
  .then(j=>{ SITE = j; renderHome(j); renderSetup(j); renderApoiar(j); renderComunidade(j); renderOffline(j); renderPrecos(j); return j; })
  .catch(err=>{
    failHome(err);
    document.getElementById('comunidade-box').innerHTML = '<div class="soon"><p>Não consegui carregar agora 😢</p><a class="cta alt" href="https://discord.gg/MUs6NbZJ3r" target="_blank" rel="noopener">Entrar no Discord ↗</a></div>';
    document.getElementById('apoiar-box').innerHTML = '<div class="soon"><p>Não consegui carregar agora. Chave Pix: contato.faribruh@gmail.com</p></div>';
    document.getElementById('setup').innerHTML = '<div class="soon"><p>Não consegui carregar o setup agora 😢</p></div>';
    document.getElementById('midiakit').innerHTML = '<div class="soon"><p>Não consegui carregar o mídia kit agora 😢</p></div>';
    return null;
  });

const dataP = getJSON('data.json')
  .then(j=>{ bootCatalog(j); route(); renderHomeExtra(); fillCalcList(); renderRecentPat(); })   // route() de novo: abre a obra se o endereço for #/catalogo/<obra>
  .catch(failCatalog);

/* o mídia kit usa os dois: os números do canal (site.json) e os do catálogo (data.json) */
Promise.allSettled([siteP, dataP]).then(()=>{ if(SITE){ renderMidiakit(SITE); renderOfflineQueue(); } });

/* cronograma: carrega depois do catálogo pra ligar cada obra à página dela.
   Se o Trello tiver uma sessão de Off Live marcada, ela vira a "Próxima sessão" da aba Reacts Offline
   (no lugar da que está escrita à mão no site.json). */
dataP.finally(()=> getJSON('cronograma.json').then(j=>{
  bootCronograma(j); renderHomeExtra(); renderRecentPat();
  if(j.offline) siteP.then(s=>{ if(!s) return; s.offline = {...(s.offline||{}), proxima: j.offline}; renderOffline(s); renderOfflineQueue(); });
}).catch(failCronograma));
