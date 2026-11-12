/* ===== Cinebruh · player embutido: assistir sem sair do site ===== */
const F = id => `https://drive.google.com/drive/folders/${id}`;      /* pasta (todos os eps) */
const V = id => `https://drive.google.com/file/d/${id}/view`;         /* arquivo único */

const player = document.createElement('div');
player.className = 'player'; player.id = 'player';
player.innerHTML = `
  <div class="player-box" role="dialog" aria-modal="true" aria-label="Player de vídeo">
    <div class="player-head">
      <span class="player-title"></span>
      <div class="player-actions">
        <button class="player-dl player-share" type="button" hidden title="Copiar o link direto pra este episódio">🔗 Compartilhar</button>
        <a class="player-dl" target="_blank" rel="noopener" hidden title="Baixar este vídeo pelo Google Drive">⬇ Baixar</a>
        <a class="player-drive" target="_blank" rel="noopener">Abrir no Drive ↗</a>
        <button class="player-close" type="button" aria-label="Fechar">✕</button>
      </div>
    </div>
    <div class="player-frame"><iframe allow="autoplay; fullscreen; encrypted-media" allowfullscreen referrerpolicy="no-referrer"></iframe></div>
    <div class="player-seasons" hidden></div>
    <div class="player-eps" hidden></div>
    <div class="player-ask" hidden></div>
    <div class="player-info" hidden></div>
    <div class="player-note"></div>
    <div class="player-fail" hidden>Não carregou ou está em branco? Seu navegador pode estar bloqueando cookies de terceiros — permita-os para este site ou use “Abrir no Drive” acima.</div>
  </div>`;
document.body.appendChild(player);
const playerTitle = player.querySelector('.player-title');
const playerFrame = player.querySelector('iframe');
const playerDrive = player.querySelector('.player-drive');
const playerNote  = player.querySelector('.player-note');
const playerFail  = player.querySelector('.player-fail');
const playerEps   = player.querySelector('.player-eps');
const playerSeasons = player.querySelector('.player-seasons');
const playerDl = player.querySelector('.player-dl');
const playerInfo = player.querySelector('.player-info');
const playerShare = player.querySelector('.player-share');
let playerWork = null;                                     // obra aberta (pra mostrar patrocinador e review)
/* algum episódio da obra tem o nick no Trello? Então o Trello diz episódio a episódio quem pagou,
   e episódio sem nick NÃO foi desse patrocinador (ex.: Frieren T1 foi do chat, só a T2 foi paga) */
const porEpisodio = it => (it.seasons||[]).some(s => (s.ep||[]).some(e => e.por)) || (it.episodes||[]).some(e => e.por);
/* embaixo do vídeo: quem patrocinou este episódio (ou a obra) e a review/nota da Bruh, tudo vindo do Trello */
function renderInfo(ep){
  const it = playerWork;
  if(!it){ playerInfo.hidden = true; playerInfo.innerHTML = ''; playerShare.hidden = true; return; }
  const por = (ep && ep.por) || (!ep || it.cat === 'filmes' ? (it.pat||[]).join(', ') : '');
  const parts = [];
  if(ep && ep.chat) parts.push(`<span class="pi-pat">🗳️ Escolha do chat</span>`);
  else if(por) parts.push(`<span class="pi-pat" title="Obrigada pelo patrocínio!">💜 Patrocínio: <b>${esc(por)}</b></span>`);
  else if(it.chat) parts.push(`<span class="pi-pat">🗳️ Escolha do chat</span>`);
  else if((it.pat||[]).length && !porEpisodio(it)) parts.push(`<span class="pi-pat pi-soft">💜 Patrocinadores da obra: ${esc(it.pat.join(', '))}</span>`);
  if(it.review || it.nota){
    const nota = it.nota ? `<span class="pi-nota">★ ${it.nota}</span>` : '';
    parts.push(it.review
      ? `<details class="pi-rev"><summary>📝 Review da Bruh ${nota}</summary><p>${esc(it.review)}</p></details>`
      : `<span class="pi-pat">Nota da Bruh ${nota}</span>`);
  }
  playerInfo.innerHTML = parts.join('');
  playerInfo.hidden = !parts.length;
  playerShare.hidden = !it._slug;
}
/* link direto do que está tocando agora: #/catalogo/obra/temporada/episódio */
function shareLink(){
  const it = playerWork; if(!it) return '';
  let si = 0, n = null;
  if(epState){
    const e = epState.list[epState.i]; n = e ? e.n : null;
    if(epState.seasons && epState.seasons[epState.si]) si = epState.seasons[epState.si].ri;
  }
  return location.origin + location.pathname + workHash(it, si, n);
}
function shareFeedback(txt){
  const old = playerShare.dataset.lbl || (playerShare.dataset.lbl = playerShare.textContent);
  playerShare.textContent = txt;
  clearTimeout(playerShare._t);
  playerShare._t = setTimeout(()=>{ playerShare.textContent = old; }, 1800);
}
playerShare.addEventListener('click', async ()=>{
  const url = shareLink(); if(!url) return;
  // no celular abre o menu de compartilhar do sistema (WhatsApp, Discord…); no PC só copia
  if(navigator.share && matchMedia('(hover:none)').matches){
    try{ await navigator.share({ title: playerTitle.textContent, url }); return; }
    catch(err){ if(err && err.name === 'AbortError') return; }
  }
  try{ await navigator.clipboard.writeText(url); shareFeedback('✓ Link copiado!'); }
  catch{
    const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove();
    shareFeedback(ok ? '✓ Link copiado!' : 'Não deu pra copiar');
  }
});
/* botão de baixar: liga/desliga em site.json → catalogo.download */
const dlOn = () => !(typeof SITE !== 'undefined' && SITE && SITE.catalogo && SITE.catalogo.download === false);
function setDownload(fileId){
  playerDl.hidden = !(fileId && dlOn());
  if(fileId) playerDl.href = `https://drive.google.com/uc?export=download&id=${fileId}`;
}
const durLabel = s => s ? (s >= 3600 ? `${Math.floor(s/3600)}h${String(Math.round(s%3600/60)).padStart(2,'0')}` : `${Math.round(s/60)} min`) : '';
let failTimer = null;
let epState = null;
let epDragged = false;
/* se o iframe carregar (mesmo página de erro do Drive), some com o aviso de falha */
playerFrame.addEventListener('load', ()=>{ clearTimeout(failTimer); playerFail.hidden = true; });

/* helper: carrega uma URL no iframe e arma o aviso de falha */
function setFrame(src){
  playerFail.hidden = true;
  clearTimeout(failTimer);
  playerFrame.src = src;
  failTimer = setTimeout(()=>{ playerFail.hidden = false; }, 7000);
}
function showModal(){ player.classList.add('open'); document.body.classList.add('noscroll'); }
const playerOpen = () => player.classList.contains('open');

/* ----- modo lista de episódios ----- */
function renderEps(){
  if(!epState){ playerEps.hidden = true; playerEps.innerHTML = ''; return; }
  playerEps.hidden = false;
  playerEps.innerHTML = epState.list.map((e,idx)=>{
    const seen = typeof contSeen === 'function' && contSeen(epState, e.n);
    const cls = 'pep' + (idx===epState.i?' active':'') + (seen?' seen':'');
    const name = e.l || `Episódio ${e.n}`;               // "l" = extra sem número (ex.: spin-off)
    const tip = (e.sr ? `${name} — sem reação (disponível)` : name) + (e.d ? ` · ${durLabel(e.d)}` : '') + (seen ? ' · já assistido' : '');
    return `<button class="${cls}${e.l?' pep-x':''}" data-i="${idx}" title="${esc(tip)}">${e.l ? '✦ Extra' : e.n}</button>`;
  }).join('');
  const act = playerEps.querySelector('.pep.active');
  if(act) act.scrollIntoView({inline:'center', block:'nearest'});
}
/* abas de temporada (só aparecem quando há mais de uma temporada catalogada) */
function renderSeasons(){
  if(!epState || !epState.seasons || epState.seasons.length < 2){ playerSeasons.hidden = true; playerSeasons.innerHTML = ''; return; }
  playerSeasons.hidden = false;
  playerSeasons.innerHTML = epState.seasons.map((s,si)=>`<button class="psn${si===epState.si?' active':''}" data-si="${si}" type="button">${s.label}</button>`).join('');
}
function selectSeason(si){
  if(!epState || !epState.seasons || !epState.seasons[si]) return;
  epState.si = si;
  epState.list = epState.seasons[si].list;
  renderSeasons();
  playEp(0);
}
function playEp(idx){
  if(!epState) return;
  const e = epState.list[idx];
  if(!e) return;
  epState.i = idx;
  const sLabel = (epState.seasons && epState.seasons.length) ? epState.seasons[epState.si].label : '';
  playerTitle.textContent = `${epState.title}${sLabel?` — ${sLabel}`:''} — ${e.l || 'Ep ' + e.n}${e.d ? ` · ${durLabel(e.d)}` : ''}`;
  playerDrive.href = `https://drive.google.com/file/d/${e.id}/view`;
  setDownload(e.id);
  playerNote.textContent = ''; playerNote.style.display = 'none';
  setFrame(`https://drive.google.com/file/d/${e.id}/preview`);
  if(typeof contSave === 'function') contSave(epState);   // lembra onde parou (continuar assistindo)
  if(typeof renderAsk === 'function') renderAsk(epState);   // "Quer o próximo episódio?"
  renderInfo(e);
  renderEps();
}
/* posição do episódio "n" na lista (ou o primeiro, se não achar) */
const epIndex = (list, n) => { const i = n ? list.findIndex(e=>e.n===n) : -1; return i >= 0 ? i : 0; };
function openEpisodes(title, episodes, folderUrl, slug, startN){
  const list = (episodes||[]).filter(e=>e && e.id);
  if(!list.length){ if(folderUrl) openPlayer(folderUrl, title); return; }
  epState = { title: title||'', slug, list, i: 0 };
  showModal();
  renderSeasons();
  playEp(epIndex(list, startN));
}
/* abre uma obra com temporadas no player, com abas pra trocar de temporada sem sair do site */
function openSeasonsPlayer(it, startSi, startN){
  const seasons = (it.seasons||[])
    .map((s,ri)=>({ raw:s, ri, label: s.l || ('T'+s.n), list: (s.ep||[]).filter(e=>e && e.id) }))
    .filter(s=>s.list.length);
  if(!seasons.length){ openPlayer(it.url, it.t); return; }   // nenhuma temporada catalogada ainda → grade da pasta
  let si = 0;
  if(startSi!=null && it.seasons[startSi]){
    const idx = seasons.findIndex(s=>s.raw===it.seasons[startSi]);
    if(idx>=0) si = idx;
  }
  epState = { title: it.t, slug: it._slug, seasons, si, list: seasons[si].list, i: 0 };
  showModal();
  renderSeasons();
  playEp(epIndex(seasons[si].list, startN));
}

/* ----- modo arquivo único / pasta ----- */
function openPlayer(url, title){
  if(!url) return;
  epState = null; renderEps(); renderSeasons();
  if(typeof renderAsk === 'function') renderAsk(null);
  const file = url.match(/\/file\/d\/([^/]+)/);
  const folder = url.match(/\/folders\/([^/?#]+)/);
  let src = '', note = '';
  if(file){
    src = `https://drive.google.com/file/d/${file[1]}/preview`;
  } else if(folder){
    src = `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`;
    note = 'Vários episódios nesta pasta — clique em um arquivo para assistir.';
  } else {
    window.open(url, '_blank', 'noopener'); return;
  }
  playerTitle.textContent = title || '';
  playerDrive.href = url;
  setDownload(file ? file[1] : null);   // pasta inteira não dá pra baixar por aqui
  playerNote.textContent = note;
  playerNote.style.display = note ? '' : 'none';
  setFrame(src);
  renderInfo(null);
  showModal();
}
/* fecha só a janela (sem mexer no endereço) */
function closePlayer(){
  clearTimeout(failTimer);
  playerFail.hidden = true;
  epState = null; renderEps(); renderSeasons();
  playerWork = null; renderInfo(null);
  player.classList.remove('open');
  document.body.classList.remove('noscroll');
  playerFrame.src = 'about:blank';
  if(typeof renderContinue === 'function') renderContinue();   // atualiza "Continuar assistindo"
}
/* fechar pelo ✕, pelo fundo ou pelo Esc: se a obra foi aberta por um clique no site, volta no histórico
   (assim o "voltar" do celular também fecha o player); se veio de um link compartilhado, só limpa o endereço */
function requestClosePlayer(){
  if(/^#\/catalogo\/./.test(location.hash)){
    if(history.state && history.state.cbModal){ history.back(); return; }
    history.replaceState(null, '', '#/catalogo');
  }
  closePlayer();
}
onLeave.push(()=>{ if(playerOpen()) closePlayer(); });

player.addEventListener('click', e=>{ if(e.target.closest('.player-close')) requestClosePlayer(); });
/* clicar em qualquer lugar fora da janela fecha o player (inclusive em cima do menu lateral).
   Só conta se o clique COMEÇOU fora: arrastar a faixa de episódios e soltar fora não fecha. */
let downOutside = false;
document.addEventListener('pointerdown', e=>{ downOutside = playerOpen() && !e.target.closest('.player-box'); }, true);
document.addEventListener('click', e=>{
  const out = downOutside && playerOpen() && !e.target.closest('.player-box');
  downOutside = false;
  if(!out) return;
  e.preventDefault(); e.stopPropagation();
  requestClosePlayer();
}, true);
playerEps.addEventListener('click', e=>{ if(epDragged){ epDragged=false; return; } const b = e.target.closest('.pep'); if(b) playEp(Number(b.dataset.i)); });
playerSeasons.addEventListener('click', e=>{ const b = e.target.closest('.psn'); if(b) selectSeason(Number(b.dataset.si)); });
/* arrastar a faixa de episódios com o mouse (esquerda/direita) */
let epDown=false, epStartX=0, epStartLeft=0;
playerEps.addEventListener('pointerdown', e=>{ if(e.pointerType && e.pointerType!=='mouse') return; epDown=true; epDragged=false; epStartX=e.clientX; epStartLeft=playerEps.scrollLeft; playerEps.classList.add('grabbing'); });
playerEps.addEventListener('pointermove', e=>{ if(!epDown) return; const dx=e.clientX-epStartX; if(Math.abs(dx)>4) epDragged=true; playerEps.scrollLeft=epStartLeft-dx; });
const epEnd=()=>{ epDown=false; playerEps.classList.remove('grabbing'); };
playerEps.addEventListener('pointerup', epEnd);
playerEps.addEventListener('pointerleave', epEnd);
playerEps.addEventListener('pointercancel', epEnd);
document.addEventListener('keydown', e=>{
  if(!playerOpen()) return;
  if(e.key==='Escape'){ requestClosePlayer(); return; }
  if(epState && (e.key==='ArrowRight' || e.key==='ArrowLeft')){
    const j = epState.i + (e.key==='ArrowRight' ? 1 : -1);
    if(epState.list[j]) playEp(j);
  }
});
