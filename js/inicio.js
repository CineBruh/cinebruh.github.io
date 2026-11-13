/* ===== Cinebruh · início: apresentação do canal e links (estilo linktree), a partir do site.json ===== */
const BRAND = {
  twitch:    { bg:'#9146FF', svg:'<path fill="currentColor" d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>' },
  kick:      { bg:'#53FC18', fg:'#0c0f07', svg:'<path fill="currentColor" d="M4 3h5.5v6.2L15 3h6.6l-7.1 8.9L22 21h-6.8l-4.2-6.4-1.5 1.9V21H4z"/>' },
  instagram: { bg:'#E1306C', svg:'<g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>' },
  tiktok:    { bg:'#111',    svg:'<path fill="currentColor" d="M16.6 5.8a4.3 4.3 0 01-1-2.8h-3.2v12.9a2.6 2.6 0 11-1.8-2.5V9.9a5.8 5.8 0 00-.8-.05 5.86 5.86 0 105.86 5.86V8.9a7.5 7.5 0 004.34 1.4V7.1a4.3 4.3 0 01-3.4-1.3z"/>' },
  youtube:   { bg:'#FF0000', svg:'<path fill="currentColor" d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/>' },
  x:         { bg:'#111',    svg:'<path fill="currentColor" d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/>' },
  threads:   { bg:'#111',    txt:'@' },
  discord:   { bg:'#5865F2', svg:'<path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0015.4 2.85a.07.07 0 00-.08.04c-.2.38-.44.87-.6 1.25a18.3 18.3 0 00-5.42 0c-.17-.4-.4-.87-.62-1.25a.08.08 0 00-.08-.04A19.7 19.7 0 003.7 4.4a.07.07 0 00-.03.02C.53 9.05-.32 13.6.1 18.1a.08.08 0 00.03.05 19.9 19.9 0 006 3.03.08.08 0 00.08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 00-.04-.11c-.65-.25-1.27-.55-1.87-.89a.08.08 0 01-.01-.13l.37-.29a.07.07 0 01.08-.01 14.2 14.2 0 0012.06 0 .07.07 0 01.08.01l.37.29a.08.08 0 01-.01.13c-.6.35-1.22.64-1.87.89a.08.08 0 00-.04.11c.36.7.78 1.36 1.23 2a.08.08 0 00.08.03 19.8 19.8 0 006-3.03.08.08 0 00.04-.05c.5-5.18-.84-9.69-3.56-13.7a.06.06 0 00-.03-.02zM8.02 15.4c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z"/>' },
  steam:     { bg:'#1b2838', svg:'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/></g><circle cx="15.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="17.8" cy="13.8" r="1.2" fill="currentColor"/>' },
  email:     { bg:'#ae4c78', svg:'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/></g>' },
  whatsapp:  { bg:'#25D366', svg:'<path fill="currentColor" d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.3a.4.4 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.9 11.9 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/>' },
  parede:    { bg:'#ff68b4', txt:'💗' },
  mine:      { bg:'#3c8527', txt:'⛏️' },
  loja:      { bg:'#f5a524', txt:'☕' },
  caixapostal:{ bg:'#ae4c78', txt:'💌' },
};
const EXTRA_EMOJI = {trello:'📋', ymp:'🎬', drive:'🗂️'};

function brandIcon(id){
  const b = BRAND[id] || { bg:'var(--accent)', txt:'🔗' };
  const inner = b.svg ? `<svg viewBox="0 0 24 24" aria-hidden="true">${b.svg}</svg>` : `<span>${b.txt}</span>`;
  return `<span class="lic" style="background:${b.bg};color:${b.fg||'#fff'}">${inner}</span>`;
}
function linkHTML(l){
  const ext = /^https?:/.test(l.url);
  return `<a class="lt lt-${esc(l.id)}${l.destaque?' destaque':''}" href="${esc(l.url)}"${ext?' target="_blank" rel="noopener"':''}>
    ${brandIcon(l.id)}
    <span class="ltx"><b>${esc(l.nome)}</b><span>${esc(l.user||'')}</span></span>
    <span class="arr">↗</span></a>`;
}

function renderHome(site){
  const c = site.canal || {};
  const av = c.imagens && c.imagens.avatar;
  const avPos = (c.imagens && c.imagens.avatarPos) || 'center';
  const banner = c.imagens && c.imagens.banner;
  const chips = [c.horario && `🌙 ${c.horario}`, c.local && `📍 ${c.local}`, c.comunidade && `🦩 ${c.comunidade}`].filter(Boolean);
  /* com banner, o @ já está na arte dele: embaixo do nome fica só idade e altura */
  const idInfo = [!banner && c.handle && `@${esc(c.handle)}`, c.idade && `${c.idade} anos`,
    c.altura && `<span class="home-alt" title="${esc(c.alturaDica||'')}">📏 ${esc(c.altura)}</span>`].filter(Boolean);
  document.getElementById('home').innerHTML = `
    ${banner ? `<div class="home-banner"><img src="${esc(banner)}" alt="" onload="nomeSobreBanner()" onerror="this.parentNode.remove();nomeSobreBanner()"></div>` : ''}
    <div class="home-card">
      <div class="home-avatar">${av ? `<img src="${esc(av)}" alt="${esc(c.nome)}" style="object-position:${esc(avPos)}" onerror="this.remove()">` : ''}🦩</div>
      <div class="home-id">
        <h1>${esc(c.nome || 'Cinebruh')}</h1>
        ${idInfo.length ? `<div class="home-handle">${idInfo.join(' · ')}</div>` : ''}
      </div>
    </div>
    ${c.slogan ? `<p class="home-slogan">${esc(c.slogan)}</p>` : ''}
    ${c.descricao ? `<p class="home-desc">${esc(c.descricao)}</p>` : ''}
    ${chips.length ? `<div class="home-chips">${chips.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="cta-row">
      <a class="cta" href="#/catalogo" data-nav="catalogo">▶ Ver os reacts</a>
      <a class="cta alt" href="#/patrocinar" data-nav="patrocinar">Peça um react</a>
    </div>
    <div id="home-extra"></div>
    ${(site.links||[]).length ? `<h2 class="home-sub">Onde encontrar a Bruh</h2><div class="ltree">${site.links.map(linkHTML).join('')}</div>` : ''}
    ${(site.extras||[]).length ? `<h2 class="home-sub">Mais do Cinebruh</h2><div class="link-grid">${site.extras.map(x=>
      `<a class="link-tile" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="ic">${EXTRA_EMOJI[x.id]||'🔗'}</span><span class="txt"><b>${esc(x.nome)}</b><span>${esc(x.desc||'')}</span></span></a>`
    ).join('')}</div>` : ''}`;
  renderHomeExtra();
  nomeSobreBanner();
}

/* o nome está em cima do banner? Mede na tela em vez de supor: no celular o nome pode quebrar pra baixo da foto,
   e se a imagem do banner não carregar ela some. Conta como "em cima" quando o meio do nome fica acima da borda de baixo do banner */
function nomeSobreBanner(){
  const h1 = document.querySelector('#home .home-id h1'); if(!h1) return;
  const bn = document.querySelector('#home .home-banner');
  let sobre = false;
  if(bn && bn.offsetParent){
    const b = bn.getBoundingClientRect(), n = h1.getBoundingClientRect();
    sobre = n.top + n.height / 2 < b.bottom && n.left < b.right;
  }
  h1.classList.toggle('sobre-banner', sobre);
}
let nsbTimer;
addEventListener('resize', () => { clearTimeout(nsbTimer); nsbTimer = setTimeout(nomeSobreBanner, 120); });
/* a Início pode ter sido desenhada escondida (abrindo direto noutra aba): mede de novo quando ela aparece */
addEventListener('hashchange', () => setTimeout(nomeSobreBanner, 50));
if(document.fonts && document.fonts.ready) document.fonts.ready.then(nomeSobreBanner);

/* ---------- Início: live aqui mesmo, próxima live (do cronograma) e favoritas da Bruh (nota 10) ----------
   Chamada de novo quando o catálogo e o cronograma terminam de carregar. */
const HX_CHANNEL = 'brunarodrigues';
function hxNextLive(){
  if(typeof CRONO === 'undefined' || !CRONO) return null;
  const today = brToday();
  const d = (CRONO.dias||[]).find(d => d.data >= today && !d.folga && (d.itens||[]).some(i => i.status !== 'cancelado'));
  if(!d) return null;
  const diff = dayDiff(d.data, today), info = dayInfo(d.data);
  return {
    label: `${diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : info.dia}${(d.hora || CRONO.horario) ? ', ' + (d.hora || CRONO.horario) : ''}`,
    itens: d.itens.filter(i => i.status !== 'cancelado'),
    exemplo: CRONO.exemplo,
  };
}
function renderHomeExtra(){
  const el = document.getElementById('home-extra'); if(!el) return;
  const favs = DATA_READY ? DATA.filter(d => d.nota >= 10 && d.cat !== 'vods').sort((a,b) => a.t.localeCompare(b.t, 'pt')) : [];
  const nx = hxNextLive();
  el.innerHTML = `
    <div class="hx-live">
      <div class="hx-player" id="hx-player">${hxPlayButton()}</div>
      <div class="hx-next">
        <span class="mk-kicker">Próxima live${nx && nx.exemplo ? ' <span class="mk-ex">exemplo</span>' : ''}</span>
        ${nx ? `<h3>${esc(nx.label)}</h3><ul>${nx.itens.map(i => `<li>${esc(i.titulo)}${i.eps ? ` · ${esc(i.eps)}` : ''}</li>`).join('')}</ul>`
             : '<h3>Todo dia, a partir das 23h</h3><ul><li>Reacts, jogos e muito papo com o chat</li></ul>'}
        <a class="mk-link" href="#/cronograma" data-nav="cronograma">Ver o cronograma →</a>
      </div>
    </div>
    <div id="cont-home"></div>
    ${favs.length ? `<div class="hx-favs">
      <div class="hx-h"><h2 class="home-sub">⭐ Favoritas da Bruh <span class="cm-count">${favs.length}</span></h2>
        <a class="mk-link" href="#/tierlist" data-nav="tierlist">Ver a tier list →</a></div>
      <div class="hx-row">${favs.map(it => tlItem(it, {link:true, nota:true})).join('')}</div>
    </div>` : ''}`;
  renderContinue();
}
const hxPlayButton = () => `<button class="hx-play" type="button" id="hx-play"><span>▶</span><b>Assistir a live aqui</b><small>Twitch · só carrega quando você clicar</small></button>`;

document.getElementById('home').addEventListener('click', e => {
  if(!e.target.closest('#hx-play')) return;
  const p = document.getElementById('hx-player');
  p.innerHTML = `<iframe src="https://player.twitch.tv/?channel=${HX_CHANNEL}&parent=${location.hostname}&autoplay=true" title="Live da Bruna na Twitch" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  p.dataset.on = '1';
});
/* saiu da Início: para a live */
onLeave.push(() => { const p = document.getElementById('hx-player'); if(p && p.dataset.on){ p.innerHTML = hxPlayButton(); delete p.dataset.on; } });
function failHome(err){
  console.error('Falha ao carregar site.json:', err);
  document.getElementById('home').innerHTML = `
    <div class="home-card"><div class="home-avatar">🦩</div><div class="home-id"><h1>Bruna Rodrigues</h1></div></div>
    <div class="cta-row">
      <a class="cta" href="#/catalogo" data-nav="catalogo">▶ Ver os reacts</a>
      <a class="cta alt" href="https://twitch.tv/brunarodrigues" target="_blank" rel="noopener">Twitch ↗</a>
    </div>`;
}
