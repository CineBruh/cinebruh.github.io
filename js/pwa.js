/* ===== Cinebruh · instalar como app (celular e computador) ===== */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvt = null;

/* o service worker só roda no site publicado (na prévia e em arquivos locais ele atrapalharia) */
if('serviceWorker' in navigator && (/\.github\.io$/.test(location.hostname) || location.hostname === 'localhost')){
  const tinhaVersao = !!navigator.serviceWorker.controller;   // primeira visita não conta como "atualização"
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(reg => {
    /* o app instalado fica aberto em segundo plano por dias e o navegador só procura versão nova
       quando a página é carregada: então procura também sempre que o app volta pra frente */
    let ultima = Date.now();
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible' && Date.now() - ultima > 5 * 60 * 1000){ ultima = Date.now(); reg.update().catch(()=>{}); }
    });
  }).catch(()=>{}));

  /* versão nova assumiu: a página aberta ainda está com o CSS/JS antigo, então recarrega uma vez.
     Se tiver vídeo tocando, não interrompe: só avisa e recarrega quando a pessoa tocar */
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(!tinhaVersao || recarregou) return;
    const assistindo = document.querySelector('#player iframe[src^="http"]');   // fechar o player põe about:blank
    if(!assistindo || document.visibilityState === 'hidden'){ recarregou = true; location.reload(); return; }
    toast('Tem uma versão nova do Cinebruh! <button type="button" class="toast-act" onclick="location.reload()">Atualizar</button>', 15000);
  });
}

function showInstall(on){ document.querySelectorAll('.js-install').forEach(b => b.hidden = !on); }

/* Chrome, Edge, Android: o navegador avisa quando dá pra instalar */
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; showInstall(true); });
addEventListener('appinstalled', () => { installEvt = null; showInstall(false); toast('App instalado! Procure o Cinebruh na sua tela inicial 🦩'); });

/* iPhone/iPad: não tem botão automático, então mostramos o passo a passo */
if(isIOS && !isStandalone()) showInstall(true);

document.addEventListener('click', async e => {
  if(!e.target.closest('.js-install')) return;
  if(typeof closeSheet === 'function') closeSheet();
  if(installEvt){
    installEvt.prompt();
    const r = await installEvt.userChoice.catch(()=>null);
    if(r && r.outcome === 'accepted') showInstall(false);
    installEvt = null;
    return;
  }
  if(isIOS) toast('No Safari, toque em <b>Compartilhar</b> <span class="ios-share">⬆</span> e depois em <b>Adicionar à Tela de Início</b>.', 9000);
});

/* aviso rápido no rodapé da tela */
let toastTimer = null;
function toast(html, ms = 4500){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span>${html}</span><button type="button" aria-label="Fechar">✕</button>`;
  t.querySelector('button').onclick = () => t.classList.remove('show');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
