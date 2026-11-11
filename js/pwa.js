/* ===== Cinebruh · instalar como app (celular e computador) ===== */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvt = null;

/* o service worker só roda no site publicado (na prévia e em arquivos locais ele atrapalharia) */
if('serviceWorker' in navigator && (/\.github\.io$/.test(location.hostname) || location.hostname === 'localhost')){
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
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
