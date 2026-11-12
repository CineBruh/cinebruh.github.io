/* ===== Cinebruh · catálogo: filtros, prateleiras de capas e link direto pra cada obra ===== */
const CAT_LABEL = {animes:"Animes",filmes:"Filmes",series:"Séries",tokusatsu:"Tokusatsu",animacoes:"Animações",vods:"VODs"};
const ORDER = ["animes","filmes","series","tokusatsu","animacoes","vods"];
const CAT_GRADS = {
  animes:[["#ff68b4","#7A1846"],["#FF6FB0","#8A2A5A"],["#B15CFF","#521C86"],["#FF477E","#7A1638"],["#F55D3E","#7A2416"]],
  filmes:[["#E63946","#7B1E27"],["#FF6B35","#7A2E12"],["#C1121F","#5A0A10"],["#FF4D6D","#7A1830"]],
  series:[["#1D6FE0","#0A2E63"],["#3A86FF","#173F8A"],["#00A8E8","#004E6B"],["#4361EE","#1A2A7A"]],
  tokusatsu:[["#FF7A00","#7A3A00"],["#FB5607","#7A2A00"],["#FF9E00","#7A4B00"]],
  animacoes:[["#0FA958","#08542C"],["#12B886","#075E45"],["#06A77D","#054D3A"],["#38B000","#1A5200"]],
  vods:[["#7B2FF7","#3A1370"],["#B84DFF","#4A1C7A"]],
};

/* catálogo vem de data.json (gerado pelo robô a partir do Drive) */
let DATA = [], LANG_MAP = {}, IMG_MAP = {}, DATA_READY = false;

const shelves = document.getElementById('shelves');
const searchEl = document.getElementById('search');
let activeCat = 'todos', activeLang = 'all', activeStatus = 'all', activeSort = 'padrao', query = '';

/* busca: ignora acento, maiúscula e pontuação, e procura também nos outros nomes da obra (original, inglês, romaji…).
   Mantém letras de qualquer alfabeto (japonês, coreano…), não só a–z. */
const normQ = s => String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const searchKey = it => it._q || (it._q = normQ([it.t, ...(it.aka||[])].join(' | ')));
/* nome alternativo que bateu com a busca (pra mostrar "também conhecido como") */
function akaHit(it){
  if(!query || !(it.aka||[]).length) return '';
  const q = normQ(query);
  if(normQ(it.t).includes(q)) return '';
  return it.aka.find(a => normQ(a).includes(q)) || '';
}

/* datas e selo de novidade */
const lastDate = it => [it.upd, it.add].filter(Boolean).sort().pop() || '';
const NOVO_DIAS = () => (typeof SITE !== 'undefined' && SITE && SITE.catalogo && SITE.catalogo.novoDias) || 7;
function isNew(it){
  const d = lastDate(it); if(!d) return '';
  const dias = (Date.now() - Date.parse(d + 'T12:00:00-03:00')) / 864e5;
  if(dias > NOVO_DIAS()) return '';
  return it.upd && it.add && it.upd > it.add && it.cat !== 'filmes' ? 'Ep novo' : 'Novo';
}

/* ordenação dentro de cada categoria ("padrão" = a ordem do Trello).
   Clicar de novo na mesma ordem inverte (crescente ⇄ decrescente). Quem não tem o dado da ordem
   (sem nota, não é novidade, sem ano) fica sempre no fim e aparece apagado, pra destacar os que têm. */
let sortDir = 1;                                   // 1 = o jeito natural (maior nota, mais novo, A→Z); -1 = invertido
const SORTS = {
  padrao: null,
  novos: (a,b) => lastDate(b).localeCompare(lastDate(a)) || a._i - b._i,
  nota:  (a,b) => (b.nota||0) - (a.nota||0) || a.t.localeCompare(b.t, 'pt'),
  ano:   (a,b) => (b.ano||0) - (a.ano||0) || a.t.localeCompare(b.t, 'pt'),
  az:    (a,b) => a.t.localeCompare(b.t, 'pt', {sensitivity:'base'}),
};
const SORT_HAS = { novos: it => !!isNew(it), nota: it => it.nota != null, ano: it => !!it.ano };
const SORT_DIR_LBL = { novos:['mais novos','mais antigos'], nota:['maior nota','menor nota'], ano:['mais recentes','mais antigos'], az:['A→Z','Z→A'] };
function sortItems(items){
  const cmp = SORTS[activeSort]; if(!cmp) return;
  const has = SORT_HAS[activeSort];
  items.sort((a,b) => {
    if(has){ const ha = has(a), hb = has(b); if(ha !== hb) return ha ? -1 : 1; }
    return sortDir * cmp(a,b);
  });
}

/* duração total (segundos) de uma obra, somando os episódios que o Drive informou */
function workSecs(it){
  if(it.d) return it.d;
  const eps = it.seasons && it.seasons.length ? it.seasons.flatMap(s => s.ep || []) : (it.episodes || []);
  return eps.reduce((s,e) => s + (e.sr ? 0 : (e.d || 0)), 0);   // "sem reação" não conta como react
}
const fmtDur = s => { const h = Math.floor(s/3600), m = Math.round(s%3600/60); return h ? `${h}h${m ? String(m).padStart(2,'0') : ''}` : `${m} min`; };

function statusOf(it){
  const base = it.status || ((it.cat==='filmes' || it.cat==='vods') ? 'completo' : 'assistindo');
  // obra com temporadas vira "concluída" quando TODAS as temporadas estão completas (verdes)
  // e a obra não está "em aberto". Se alguma estiver em andamento (amarela) ou na fila (vazia), não.
  // Quando o status vem do Trello (tr), vale a lista do cartão e o site não adivinha.
  if(base==='assistindo' && !it.tr && !it.aberto && it.seasons && it.seasons.length && it.seasons.every(s=>s.s==='g')){
    return 'completo';
  }
  return base;
}
/* tem react gravado de verdade? A pasta pode existir no Drive só com a temporada vazia (ex.: obra em aberto
   que ainda não começou) ou só com o original "(SEM REAÇÃO)": aí não tem o que assistir. */
function hasReact(it){
  if(!it.url) return false;
  if(it.seasons && it.seasons.length) return it.seasons.some(s => (s.ep||[]).some(e => !e.sr));
  if(it.episodes && it.episodes.length) return it.episodes.some(e => !e.sr);
  return it.cat==='filmes' || it.cat==='vods' || !it.tr;   // filme/VOD é um vídeo só; obra antiga sem lista de eps confia no link
}
const isPlayable = it => hasReact(it) && statusOf(it)!=='embreve';   // "Off Live" ainda não tem reação pra assistir
/* obra na fila já paga inteira (o robô marca "pago" pelo Trello; filme é sempre pago inteiro):
   não tem o que pedir, só esperar a vez no cronograma */
const paidQueue = it => statusOf(it)==='fila' && (it.pago || it.cat==='filmes');
const SEG_MAX = 6;                                                 // acima disso, as temporadas viram uma faixa compacta
function matches(it){
  if(activeCat!=='todos' && it.cat!==activeCat) return false;
  if(activeStatus!=='all'){
    if(activeStatus==='aberto'){ if(!it.aberto) return false; }
    else if(statusOf(it)!==activeStatus) return false;
  }
  if(activeLang!=='all'){
    const lg = it.lang || LANG_MAP[it.t];
    if(!lg) return false;
    if(lg!=='both' && lg!==activeLang) return false;
  }
  if(!query) return true;
  const q = normQ(query);
  return !q || searchKey(it).includes(q);
}

function capHTML(it, i){
  const g = CAT_GRADS[it.cat][i % CAT_GRADS[it.cat].length];
  const st = statusOf(it);
  const ST = {completo:["✓ Completo","st-completo"], assistindo:["Assistindo","st-assistindo"], fila:["Na fila","st-fila"], embreve:["Off Live","st-embreve"], incompleto:["Incompleto","st-inc"]};
  const stKey = it.incomplete ? 'incompleto' : st;
  const meta = ST[stKey] || ST.assistindo;
  const badge = `<span class="cap-badge ${meta[1]}">${meta[0]}</span>`;
  const open = it.aberto ? `<span class="cap-open" data-pedir role="button" title="Patrocinar os próximos episódios">💰 Patrocine</span>` : '';
  const nv = isNew(it);
  const novo = nv ? `<span class="cap-new">🆕 ${nv}</span>` : '';
  const pausa = it.pausa ? `<span class="cap-new cap-pausa" title="Pausada por enquanto">⏸ Em pausa</span>` : '';
  const LANG = {dub:"🎙️ Dub", leg:"💬 Leg", both:"Dub + Leg"};
  const lgv = it.lang || LANG_MAP[it.t];
  const lang = lgv ? `<span class="cap-lang">${LANG[lgv]}</span>` : '';
  const imgFile = IMG_MAP[it.t] || it.img;
  const imgSrc = imgFile ? (/^https?:\/\//.test(imgFile) ? imgFile : `images/${imgFile}`) : '';
  const art = `<span class="em">${it.em}</span>` + (imgFile ? `<img src="${imgSrc}" alt="${it.t}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '');
  let info = '';
  if(it.seasons && it.seasons.length > SEG_MAX){
    // muitas temporadas: uma faixa fininha (uma risca por temporada) + o total, pra não tomar a capa toda
    const n = k => it.seasons.filter(s=>s.s===k).length;
    const tip = `${it.seasons.length} temporadas — ${n('g')} completa(s), ${n('y')} em andamento, ${n('r')} na fila`;
    info = `<div class="cap-meta" title="${tip}"><span class="cap-eps">${it.seasons.length} temporadas</span>`
         + `<span class="seg-bar">${it.seasons.map(s=>`<i class="${s.s}"></i>`).join('')}</span></div>`;
  } else if(it.seasons && it.seasons.length){
    const desc = {g:'completa',y:'em andamento',r:'vazia / faltando'};
    const segs = it.seasons.map((s,si)=>{
      const label = s.l || ('T'+s.n);
      return (s.id && s.s!=='r')
        ? `<span class="seg ${s.s} clik" data-si="${si}" data-url="${F(s.id)}" title="Assistir ${label}">${label}</span>`
        : `<span class="seg ${s.s}" title="${label} — ${desc[s.s]||''}">${label}</span>`;
    }).join('');
    info = `<div class="cap-meta">${segs}</div>`;
  } else if(it.eps && it.cat!=='filmes'){
    info = `<div class="cap-meta"><span class="cap-eps" title="Episódios disponíveis no Drive">▦ ${it.eps} ep${it.eps>1?'s':''}</span></div>`;
  } else {
    // sem temporada/episódio: reserva a mesma altura pra o título não ficar atrás da nota/idioma
    info = `<div class="cap-meta" aria-hidden="true"><span class="seg ghost">&nbsp;</span></div>`;
  }
  const nota = it.nota ? `<span class="cap-nota" title="Nota da Bruna">★<b>${it.nota}</b></span>` : '';
  const tr = lang ? `<div class="cap-tr">${lang}</div>` : '';
  const br = nota ? `<div class="cap-br">${nota}</div>` : '';
  const playable = isPlayable(it);
  const pago = paidQueue(it);
  const hover = playable ? (it.cat==='vods'?'▶ Assistir':(it.incomplete?'▶ Ver parcial':'▶ Ver reações')) : (st==='embreve'?'Off Live · ver sessões':(pago||it.pago?'📅 Já patrocinado · ver a fila':st==='fila'?'💰 Quero esse react':'⏳ React em breve · patrocine'));
  const ask = st==='fila' && it.cat!=='vods' && !pago ? `<span class="cap-ask" data-pedir role="button">💰 Peça esse react</span>` : '';
  const aka = akaHit(it);
  const secs = workSecs(it);
  const pat = (it.pat||[]).length ? `💜 ${it.pat.slice(0,2).join(', ')}${it.pat.length>2 ? ` +${it.pat.length-2}` : ''}` : '';
  const extra = [it.ano, secs >= 60 ? fmtDur(secs) : '', pat].filter(Boolean).map(esc).join(' · ');
  const inner = `
      <div class="cap-art" style="--c1:${g[0]};--c2:${g[1]}">
        ${art}
        <div class="cap-tl">${badge}${open}${pausa}${novo}</div>
        ${tr}
        ${br}
        <div class="cap-scrim"><div class="cap-title">${it.t}</div>${aka ? `<div class="cap-aka">${esc(aka)}</div>` : ''}${info}${ask}</div>
        <div class="cap-hover"><span>${hover}</span>${extra ? `<small>${extra}</small>` : ''}</div>
      </div>`;
  const dim = SORT_HAS[activeSort] && !SORT_HAS[activeSort](it);   // ordem por nota/novidade/ano: apaga quem não tem
  const cls = `cap${it.incomplete?' inc':''}${playable?'':' locked'}${!playable && st!=='completo'?' ask':''}${dim?' dim':''}`;
  const style = `style="animation-delay:${Math.min(i*30,360)}ms"`;
  return playable
    ? `<a class="${cls}" href="${workHash(it)}" data-i="${it._i}" ${style}>${inner}</a>`
    : `<div class="${cls}" data-i="${it._i}" ${style}>${inner}</div>`;
}

function render(){
  if(!DATA_READY) return;
  const cats = activeCat==='todos' ? ORDER : [activeCat];
  let html = '', any = false;
  cats.forEach(cat=>{
    const items = DATA.filter(it=>it.cat===cat && matches(it));
    if(!items.length) return;
    sortItems(items);
    any = true;
    html += `
      <section class="section" data-cat="${cat}">
        <div class="section-head">
          <span class="tag">${CAT_LABEL[cat]}</span>
          <span class="count">${items.length} obra(s)</span>
        </div>
        <div class="shelf">${items.map((it,i)=>capHTML(it,i)).join('')}</div>
      </section>`;
  });
  shelves.innerHTML = any ? html : `<div class="empty">Nada encontrado 😢<br>Tenta outra busca ou categoria.</div>`;
  if(typeof renderContinue === 'function') renderContinue();
}

document.getElementById('pills').addEventListener('click', e=>{
  const btn = e.target.closest('.pill'); if(!btn) return;
  document.querySelectorAll('#pills .pill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active'); activeCat = btn.dataset.cat; render(); toResults();
});
document.getElementById('statuspills').addEventListener('click', e=>{
  const btn = e.target.closest('.lpill'); if(!btn) return;
  document.querySelectorAll('#statuspills .lpill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active'); activeStatus = btn.dataset.status; render(); toResults();
});
document.getElementById('langpills').addEventListener('click', e=>{
  const btn = e.target.closest('.lpill'); if(!btn) return;
  document.querySelectorAll('#langpills .lpill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active'); activeLang = btn.dataset.lang; render(); toResults();
});
document.getElementById('sortpills').addEventListener('click', e=>{
  const btn = e.target.closest('.lpill'); if(!btn) return;
  const s = btn.dataset.sort;
  sortDir = (s === activeSort && SORTS[s]) ? -sortDir : 1;     // mesma ordem de novo = inverte
  activeSort = s;
  document.querySelectorAll('#sortpills .lpill').forEach(p=>{
    p.classList.toggle('active', p === btn);
    const d = p.querySelector('.sdir'); if(d) d.remove();
  });
  if(SORTS[s]){
    btn.insertAdjacentHTML('beforeend', `<span class="sdir" aria-hidden="true">${sortDir > 0 ? '↓' : '↑'}</span>`);
    btn.title = `${SORT_DIR_LBL[s][sortDir > 0 ? 0 : 1]} · clique de novo pra inverter`;
  }
  render(); toResults();
});
searchEl.addEventListener('input', e=>{ query = e.target.value.trim(); render(); });

function toResults(){
  const sec = shelves.querySelector('.section') || shelves;
  requestAnimationFrame(()=>sec.scrollIntoView({behavior:'smooth', block:'start'}));
}
/* altura da faixa de filtros que gruda no topo (pra rolagem parar logo abaixo dela) */
const catBar = document.querySelector('.filter-cats');
const syncCatBar = () => document.documentElement.style.setProperty('--catbar-h', catBar.offsetHeight + 'px');
if(window.ResizeObserver) new ResizeObserver(syncCatBar).observe(catBar);
window.addEventListener('resize', syncCatBar);

/* ---------- Link direto pra uma obra: #/catalogo/frieren (ou #/catalogo/frieren/2 = 2ª temporada, #/catalogo/frieren/2/5 = 2ª temporada, ep 5) ---------- */
const slugify = s => String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
function workHash(it, si, n){
  return `#/catalogo/${it._slug}` + (si || n ? `/${(si||0)+1}` : '') + (n ? `/${n}` : '');
}
/* abre o player de fato (sem mexer no endereço) */
function showWork(it, si, n){
  playerWork = it;                              // o player mostra o patrocinador e a review dessa obra
  if(it.seasons && it.seasons.length) openSeasonsPlayer(it, si||0, n);
  else if(it.episodes && it.episodes.length) openEpisodes(it.t, it.episodes, it.url, it._slug, n);
  else openPlayer(it.url, it.t);
}
/* clique numa capa/temporada: cria uma entrada no histórico e deixa a navegação abrir o player */
function openWork(it, si, n){
  history.pushState({cbModal:true}, '', workHash(it, si, n));
  route();
}
let openKey = null;
onRoute.catalogo = rest=>{
  if(!DATA_READY) return;                       // o app chama route() de novo quando o data.json chegar
  const slug = rest[0];
  if(!slug){ if(playerOpen()) closePlayer(); openKey = null; return; }
  const it = DATA.find(d=>d._slug===slug);
  if(!it || !isPlayable(it)){ history.replaceState(null, '', '#/catalogo'); if(playerOpen()) closePlayer(); return; }
  let si = rest[1] ? Math.max(0, (parseInt(rest[1],10)||1) - 1) : 0;
  let n = rest[2] ? parseInt(rest[2],10) || null : null;
  /* sem episódio no endereço: volta de onde a pessoa parou (se já assistiu essa obra/temporada) */
  const p = typeof contGet === 'function' ? contGet(slug) : null;
  if(p && !n && (!rest[1] || p.si === si)){ si = p.si; n = p.n; }
  const key = slug + '/' + si;
  if(key===openKey && playerOpen()) return;
  showWork(it, si, n);
  openKey = key;
  if(!playerOpen()) history.replaceState(null, '', '#/catalogo');   // link que abriu em outra aba
};

/* cliques nos cards e temporadas abrem o player embutido, sem redirecionar */
shelves.addEventListener('click', e=>{
  const capEl = e.target.closest('.cap');
  const it = capEl ? DATA[+capEl.dataset.i] : null;
  /* "Patrocine" / "Peça esse react": vai pra calculadora já com a obra e o próximo episódio */
  if(it && e.target.closest('[data-pedir]')){ e.preventDefault(); e.stopPropagation(); pedirObra(it); return; }
  /* capa trancada: "Na fila" ou em aberto sem react ainda vira pedido (já pago leva pro cronograma), "Off Live" leva pros Reacts Offline */
  if(it && capEl.classList.contains('locked')){
    const st = statusOf(it);
    if(paidQueue(it)) go('cronograma');
    else if(st==='embreve') go('offline');
    else if(it.pago) go('cronograma');
    else if(st!=='completo') pedirObra(it);
    return;
  }
  const seg = e.target.closest('.seg.clik');
  if(seg){
    e.preventDefault(); e.stopPropagation();
    if(it) openWork(it, +seg.dataset.si);
    else openPlayer(seg.dataset.url, seg.textContent.trim());
    return;
  }
  const card = e.target.closest('a.cap');
  if(card && it){
    if(e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;   // deixa abrir em nova aba
    e.preventDefault();
    openWork(it);
  }
});

/* easter egg: mouse parado ~2s em cima da capa do Invencível → "não dê nem água" */
const EGG = { invencivel: 'images/meme-invencivel.jpg' };
let eggTimer = null, eggCap = null;
shelves.addEventListener('mouseover', e=>{
  const capEl = e.target.closest('.cap');
  if(capEl === eggCap) return;
  clearTimeout(eggTimer); eggCap = capEl;
  const it = capEl ? DATA[+capEl.dataset.i] : null;
  const src = it && EGG[normQ(it.t)];
  if(!src) return;
  eggTimer = setTimeout(()=>{
    const art = capEl.querySelector('.cap-art');
    if(!art || art.querySelector('.egg')) return;
    // a imagem é deitada e a capa é em pé: mostra ela inteira, com ela mesma desfocada preenchendo o fundo
    art.insertAdjacentHTML('beforeend', `<div class="egg"><img class="egg-bg" src="${src}" alt=""><img class="egg-img" src="${src}" alt="Não dê nem água" onerror="this.parentNode.remove()"></div>`);
  }, 2000);
});
shelves.addEventListener('mouseout', e=>{
  if(!eggCap || eggCap.contains(e.relatedTarget)) return;
  clearTimeout(eggTimer);
  const egg = eggCap.querySelector('.egg'); if(egg) egg.remove();
  eggCap = null;
});

/* chamado pelo app quando o data.json carrega */
function bootCatalog(j){
  DATA = j.data || []; LANG_MAP = j.lang || {}; IMG_MAP = j.img || {};
  const seen = {};
  DATA.forEach((d,i)=>{
    d._i = i;                                   // índice global estável, usado pelos cliques do player
    let s = slugify(d.t) || ('obra-'+i);
    if(seen[s]) s += '-' + d.cat;               // títulos repetidos em categorias diferentes
    seen[s] = true;
    d._slug = s;
  });
  DATA_READY = true;
  const counted = DATA.filter(d=>d.cat!=='vods');   // VODs não entram nos contadores do topo
  document.getElementById('s-titles').textContent = counted.length;
  document.getElementById('s-done').textContent = counted.filter(d=>statusOf(d)==='completo').length;
  document.getElementById('s-prog').textContent = counted.filter(d=>statusOf(d)==='assistindo').length;
  /* horas de react: só aparece quando o robô já trouxe a duração dos vídeos */
  const secs = DATA.reduce((s,d) => s + workSecs(d), 0);
  const hrs = Math.round(secs / 3600);
  document.getElementById('s-hours').textContent = new Intl.NumberFormat('pt-BR').format(hrs);
  document.getElementById('s-hours-box').hidden = hrs < 1;
  /* sem ano ou sem datas no data.json (robô antigo), esconde as ordens que não teriam efeito */
  const sp = document.getElementById('sortpills');
  sp.querySelector('[data-sort="ano"]').hidden = !DATA.some(d => d.ano);
  sp.querySelector('[data-sort="novos"]').hidden = !DATA.some(d => d.add || d.upd);
  render();
}
function failCatalog(err){
  console.error('Falha ao carregar data.json:', err);
  shelves.innerHTML = '<div class="empty">Não consegui carregar o catálogo agora 😢<br>Tente recarregar a página em instantes.</div>';
}
