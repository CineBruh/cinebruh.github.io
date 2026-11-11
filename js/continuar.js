/* ===== Cinebruh · continuar assistindo: lembra em qual episódio a pessoa parou (só neste navegador) ===== */
const CONT_KEY = 'bru-cont';
const CONT_MAX = 60;
let CONT = contLoad();

function contLoad(){
  try{ const j = JSON.parse(localStorage.getItem(CONT_KEY) || '{}'); return j && typeof j === 'object' ? j : {}; }
  catch(e){ return {}; }
}
function contStore(){
  const old = Object.keys(CONT).sort((a,b) => CONT[b].ts - CONT[a].ts).slice(CONT_MAX);
  old.forEach(k => delete CONT[k]);
  try{ localStorage.setItem(CONT_KEY, JSON.stringify(CONT)); }catch(e){}
}
/* temporada no índice do data.json (o player só lista as temporadas que têm episódio) */
const contSi = st => st.seasons && st.seasons.length ? st.seasons[st.si].ri : 0;

/* chamado pelo player a cada episódio aberto */
function contSave(st){
  if(!st || !st.slug) return;
  const e = st.list[st.i]; if(!e) return;
  const si = contSi(st), p = CONT[st.slug] || {seen:{}};
  const seen = new Set(p.seen[si] || []); seen.add(e.n);
  p.seen[si] = [...seen]; p.si = si; p.n = e.n; p.ts = Date.now();
  CONT[st.slug] = p; contStore();
}
function contSeen(st, n){
  const p = st && st.slug && CONT[st.slug];
  return !!(p && (p.seen[contSi(st)] || []).includes(n));
}
const contGet = slug => CONT[slug] || null;

function contEps(it, si){
  const list = it.seasons && it.seasons.length ? ((it.seasons[si] || {}).ep || []) : (it.episodes || []);
  return list.filter(e => e && e.id);
}
/* obras com progresso, da mais recente pra mais antiga, sem as que já foram vistas inteiras */
function contList(){
  if(!DATA_READY) return [];
  return Object.entries(CONT).sort((a,b) => b[1].ts - a[1].ts).map(([slug, p]) => {
    const it = DATA.find(d => d._slug === slug);
    if(!it || !isPlayable(it)) return null;
    const eps = contEps(it, p.si); if(!eps.length) return null;
    const seen = (p.seen[p.si] || []).length;
    const seasons = it.seasons && it.seasons.length ? it.seasons.length : 1;
    const lastSeason = p.si >= seasons - 1;
    if(lastSeason && seen >= eps.length) return null;
    const i = eps.findIndex(e => e.n === p.n);
    const next = i >= 0 && eps[i+1] && (p.seen[p.si] || []).includes(p.n) ? eps[i+1] : null;
    return { it, p, eps, seen, seasons, next };
  }).filter(Boolean).slice(0, 12);
}

function contCard(c){
  const {it, p, eps, seen, seasons} = c;
  const grads = CAT_GRADS[it.cat] || CAT_GRADS.filmes, g = grads[(it._i || 0) % grads.length];
  const src = typeof coverSrc === 'function' ? coverSrc(it) : '';
  const sl = seasons > 1 ? `T${(it.seasons[p.si] && it.seasons[p.si].n) || p.si + 1} · ` : '';
  const pct = Math.round(seen / eps.length * 100);
  const ep = eps.find(e => e.n === p.n);
  const onde = ep && ep.l ? 'Parou no extra' : `Parou no ep ${p.n}`;   // extra (spin-off) não tem número de verdade
  return `<div class="ct-card">
    <a class="ct-link" href="${workHash(it, p.si, p.n)}" data-cont="${esc(it._slug)}" style="--c1:${g[0]};--c2:${g[1]}" title="Continuar ${esc(it.t)}">
      <span class="tl-em">${esc(it.em || '🎬')}</span>
      ${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <span class="ct-play">▶</span>
    </a>
    <div class="ct-tx">
      <b>${esc(it.t)}</b>
      <span>${sl}${onde}</span>
      <i class="ct-bar" title="${seen} de ${eps.length} episódios"><i style="width:${pct}%"></i></i>
    </div>
    <button class="ct-x" type="button" data-cont-rm="${esc(it._slug)}" aria-label="Tirar ${esc(it.t)} da lista" title="Tirar da lista">✕</button>
  </div>`;
}

/* desenha nas duas vitrines: no topo do catálogo (com o mesmo cabeçalho das prateleiras) e na Início */
function renderContinue(){
  const list = contList();
  const cards = list.map(contCard).join('');
  const html = list.length ? `<div class="ct-wrap">
      <div class="hx-h"><h2 class="home-sub">▶ Continuar assistindo</h2><span class="ct-note">Salvo só neste navegador</span></div>
      <div class="ct-row">${cards}</div></div>` : '';
  const catHtml = list.length ? `<section class="section" data-cat="cont">
      <div class="section-head"><span class="tag">▶ Continuar assistindo</span><span class="count">Salvo só neste navegador</span></div>
      <div class="ct-row">${cards}</div></section>` : '';
  let cat = document.getElementById('cont-cat');
  if(!cat && typeof shelves !== 'undefined'){ cat = document.createElement('div'); cat.id = 'cont-cat'; shelves.before(cat); }
  if(cat) cat.innerHTML = (typeof activeCat === 'undefined' || activeCat === 'todos') && !query ? catHtml : '';
  const home = document.getElementById('cont-home');
  if(home) home.innerHTML = html;
}

document.addEventListener('click', e => {
  const rm = e.target.closest('[data-cont-rm]');
  if(rm){ delete CONT[rm.dataset.contRm]; contStore(); renderContinue(); return; }
  const a = e.target.closest('a[data-cont]');
  if(!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  const it = DATA.find(d => d._slug === a.dataset.cont), p = contGet(a.dataset.cont);
  if(!it || !p) return;
  e.preventDefault();
  openWork(it, p.si, p.n);
});
