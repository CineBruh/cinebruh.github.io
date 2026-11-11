/* ===== Cinebruh · reacts offline: transmissão (câmera + conteúdo) à esquerda e chat da Twitch à direita =====
   Tudo vem de site.json → offline. As janelas da transmissão e do chat só carregam com a aba aberta
   (e saem ao trocar de aba, pra não ficar tocando escondido). */
let OFF = null;
let olTimer = null;
const OL_AGE_KEY = 'bru-18ok';
const OL_CHAT_KEY = 'bru-ol-chat';
const OL_HOST = location.hostname;   // a Twitch exige o endereço do site em "parent"

function olPlayerSrc(p){
  if(!p) return '';
  if(p.embed) return p.embed;
  if(!p.canal) return '';
  if(p.plataforma === 'kick') return `https://player.kick.com/${encodeURIComponent(p.canal)}?autoplay=true`;
  if(p.plataforma === 'twitch' && OL_HOST) return `https://player.twitch.tv/?channel=${encodeURIComponent(p.canal)}&parent=${OL_HOST}&autoplay=true`;
  return '';
}
function olPlayerLink(p){
  if(!p) return '';
  if(p.link) return p.link;
  if(!p.canal) return '';
  return {kick:`https://kick.com/${p.canal}`, twitch:`https://twitch.tv/${p.canal}`,
          loco:`https://loco.com/streamers/${p.canal}`}[p.plataforma] || '';
}
const OL_PLAT = {kick:'Kick', twitch:'Twitch', youtube:'YouTube', loco:'Loco'};
const olPlatName = p => (p && OL_PLAT[p.plataforma]) || 'na plataforma';
const olDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
const olChatSrc = () => OFF && OFF.chat && OL_HOST
  ? `https://www.twitch.tv/embed/${encodeURIComponent(OFF.chat)}/chat?parent=${OL_HOST}${olDark() ? '&darkpopout' : ''}` : '';
const olChatPopout = () => OFF && OFF.chat ? `https://www.twitch.tv/popout/${encodeURIComponent(OFF.chat)}/chat?popout=` : '';

/* horário da próxima sessão (sempre em horário de Brasília) */
function olWhen(px){
  if(!px || !px.data) return null;
  const t = Date.parse(`${px.data}T${px.hora || '23:00'}:00-03:00`);
  return isNaN(t) ? null : t;
}
function olCountdown(t){
  if(!t) return '';
  const diff = t - Date.now();
  if(diff <= 0) return diff > -4*3600e3 ? '🔴 Rolando agora!' : '';
  const m = Math.floor(diff/60e3), d = Math.floor(m/1440), h = Math.floor(m%1440/60), mi = m%60;
  if(d >= 1) return `⏰ Faltam ${d}d ${h}h`;
  return `⏰ Começa em ${h ? h+'h ' : ''}${mi}min`;
}
function olDateLabel(t){
  const tz = {timeZone:'America/Sao_Paulo'};
  const dia = new Date(t).toLocaleDateString('pt-BR', {...tz, weekday:'long', day:'numeric', month:'long'});
  const hora = new Date(t).toLocaleTimeString('pt-BR', {...tz, hour:'2-digit', minute:'2-digit'});
  return `${dia} · ${hora.replace(':00','h').replace(':','h')}`;
}
function olCalendar(px, t){
  const f = ms => new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const q = new URLSearchParams({
    action:'TEMPLATE', text:`React Offline: ${px.titulo} (Bruna Rodrigues)`,
    dates:`${f(t)}/${f(t + 3*3600e3)}`,
    details:`Sessão de react fora da live, com o chat da Twitch.\n${location.href.split('#')[0]}#/offline`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const olNeedsAge = () => OFF && OFF.proxima && String(OFF.proxima.classificacao) === '18' && localStorage.getItem(OL_AGE_KEY) !== '1';

/* ---------- conteúdo do quadro grande ---------- */
function olPlayerInner(){
  const px = OFF.proxima, t = olWhen(px);
  const src = olPlayerSrc(OFF.player);
  if(src && olNeedsAge()) return `<div class="ol-ph ol-gate">
      <span class="ol-ph-ic">🔞</span>
      <b>Conteúdo para maiores de 18 anos</b>
      <p>${esc((px && px.aviso) || 'Esta sessão tem conteúdo adulto.')}</p>
      <button class="cta" type="button" id="ol-age">Tenho 18 anos ou mais, assistir</button>
      <a class="ol-ph-link" href="#/catalogo" data-nav="catalogo">Voltar pro catálogo</a>
    </div>`;
  if(src) return `<iframe src="${esc(src)}" title="Transmissão do react offline" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
  /* sem player incorporável (ex.: Loco sem embed): o quadro vira um atalho pro canal */
  const link = olPlayerLink(OFF.player);
  return `<div class="ol-ph">
      <span class="ol-ph-ic">🎬</span>
      <b>${link ? `A transmissão é na ${esc(olPlatName(OFF.player))}` : 'A transmissão aparece aqui'}</b>
      ${px ? `<p>Próxima sessão: <strong>${esc(px.titulo)}</strong>${t ? `<br>${esc(olDateLabel(t))}` : ''}</p>` : '<p>Ainda não tem sessão marcada.</p>'}
      ${t && olCountdown(t) ? `<span class="cr-clock ol-clock">${olCountdown(t)}</span>` : ''}
      ${link ? `<a class="cta" href="${esc(link)}" target="_blank" rel="noopener">▶ Assistir na ${esc(olPlatName(OFF.player))}</a>
        <small class="ol-ph-hint">Abre numa aba nova. O chat da Twitch continua aqui do lado.</small>` : ''}
    </div>`;
}
function olChatInner(){
  const src = olChatSrc();
  if(src) return `<iframe src="${esc(src)}" title="Chat da Twitch"></iframe>`;
  return `<div class="ol-ph ol-ph-chat"><span class="ol-ph-ic">💬</span><b>Chat da Twitch</b>
    <p>O chat aparece aqui no site publicado.</p>
    ${olChatPopout() ? `<a class="cta alt" href="${olChatPopout()}" target="_blank" rel="noopener">Abrir o chat ↗</a>` : ''}</div>`;
}

function olMount(){
  if(!OFF) return;
  const pl = document.getElementById('ol-player'), ch = document.getElementById('ol-chat');
  if(pl && !pl.dataset.on){ pl.innerHTML = olPlayerInner(); pl.dataset.on = '1'; }
  if(ch && !ch.dataset.on){ ch.innerHTML = olChatInner(); ch.dataset.on = '1'; }
}
function olUnmount(){
  ['ol-player','ol-chat'].forEach(id=>{ const el = document.getElementById(id); if(el){ el.innerHTML = ''; delete el.dataset.on; } });
  setCinema(false);
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  clearInterval(olTimer);
}

/* ---------- modo cinema (esconde o menu do site) e tela cheia (transmissão + chat) ---------- */
function setCinema(on){
  document.body.classList.toggle('ol-cinema', on);
  const b = document.getElementById('ol-cinema');
  if(b){ b.classList.toggle('active', on); b.querySelector('span').textContent = on ? 'Sair do modo cinema' : 'Modo cinema'; }
}
function setChat(on){
  const w = document.getElementById('ol-wrap'); if(!w) return;
  w.classList.toggle('no-chat', !on);
  const b = document.getElementById('ol-chatbtn');
  if(b){ b.classList.toggle('active', !on); b.querySelector('span').textContent = on ? 'Esconder chat' : 'Mostrar chat'; }
  try{ localStorage.setItem(OL_CHAT_KEY, on ? '1' : '0'); }catch(e){}
}

/* ---------- a aba ---------- */
function renderOffline(site){
  OFF = site.offline || null;
  const el = document.getElementById('offline-box');
  if(!OFF){ el.innerHTML = '<div class="band"><div class="soon"><p>Em breve 💜</p></div></div>'; return; }
  const px = OFF.proxima, t = olWhen(px);
  const link = olPlayerLink(OFF.player), pop = olChatPopout();
  const canFs = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const chatOn = localStorage.getItem(OL_CHAT_KEY) !== '0';

  el.innerHTML = `
    <div class="ol${chatOn ? '' : ' no-chat'}" id="ol-wrap">
      <div class="ol-player" id="ol-player"></div>
      <aside class="ol-chat" id="ol-chat" aria-label="Chat da Twitch"></aside>
      <div class="ol-bar">
        <button class="ol-btn" type="button" id="ol-cinema" title="Esconde o menu do site"><b>🎞️</b><span>Modo cinema</span></button>
        ${canFs ? `<button class="ol-btn" type="button" id="ol-fs" title="Transmissão e chat em tela cheia"><b>⛶</b><span>Tela cheia</span></button>` : ''}
        <button class="ol-btn${chatOn ? '' : ' active'}" type="button" id="ol-chatbtn"><b>💬</b><span>${chatOn ? 'Esconder chat' : 'Mostrar chat'}</span></button>
        ${pop ? `<a class="ol-btn" href="${pop}" target="_blank" rel="noopener" title="Abre o chat da Twitch numa janela separada"><b>↗</b><span>Chat em janela</span></a>` : ''}
        ${link ? `<a class="ol-btn" href="${esc(link)}" target="_blank" rel="noopener"><b>↗</b><span>Abrir na ${esc(olPlatName(OFF.player))}</span></a>` : ''}
      </div>
    </div>

    <div class="band ol-info">
      <div class="band-head"><h2>Reacts Offline</h2><span class="kicker">Fora da Twitch</span></div>
      ${OFF.intro ? `<p class="band-sub">${esc(OFF.intro)}</p>` : ''}

      <div class="ol-cards">
        ${px ? `<div class="ol-next">
          <span class="mk-kicker">Próxima sessão</span>
          <h3 id="ol-next-t">${esc(px.titulo)}</h3>
          <div class="ol-badges">
            ${String(px.classificacao) === '18' ? '<span class="ol-age">18+</span>' : px.classificacao ? `<span class="ol-age a${esc(px.classificacao)}">${esc(px.classificacao)}</span>` : ''}
            ${px.cat && CAT_LABEL[px.cat] ? `<span class="chip">${CAT_LABEL[px.cat]}</span>` : ''}
            ${px.lang === 'dub' ? '<span class="chip">🎙️ Dublado</span>' : px.lang === 'leg' ? '<span class="chip">💬 Legendado</span>' : ''}
          </div>
          ${t ? `<p class="ol-when">📅 ${esc(olDateLabel(t))} <small>(Brasília)</small></p>` : ''}
          ${t && olCountdown(t) ? `<span class="cr-clock ol-clock">${olCountdown(t)}</span>` : ''}
          ${px.aviso ? `<p class="ol-warn">⚠️ ${esc(px.aviso)}</p>` : ''}
          ${px.patrocinador ? `<p class="cr-sp">💜 Patrocínio de <b>${esc(px.patrocinador)}</b></p>` : ''}
          <div class="cta-row" style="margin-top:14px">
            ${t && t > Date.now() ? `<a class="cta" href="${esc(olCalendar(px, t))}" target="_blank" rel="noopener">📅 Lembrar na agenda</a>` : ''}
            <a class="cta alt" href="https://discord.gg/MUs6NbZJ3r" target="_blank" rel="noopener">🔔 Avisos no Discord</a>
          </div>
        </div>` : ''}
        ${(OFF.comoFunciona||[]).length ? `<div class="mk-card"><h4>Como funciona</h4>
          <ol class="ol-steps">${OFF.comoFunciona.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      </div>

      <div id="ol-queue"></div>
    </div>`;

  /* botões */
  document.getElementById('ol-cinema').addEventListener('click', ()=> setCinema(!document.body.classList.contains('ol-cinema')));
  document.getElementById('ol-chatbtn').addEventListener('click', ()=> setChat(document.getElementById('ol-wrap').classList.contains('no-chat')));
  const fs = document.getElementById('ol-fs');
  if(fs) fs.addEventListener('click', ()=>{
    const w = document.getElementById('ol-wrap');
    if(document.fullscreenElement) document.exitFullscreen();
    else (w.requestFullscreen || w.webkitRequestFullscreen).call(w);
  });
  el.addEventListener('click', e=>{
    if(!e.target.closest('#ol-age')) return;
    try{ localStorage.setItem(OL_AGE_KEY, '1'); }catch(err){}
    const pl = document.getElementById('ol-player'); delete pl.dataset.on; olMount();
  });

  if(currentPage === 'offline') onRoute.offline();
}

/* obras marcadas como Off Live (⌧) no Drive */
function renderOfflineQueue(){
  const box = document.getElementById('ol-queue');
  if(!box || !DATA_READY) return;
  const list = DATA.filter(d => statusOf(d) === 'embreve');
  if(!list.length){ box.innerHTML = ''; return; }
  const nxt = OFF && OFF.proxima ? slugify(OFF.proxima.titulo) : '';
  box.innerHTML = `<h3 class="mk-h">Na fila do Off Live <span class="cm-count">${list.length}</span></h3>
    <div class="mk-cats">${list.map(d=>`<span class="chip${d._slug === nxt ? ' ol-chip-next' : ''}">${esc(d.em || '🎬')} ${esc(d.t)}${d._slug === nxt ? ' · próxima' : ''}</span>`).join('')}</div>`;
}

onRoute.offline = () => {
  olMount();
  clearInterval(olTimer);
  olTimer = setInterval(()=>{
    const t = OFF && olWhen(OFF.proxima);
    document.querySelectorAll('.ol-clock').forEach(k => k.textContent = olCountdown(t));
  }, 30e3);
};
onLeave.push(olUnmount);

document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && document.body.classList.contains('ol-cinema') && !document.fullscreenElement) setCinema(false); });

/* trocou o tema: recarrega o chat no tema certo */
new MutationObserver(()=>{
  const ch = document.getElementById('ol-chat');
  if(ch && ch.dataset.on && olChatSrc()){ ch.innerHTML = olChatInner(); }
}).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
