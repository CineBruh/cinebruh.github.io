/* ===== Cinebruh · patrocinar: busca de obra no TMDB + janela de detalhes ===== */
/* Chave da API do TMDB usada SÓ por esta busca. Ela fica visível no código do site (é a chave pública do site),
   separada da do robô, que fica nos secrets do GitHub. Vazia = busca desativada. */
const TMDB_KEY = '47b4f1fdc40f6fc95d26127e7b36c781';
const TMDB_API = 'https://api.themoviedb.org/3';
const TIMG = (p, size) => p ? `https://image.tmdb.org/t/p/${size}${p}` : '';
/* a busca agora mora no campo "Obra" do "Monte seu pedido" */
const pickQ = document.getElementById('calc-t');
const pickGrid = document.getElementById('calc-sug');
const pickedBox = document.getElementById('calc-picked');
let pickResults = [], pickTimer = null, pickSeq = 0, tmSeq = 0, sugIdx = -1;
let picked = null;                                   // obra escolhida na busca: {media_type, id, title, year, poster, kl}

function tmdb(path, params={}){
  const u = new URL(TMDB_API + path);
  u.searchParams.set('api_key', TMDB_KEY);
  u.searchParams.set('language', 'pt-BR');
  for(const [k,v] of Object.entries(params)) u.searchParams.set(k, v);
  return fetch(u).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); });
}
/* anime = animação (gênero 16) de origem japonesa; funciona com resultado de busca e com detalhes */
function isAnime(r){
  const genres = r.genre_ids || (r.genres||[]).map(g=>g.id);
  const countries = r.origin_country || (r.production_countries||[]).map(c=>c.iso_3166_1);
  return genres.includes(16) && (r.original_language==='ja' || countries.includes('JP'));
}
function kindLabel(r){
  const a = isAnime(r);
  if(r.media_type==='movie') return a ? ['Anime · Filme','t-anime'] : ['Filme','t-filme'];
  return a ? ['Anime','t-anime'] : ['Série','t-serie'];
}
const yearOf = r => (r.release_date || r.first_air_date || '').slice(0,4);
const normT = s => String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
/* obra já está no Cinebruh? compara a capa do TMDB e, se não der, o título (mesmo tipo de obra) */
function inCatalog(r){
  const pp = r.poster_path;
  const names = [r.title, r.name, r.original_title, r.original_name].filter(Boolean).map(normT);
  const sameKind = d => r.media_type==='movie' ? d.cat==='filmes' : (d.cat!=='filmes' && (d.cat==='animes')===isAnime(r));
  return DATA.find(d => d.cat!=='vods' && (
    (pp && String(IMG_MAP[d.t] || d.img || '').includes(pp)) ||
    (sameKind(d) && names.includes(normT(d.t)))
  )) || null;
}

/* ===================== Busca no campo "Obra" =====================
   Mostra primeiro o que já está no Cinebruh (pra continuar de onde a Bruh parou) e depois o TMDB
   (qualquer obra, em qualquer idioma). Escolher preenche o pedido; "Detalhes" abre a janela completa. */
const SG_ST = { completo:'✓ Completo', assistindo:'▶ Assistindo', fila:'⏳ Na fila', embreve:'Off Live' };
const SG_CAT = { animes:'Anime', filmes:'Filme', series:'Série', animacoes:'Animação', tokusatsu:'Tokusatsu' };
function sugRow(r, i){
  if(r._cat){
    const d = r._cat, f = IMG_MAP[d.t] || d.img, img = f ? (/^https?:\/\//.test(f) ? f : `images/${f}`) : '';
    return `<div class="sg" role="option" data-i="${i}"><div class="sg-art">${d.em || ''}${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>
      <div class="sg-txt"><b>${esc(d.t)}</b><span>${esc(SG_CAT[d.cat] || d.cat)}${d.ano ? ` · ${d.ano}` : ''}</span></div>
      <span class="sg-in">No Cinebruh · ${SG_ST[statusOf(d)] || ''}</span></div>`;
  }
  const [kl, kc] = kindLabel(r);
  return `<div class="sg" role="option" data-i="${i}"><div class="sg-art">${r.poster_path ? `<img src="${TIMG(r.poster_path,'w92')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>
    <div class="sg-txt"><b>${esc(r.title||r.name)}</b><span><i class="pk-type ${kc}">${kl}</i>${yearOf(r) ? ` · ${yearOf(r)}` : ''}${(r.original_title||r.original_name) && (r.original_title||r.original_name) !== (r.title||r.name) ? ` · ${esc(r.original_title||r.original_name)}` : ''}</span></div>
    <button class="sg-more" type="button" data-more="${i}" title="Sinopse, elenco, trailer e episódios">Detalhes</button></div>`;
}
function sugShow(html){
  pickGrid.innerHTML = html; pickGrid.hidden = !html; sugIdx = -1;
  pickQ.setAttribute('aria-expanded', html ? 'true' : 'false');
}
async function pickSearch(){
  const q = pickQ.value.trim();
  const seq = ++pickSeq;
  if(q.length < 2){ pickResults = []; sugShow(''); return; }
  const nq = normQ(q);
  const cat = DATA_READY ? DATA.filter(d => d.cat !== 'vods' && [d.t, ...(d.aka||[])].some(n => normQ(n).includes(nq))).slice(0, 4) : [];
  pickResults = cat.map(d => ({ _cat: d }));
  const draw = (extra = '') => sugShow(pickResults.map(sugRow).join('') + extra);
  draw(TMDB_KEY ? '<div class="sg-note">Buscando…</div>' : '');
  if(!TMDB_KEY) return;
  try{
    const res = await tmdb('/search/multi', { query:q, include_adult:'false' });
    if(seq !== pickSeq) return;
    const list = (res.results||[]).filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && !cat.includes(inCatalog(r))).slice(0, 8);
    pickResults = pickResults.concat(list);
    draw(pickResults.length ? '' : '<div class="sg-note">Nada encontrado 😢 Tenta outro nome (vale o título original também).</div>');
  }catch(err){
    if(seq === pickSeq) draw('<div class="sg-note">Não consegui buscar no TMDB agora. Dá pra escrever o nome e seguir assim mesmo.</div>');
  }
}
/* escolheu uma sugestão: preenche o pedido */
async function choosePick(r){
  if(!r) return;
  sugShow(''); pickSeq++;
  if(r._cat){
    const w = r._cat, nx = nextEp(w);
    setPicked(null);
    fillCalc({ titulo: w.t, tipo: tipoOf(w), dur: faixaPadrao(w), s: nx ? nx.s : 1, de: nx ? nx.ep : 1, ate: nx ? nx.ep : 1, lock: lockOf(w) });
    return;
  }
  const isMovie = r.media_type === 'movie', title = r.title || r.name, hit = inCatalog(r);
  const hint = isMovie ? 'filmes' : (isAnime(r) ? 'curto' : 'medio');
  setPicked(r);
  const nx = hit && nextEp(hit);
  const tipo = isMovie ? 'filmes' : 'eps';
  fillCalc({ titulo: title, tipo, dur: faixaOf(null, hint), s: nx ? nx.s : 1, de: nx ? nx.ep : 1, ate: nx ? nx.ep : 1, keepPick: true,
    lock: { tipo, dur: hint === 'curto' ? 'curto' : null } });
  /* acerta a duração com o tempo real do filme/episódio (vem nos detalhes) e trava a faixa nela */
  try{
    const d = await tmdb(`/${r.media_type}/${r.id}`);
    if(picked !== r) return;
    const runtime = isMovie ? d.runtime : ((d.episode_run_time||[])[0] || (d.last_episode_to_air||{}).runtime || null);
    if(runtime){ calc.dur = faixaOf(runtime, hint); r._runtime = runtime; calc.lock = { tipo, dur: calc.dur, min: runtime }; }
    if(!isMovie && d.number_of_seasons) r._seasons = d.number_of_seasons;
    setPicked(r); calcDraw();
  }catch(e){}
}
function setPicked(r){
  picked = r;
  if(!r){ calc.lock = null; pickedBox.hidden = true; pickedBox.innerHTML = ''; return; }
  const [kl, kc] = kindLabel(r), isMovie = r.media_type === 'movie';
  const info = [yearOf(r), r._runtime ? (isMovie ? fmtMin(r._runtime) : `~${r._runtime} min/ep`) : '', r._seasons ? `${r._seasons} temporada${r._seasons > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  pickedBox.innerHTML = `${r.poster_path ? `<img src="${TIMG(r.poster_path,'w92')}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    <div class="sg-txt"><b>${esc(r.title||r.name)}</b><span><i class="pk-type ${kc}">${kl}</i>${info ? ` · ${info}` : ''}${inCatalog(r) ? ' · ✓ No Cinebruh' : ''}</span></div>
    <button class="cta alt" type="button" data-picked-more>ℹ️ Detalhes e episódios</button>`;
  pickedBox.hidden = false;
}
if(pickQ){
  pickQ.addEventListener('input', () => {
    if(picked && pickQ.value.trim() !== (picked.title || picked.name)) setPicked(null);   // mudou o nome: esquece a escolha
    clearTimeout(pickTimer); pickTimer = setTimeout(pickSearch, 350);
  });
  pickQ.addEventListener('focus', () => { if(pickResults.length && pickQ.value.trim().length >= 2 && !picked) pickSearch(); });
  pickQ.addEventListener('keydown', e => {
    const rows = [...pickGrid.querySelectorAll('.sg')];
    if(e.key === 'Escape'){ sugShow(''); return; }
    if(!rows.length || pickGrid.hidden) return;
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      rows.forEach((r, i) => r.classList.toggle('on', i === sugIdx));
      rows[sugIdx].scrollIntoView({ block:'nearest' });
    } else if(e.key === 'Enter' && sugIdx >= 0){
      e.preventDefault(); choosePick(pickResults[+rows[sugIdx].dataset.i]);
    }
  });
  document.addEventListener('pointerdown', e => { if(!e.target.closest('.calc-search')) sugShow(''); });
  pickGrid.addEventListener('click', e => {
    const more = e.target.closest('[data-more]');
    if(more){ const r = pickResults[+more.dataset.more]; sugShow(''); openPick(r); return; }
    const row = e.target.closest('.sg'); if(row) choosePick(pickResults[+row.dataset.i]);
  });
  pickedBox.addEventListener('click', e => { if(e.target.closest('[data-picked-more]') && picked) openPick(picked); });
}

const tm = document.createElement('div');
tm.className = 'tm';
tm.innerHTML = `<div class="tm-box" role="dialog" aria-modal="true" aria-label="Detalhes da obra"></div>`;
document.body.appendChild(tm);
const tmBox = tm.querySelector('.tm-box');
const TM_CLOSE = `<button class="tm-close" type="button" aria-label="Fechar">✕</button>`;
function closePick(){ tmSeq++; tm.classList.remove('open'); document.body.classList.remove('noscroll'); }
tm.addEventListener('click', e=>{ if(e.target===tm || e.target.closest('.tm-close')) closePick(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && tm.classList.contains('open')) closePick(); });
onLeave.push(()=>{ if(tm.classList.contains('open')) closePick(); });

const fmtMin = m => m>=60 ? `${Math.floor(m/60)}h${m%60 ? String(m%60).padStart(2,'0') : ''}` : `${m} min`;
const TM_STATUS = {'Returning Series':'Em exibição','Ended':'Finalizada','Canceled':'Cancelada','In Production':'Em produção','Planned':'Planejada','Pilot':'Piloto','Released':'Lançado','Post Production':'Pós-produção','Rumored':'Anunciado'};

function detailHTML(d, type){
  const isMovie = type==='movie';
  const r = {...d, media_type:type};
  const anime = isAnime(r);
  const [kl, kc] = kindLabel(r);
  const title = d.title || d.name, orig = d.original_title || d.original_name;
  const year = yearOf(d);
  const runtime = isMovie ? d.runtime : ((d.episode_run_time||[])[0] || (d.last_episode_to_air||{}).runtime || null);
  const hit = inCatalog(r);

  const chips = [`<span class="tm-chip ${kc}">${kl}</span>`];
  if(year) chips.push(`<span class="tm-chip">${year}</span>`);
  if(runtime) chips.push(`<span class="tm-chip">${isMovie ? fmtMin(runtime) : `~${runtime} min/ep`}</span>`);
  if(!isMovie && d.number_of_seasons) chips.push(`<span class="tm-chip">${d.number_of_seasons} temporada${d.number_of_seasons>1?'s':''}</span>`);
  if(!isMovie && d.number_of_episodes) chips.push(`<span class="tm-chip">${d.number_of_episodes} episódios</span>`);
  if(TM_STATUS[d.status]) chips.push(`<span class="tm-chip">${TM_STATUS[d.status]}</span>`);
  if(d.vote_count) chips.push(`<span class="tm-chip star">★ ${d.vote_average.toFixed(1)} no TMDB</span>`);
  if(hit) chips.push(`<span class="tm-chip ok">✓ Já no Cinebruh</span>`);

  const crew = isMovie
    ? ((d.credits||{}).crew||[]).filter(c=>c.job==='Director').map(c=>c.name)
    : (d.created_by||[]).map(c=>c.name);
  const crewLabel = isMovie ? 'Direção' : 'Criação';
  const cast = ((d.credits||{}).cast||[]).slice(0,10);
  const vids = ((d.videos||{}).results||[]).filter(v=>v.site==='YouTube');
  const trailer = vids.find(v=>v.type==='Trailer' && v.iso_639_1==='pt') || vids.find(v=>v.type==='Trailer') || vids.find(v=>v.type==='Teaser');
  const br = (((d['watch/providers']||{}).results)||{}).BR;
  const provs = br ? (br.flatrate || []) : [];

  let price;
  if(!PRECO()){
    price = 'Veja a tabela de preços acima.';
  } else if(isMovie){
    const q = quote({hint:'filmes', min:runtime});
    price = q.valor != null
      ? `<b>Filme${runtime ? ` (${fmtMin(runtime)})` : ''}:</b> ${fmtBRL(q.valor)}${q.bits ? ` ou ${q.bits} bits` : ''}.`
      : `<b>Filme com mais de 2h30${runtime ? ` (${fmtMin(runtime)})` : ''}:</b> valor a combinar com a Bruna.`;
  } else {
    /* episódio: o preço vem da duração. Sem duração no TMDB, palpite: anime = curto, série = até 1h */
    const hint = anime ? 'curto' : 'medio';
    const q1 = quote({hint, min:runtime}), q5 = quote({hint, eps:5, min:runtime}), pc = PRECO().pacote;
    price = `<b>${FAIXA_NOME[q1.faixa]}${runtime ? ` (episódios de ~${runtime} min)` : ''}:</b> ${fmtBRL(q1.valor)}${q1.bits ? ` (ou ${q1.bits} bits)` : ''} por episódio`
      + (q5.pacote ? `, ou ${fmtBRL(pc.valorPorEp)} cada a partir de ${pc.minEps} episódios.` : '.');
    if(!runtime) price += ` O valor depende da duração do episódio: veja a tabela acima.`;
  }
  const epPick = isMovie ? '' : `<div class="tm-sec" id="tm-pick"><h4>Escolha os episódios</h4><div class="tm-seasons"></div><div class="tm-epgrid"></div><div class="tm-total"></div></div>`;

  const poster = d.poster_path ? `<img src="${TIMG(d.poster_path,'w342')}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : (isMovie?'🎬':'📺');
  const hero = d.backdrop_path ? ` style="background-image:url('${TIMG(d.backdrop_path,'w780')}')"` : '';

  return `${TM_CLOSE}
    <div class="tm-hero"${hero}></div>
    <div class="tm-body">
      <div class="tm-poster">${poster}</div>
      <div class="tm-main">
        <h3>${esc(title)}</h3>
        ${orig && orig!==title ? `<div class="tm-orig">${esc(orig)}</div>` : ''}
        <div class="tm-chips">${chips.join('')}</div>
        ${(d.genres||[]).length ? `<div class="tm-genres">${d.genres.map(g=>esc(g.name)).join(' · ')}</div>` : ''}
      </div>
    </div>
    <div class="tm-sec"><h4>Sinopse</h4><p>${d.overview ? esc(d.overview) : 'Sem sinopse disponível.'}</p>${d._ovEn ? '<div class="tm-note">Sinopse em inglês (o TMDB ainda não tem em português).</div>' : ''}</div>
    ${crew.length ? `<div class="tm-sec"><h4>${crewLabel}</h4><p>${crew.map(esc).join(', ')}</p></div>` : ''}
    ${cast.length ? `<div class="tm-sec"><h4>Elenco</h4><div class="tm-cast">${cast.map(c=>`<div class="tm-person"><div class="ph">${c.profile_path ? `<img src="${TIMG(c.profile_path,'w185')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '👤'}</div><b>${esc(c.name)}</b><span>${esc(c.character||'')}</span></div>`).join('')}</div></div>` : ''}
    ${provs.length ? `<div class="tm-sec"><h4>Onde assistir no Brasil</h4><div class="tm-prov">${provs.map(p=>`<img src="${TIMG(p.logo_path,'w92')}" alt="${esc(p.provider_name)}" title="${esc(p.provider_name)}" referrerpolicy="no-referrer">`).join('')}</div><div class="tm-note">Dados de streaming: JustWatch.</div></div>` : ''}
    ${epPick}
    <div class="tm-sec"><h4>Quanto custa o react</h4><div class="tm-price">${price}<div class="tm-note" style="color:inherit;opacity:.75">Estimativa pela tabela acima. O valor final e a data seguem o cronograma da Bruna.</div></div></div>
    <div class="tm-actions">
      <button class="cta" type="button" data-act="copy">📋 Copiar pedido</button>
      <button class="cta alt" type="button" data-act="calc">🧮 Usar no pedido</button>
      <button class="cta alt" type="button" data-act="donate">💸 Ir para doações</button>
      ${hit ? `<button class="cta alt" type="button" data-act="catalog">Ver no catálogo</button>` : ''}
      ${trailer ? `<a class="cta alt" href="https://www.youtube.com/watch?v=${esc(trailer.key)}" target="_blank" rel="noopener">▶ Trailer</a>` : ''}
      <a class="cta alt" href="https://www.themoviedb.org/${type}/${d.id}" target="_blank" rel="noopener">TMDB ↗</a>
    </div>`;
}

async function openPick(r){
  if(!r) return;
  const seq = ++tmSeq;
  tmBox.innerHTML = `${TM_CLOSE}<div class="tm-loading">Carregando…</div>`;
  tmBox.scrollTop = 0;
  tm.classList.add('open'); document.body.classList.add('noscroll');
  try{
    const d = await tmdb(`/${r.media_type}/${r.id}`, {append_to_response:'credits,videos,watch/providers', include_video_language:'pt,en,null'});
    if(!d.overview){
      try{ const en = await tmdb(`/${r.media_type}/${r.id}`, {language:'en-US'}); if(en.overview){ d.overview = en.overview; d._ovEn = true; } }catch(e){}
    }
    if(seq!==tmSeq) return;
    const title = d.title || d.name, year = yearOf(d), [kl] = kindLabel({...d, media_type:r.media_type});
    const hit = inCatalog({...d, media_type:r.media_type});
    tmBox.innerHTML = detailHTML(d, r.media_type);
    const isTv = r.media_type === 'tv';
    const tipo = r.media_type === 'movie' ? 'filmes' : (isAnime({...d, media_type:'tv'}) ? 'curto' : 'medio');   // palpite de faixa, se faltar a duração
    const runtime = r.media_type === 'movie' ? d.runtime : ((d.episode_run_time||[])[0] || (d.last_episode_to_air||{}).runtime || null);
    const pickSt = isTv ? setupEpPicker(d, hit, tipo, runtime) : null;
    tmBox.querySelector('.tm-actions').addEventListener('click', e=>{
      const b = e.target.closest('[data-act]'); if(!b) return;
      const sel = pickSt ? [...pickSt.sel].sort((a,b)=>a-b) : [];
      const selMin = () => { const rts = pickSt.eps.filter(x=>pickSt.sel.has(x.n)).map(x=>x.runtime).filter(Boolean); return rts.length ? Math.round(rts.reduce((a,c)=>a+c,0)/rts.length) : runtime; };
      if(b.dataset.act==='copy'){
        let extra = '';
        if(sel.length){
          const q = quote({hint:tipo, eps:sel.length, min:selMin()});
          extra = ` · T${pickSt.s} ${sel.length > 1 ? 'eps' : 'ep'} ${ranges(sel)}` + (q ? ` · ${q.valor != null ? fmtBRL(q.valor) : 'valor a combinar'}${q.bits ? ` ou ${q.bits} bits` : ''}` : '');
        }
        const txt = `Pedido de react: ${title}${year?` (${year})`:''} · ${kl}${extra}\nhttps://www.themoviedb.org/${r.media_type}/${d.id}`;
        copyText(txt, ()=>{ const o = b.textContent; b.textContent = 'Copiado! ✅'; setTimeout(()=>b.textContent = o, 1800); });
      } else if(b.dataset.act==='calc'){
        closePick();
        setPicked({ ...d, media_type: r.media_type, _runtime: runtime, _seasons: d.number_of_seasons });
        const dur = faixaOf(sel.length ? selMin() : runtime, tipo), tp = tipo === 'filmes' ? 'filmes' : 'eps';
        pedirReact({ titulo:title, tipo: tp, s: pickSt ? pickSt.s : 1, de: sel[0] || 1, ate: sel[sel.length-1] || sel[0] || 1,
          dur, keepPick: true, lock: { tipo: tp, dur: (sel.length ? selMin() : runtime) || tipo === 'curto' ? dur : null, min: sel.length ? selMin() : runtime } });
      } else if(b.dataset.act==='donate'){
        closePick(); go('apoiar');
      } else if(b.dataset.act==='catalog' && hit){
        closePick(); go('catalogo');
        searchEl.value = hit.t; query = hit.t; render(); toResults();
      }
    });
  }catch(err){
    if(seq===tmSeq) tmBox.innerHTML = `${TM_CLOSE}<div class="tm-loading">Não consegui carregar os detalhes 😢<br>Tenta de novo em instantes.</div>`;
  }
}

/* copiar chave Pix (aba Apoiar) */
function copyPix(btn){
  const label = btn.querySelector('.txt span'), original = label.textContent;
  copyText(btn.dataset.pix, ()=>{ label.textContent = 'Copiado! ✅'; setTimeout(()=>label.textContent = original, 1800); });
}
window.copyPix = copyPix;

/* ===================== Preços (site.json → precos) =====================
   O preço do episódio depende da DURAÇÃO, não da categoria:
   curto (até 30 min: anime, animação ou série curta) · até 1h · mais de 1h. Filme: até 2h · mais de 2h. */
const PRECO = () => (typeof SITE !== 'undefined' && SITE && SITE.precos) || null;
const precoItem = id => { const p = PRECO(); return p ? (p.itens||[]).find(i=>i.id===id) || null : null; };
const fmtBRL = v => 'R$' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2});
const FAIXA_NOME = { curto:'Episódio curto', medio:'Episódio até 1h', longo:'Episódio de 1h+', filme:'Filme', 'filme-longo':'Filme 2h30+' };
const isFilme = f => f === 'filme' || f === 'filme-longo';
function pacoteVale(f){ const pc = PRECO() && PRECO().pacote; return !!pc && (pc.faixas || ['curto']).includes(f); }

/* faixa pela duração (minutos). Sem duração, usa o palpite: 'filmes', 'curto' ou 'medio' */
function faixaOf(min, hint = 'curto'){
  if(hint === 'filmes' || isFilme(hint)){
    const f = precoItem('filme'), lim = (f && f.maxMin) || 120;
    return min ? (min > lim ? 'filme-longo' : 'filme') : (hint === 'filme-longo' ? 'filme-longo' : 'filme');
  }
  if(!min) return ['curto','medio','longo'].includes(hint) ? hint : 'curto';
  const c = precoItem('curto'), m = precoItem('medio');
  if(min <= ((c && c.maxMin) || 30)) return 'curto';
  return min <= ((m && m.maxMin) || 60) ? 'medio' : 'longo';
}
/* quanto custa: quantos episódios + a duração (min) ou a faixa já escolhida */
function quote({eps = 1, min = null, hint = 'curto', faixa = null} = {}){
  if(!PRECO()) return null;
  const f = faixa || faixaOf(min, hint), it = precoItem(f);
  if(isFilme(f)) return { valor: it ? it.valor : null, bits: it ? it.bits : null, eps: 1, economia: 0, faixa: f };
  if(!it || it.valor == null) return { valor: null, bits: null, eps, economia: 0, faixa: f };
  const pc = PRECO().pacote, pac = pacoteVale(f) && eps >= pc.minEps;
  const valor = pac ? eps * pc.valorPorEp : eps * it.valor;
  const bitsEp = pac && pc.bitsPorEp ? pc.bitsPorEp : it.bits;
  return { valor, bits: bitsEp == null ? null : eps * bitsEp, eps, economia: eps * it.valor - valor, pacote: !!pac, faixa: f };
}
/* [1,2,3,5] → "1–3, 5" */
function ranges(arr){
  const a = [...new Set(arr)].sort((x,y)=>x-y), out = [];
  for(let i = 0; i < a.length; i++){
    let j = i; while(a[j+1] === a[j] + 1) j++;
    out.push(j > i ? `${a[i]}–${a[j]}` : `${a[i]}`); i = j;
  }
  return out.join(', ');
}

/* tabela de preços montada a partir do site.json */
function renderPrecos(site){
  const box = document.getElementById('price-grid'), p = site.precos;
  if(!box || !p) return;
  const cls = { curto:'a', 'curto-5':'a', medio:'s', longo:'s', filme:'f', 'filme-longo':'f' };
  const pc = p.pacote;
  box.innerHTML = (p.itens||[]).map(i => `<div class="price ${cls[i.id]||'s'}${i.destaque ? ' hot' : ''}">
      ${i.destaque ? `<span class="price-hot">⭐ ${esc(i.destaque)}</span>` : ''}
      <span class="tier">${esc(i.nome)}</span>
      <span class="amount">${i.valor != null ? fmtBRL(i.valor) : 'A combinar'}</span>
      <span class="bits">${i.bits != null ? `ou ${i.bits} bits` : 'fale com a Bruna'}</span>
      <span class="desc">${esc(i.desc||'')}</span></div>`).join('')
    + (pc ? `<div class="price-note">💡 <b>Pacote:</b> ${esc(pc.desc)}</div>` : '')
    + (p.aviso ? `<div class="price-note price-aviso">ℹ️ ${esc(p.aviso)}</div>` : '');
  calcDraw();
}

/* ===================== O que a Bruh já reagiu de cada obra ===================== */
const tipoOf = it => it.cat === 'filmes' ? 'filmes' : 'eps';
/* faixa mais provável pela categoria (séries costumam ter episódios mais longos; anime, animação e tokusatsu, curtos) */
const faixaPadrao = it => it.cat === 'filmes' ? 'filme' : it.cat === 'series' ? 'medio' : 'curto';
/* o que a calculadora trava pra uma obra do catálogo: o tipo sempre; a duração só no anime (sempre curto) */
const lockOf = it => ({ tipo: tipoOf(it), dur: it.cat === 'animes' ? 'curto' : null });
/* episódios já reagidos de uma temporada ("sem reação" não conta) */
function doneEps(it, s){
  if(!it) return new Set();
  const ok = list => new Set((list||[]).filter(e => !e.sr).map(e => e.n));
  if(it.seasons && it.seasons.length){
    const ss = it.seasons.find(x => x.n === s) || (s === 1 && !it.seasons.some(x => x.n != null) ? it.seasons[0] : null);
    return ok(ss && ss.ep);
  }
  return s === 1 ? ok(it.episodes) : new Set();
}
/* até qual episódio da temporada já está pago no Trello (o robô grava em "pg"), mesmo sem vídeo ainda */
function pagoAte(it, s){
  if(!it) return 0;
  if(it.seasons && it.seasons.length){
    const ss = it.seasons.find(x => x.n === s) || (s === 1 && !it.seasons.some(x => x.n != null) ? it.seasons[0] : null);
    return (ss && ss.pg) || 0;
  }
  return s === 1 ? (it.pg || 0) : 0;
}
/* pula os episódios que já têm patrocinador: { s, ep, last, pago } (pago = até onde já pagaram) */
function pulaPagos(it, nx){
  if(!nx) return nx;
  const pg = pagoAte(it, nx.s);
  return pg >= nx.ep ? { ...nx, ep: pg + 1, pago: pg } : nx;
}
/* próximo episódio que dá pra patrocinar: { s, ep, last } (last = onde ela parou) */
function nextEp(it){
  if(it.cat === 'filmes' || it.cat === 'vods') return null;
  if(it.seasons && it.seasons.length){
    const num = it.seasons.filter(x => x.n != null);
    if(!num.length) return null;
    const withEp = num.filter(x => (x.ep||[]).some(e => !e.sr));
    if(!withEp.length) return pulaPagos(it, { s: num[0].n, ep: 1, last: null });
    const cur = withEp[withEp.length - 1];
    const max = Math.max(...cur.ep.filter(e => !e.sr).map(e => e.n));
    if(cur.s === 'g'){ const nxt = num.find(x => x.n > cur.n); return nxt ? pulaPagos(it, { s: nxt.n, ep: 1, last: null, fimT: cur.n }) : null; }
    return pulaPagos(it, { s: cur.n, ep: max + 1, last: max });
  }
  const eps = (it.episodes||[]).filter(e => !e.sr).map(e => e.n);
  return pulaPagos(it, eps.length ? { s: 1, ep: Math.max(...eps) + 1, last: Math.max(...eps) } : { s: 1, ep: 1, last: null });
}
const findWork = name => { const k = normQ(name); return k && DATA_READY ? DATA.find(d => d.cat !== 'vods' && normQ(d.t) === k) || null : null; };

/* ===================== Calculadora "Monte seu pedido" ===================== */
/* lock: com uma obra escolhida, o tipo (episódio/filme) e, quando dá pra saber, a duração ficam travados
   pelas regras + dados do TMDB: { tipo, dur, min }. Sem obra (nome digitado à mão), tudo fica livre. */
const calc = { tipo:'eps', dur:'curto', s:1, de:1, ate:1, lock:null };
const calcBox = document.getElementById('calc');
const cIn = id => document.getElementById(id);
const DUR = {
  eps:    [['curto','Curto · até 30 min'], ['medio','Até 1h'], ['longo','Mais de 1h']],
  filmes: [['filme','Até 2h30'], ['filme-longo','Mais de 2h30']],
};

function calcRead(){
  calc.s = Math.max(1, parseInt(cIn('calc-s').value, 10) || 1);
  calc.de = Math.max(1, parseInt(cIn('calc-de').value, 10) || 1);
  calc.ate = Math.max(1, parseInt(cIn('calc-ate').value, 10) || calc.de);
}
function calcDraw(){
  if(!calcBox) return;
  const lk = calc.lock || {};
  document.querySelectorAll('#calc-tipo .lpill').forEach(b => {
    b.classList.toggle('active', b.dataset.t === calc.tipo);
    b.style.display = lk.tipo && b.dataset.t !== lk.tipo ? 'none' : '';
  });
  cIn('calc-dur').innerHTML = DUR[calc.tipo].filter(([id]) => !lk.dur || id === lk.dur)
    .map(([id, l]) => `<button class="lpill${calc.dur === id ? ' active' : ''}" type="button" data-d="${id}">${l}</button>`).join('');
  cIn('calc-dur-hint').textContent = lk.dur
    ? (lk.min ? `Pela duração no TMDB: ${calc.tipo === 'filmes' ? fmtMin(lk.min) : `~${lk.min} min por episódio`}.` : 'Episódio de anime conta como curto.') + ' Pra mudar, escolha outra obra.'
    : calc.tipo === 'eps' ? 'Curto é o tamanho de um episódio de anime (cerca de 20 min). Vale pra anime, animação ou série com episódios curtos.' : '';
  calcBox.querySelectorAll('[data-for]').forEach(f => f.hidden = !f.dataset.for.split(' ').includes(calc.tipo));
  const out = cIn('calc-out');
  if(!PRECO()){ out.innerHTML = '<p class="tm-note">Carregando os preços…</p>'; return; }

  const de = Math.min(calc.de, calc.ate), ate = Math.max(calc.de, calc.ate);
  const n = calc.tipo === 'filmes' ? 1 : ate - de + 1;
  const q = quote({ eps: n, faixa: calc.dur });
  const titulo = cIn('calc-t').value.trim();
  const w = findWork(titulo);
  const pc = PRECO().pacote;

  /* dicas: pacote, episódios já reagidos, onde ela parou */
  const tips = [];
  if(calc.tipo === 'eps' && pacoteVale(calc.dur) && n < pc.minEps){
    const q5 = quote({ eps: pc.minEps, faixa: calc.dur });
    tips.push(`<div class="calc-tip">💡 Com mais ${pc.minEps - n} ep${pc.minEps - n > 1 ? 's' : ''} vira pacote: cada episódio sai a ${fmtBRL(pc.valorPorEp)} (${pc.minEps} por ${fmtBRL(q5.valor)}). <button class="calc-link" type="button" data-pac>Fechar ${pc.minEps} episódios</button></div>`);
  }
  if(w && calc.tipo === 'eps'){
    const done = doneEps(w, calc.s), rep = [], pagos = [];
    const pg = pagoAte(w, calc.s);
    for(let i = de; i <= ate; i++){ if(done.has(i)) rep.push(i); else if(i <= pg) pagos.push(i); }
    const nx = nextEp(w);
    const pagoTxt = nx && nx.pago ? ` Até o ep ${nx.pago} já está patrocinado.` : '';
    const nxBtn = nx ? ` <button class="calc-link" type="button" data-next>Começar do ep ${nx.ep}${nx.s !== calc.s ? ` da T${nx.s}` : ''}</button>` : '';
    if(rep.length) tips.push(`<div class="calc-tip warn">⚠️ A Bruh já reagiu ${rep.length > 1 ? 'aos eps' : 'ao ep'} ${ranges(rep)} da T${calc.s}. Dá pra assistir no catálogo!${nxBtn}</div>`);
    else if(pagos.length) tips.push(`<div class="calc-tip warn">⚠️ ${pagos.length > 1 ? 'Os eps' : 'O ep'} ${ranges(pagos)} da T${calc.s} já ${pagos.length > 1 ? 'foram patrocinados' : 'foi patrocinado'} e vão ao ar em breve.${nxBtn}</div>`);
    else if(nx && nx.last) tips.push(`<div class="calc-tip ok">✓ Essa obra está no Cinebruh. A Bruh parou no ep ${nx.last} da T${nx.s}.${pagoTxt}</div>`);
    else tips.push(`<div class="calc-tip ok">✓ Essa obra já está no Cinebruh.${pagoTxt}</div>`);
  } else if(w && calc.tipo === 'filmes' && statusOf(w) !== 'fila'){
    tips.push(`<div class="calc-tip warn">⚠️ Esse filme já está no Cinebruh. Dá pra assistir no catálogo!</div>`);
  }

  const livepix = ((SITE.doacoes || {}).outras || []).find(o => o.id === 'livepix');
  const durNome = (DUR[calc.tipo].find(([id]) => id === calc.dur) || [, ''])[1].toLowerCase();
  out.innerHTML = `
    <div class="calc-total">
      <div><span class="calc-lbl">${calc.tipo === 'filmes' ? `Filme · ${durNome}` : `${n} episódio${n > 1 ? 's' : ''} · ${durNome}`}</span>
        <b>${q && q.valor != null ? fmtBRL(q.valor) : 'A combinar'}</b>
        <span class="calc-bits">${q && q.bits != null ? `ou ${q.bits} bits na Twitch` : q && q.valor == null ? 'Combine o valor com a Bruna' : ''}</span>
        ${q && q.economia > 0 ? `<span class="calc-save">Pacote: você economiza ${fmtBRL(q.economia)}</span>` : ''}</div>
      <div class="calc-acts">
        <button class="cta" type="button" data-copy-pedido>📋 Copiar pedido</button>
        ${livepix ? `<a class="cta alt" href="${esc(livepix.url)}" target="_blank" rel="noopener">💸 Pagar no LivePix</a>` : ''}
        <a class="cta alt" href="#/apoiar" data-nav="apoiar">Outras formas</a>
      </div>
    </div>
    ${tips.join('')}`;
}
function calcText(){
  const de = Math.min(calc.de, calc.ate), ate = Math.max(calc.de, calc.ate), n = ate - de + 1;
  const q = quote({ eps: calc.tipo === 'filmes' ? 1 : n, faixa: calc.dur });
  const titulo = cIn('calc-t').value.trim() || '(nome da obra)';
  const eps = calc.tipo === 'filmes' ? '' : ` · T${calc.s} ${n > 1 ? `eps ${de}–${ate}` : `ep ${de}`}`;
  const link = picked && picked.id ? `\nhttps://www.themoviedb.org/${picked.media_type}/${picked.id}` : '';
  return `Pedido de react: ${titulo} · ${FAIXA_NOME[calc.dur]}${eps} · ${q && q.valor != null ? fmtBRL(q.valor) : 'valor a combinar'}${q && q.bits ? ` ou ${q.bits} bits` : ''}${link}`;
}
/* preenche a calculadora (vindo de uma capa, do player ou da busca) */
function fillCalc(o){
  if(!o.keepPick && picked && o.titulo !== (picked.title || picked.name)) setPicked(null);
  calc.lock = o.lock || null;
  if(o.tipo) calc.tipo = o.tipo;
  calc.dur = o.dur && DUR[calc.tipo].some(([id]) => id === o.dur) ? o.dur : DUR[calc.tipo][0][0];
  cIn('calc-t').value = o.titulo || '';
  cIn('calc-s').value = o.s || 1;
  cIn('calc-de').value = o.de || 1;
  cIn('calc-ate').value = o.ate || o.de || 1;
  calcRead(); calcDraw();
}
function scrollToCalc(){ setTimeout(() => calcBox.scrollIntoView({behavior:'smooth', block:'start'}), 80); }
function pedirReact(o){ fillCalc(o); if(currentPage !== 'patrocinar') go('patrocinar'); scrollToCalc(); }
/* botão "Quero esse react" das capas e "próximo episódio" do player: link compartilhável #/patrocinar/pedir/obra/T/ep */
function pedirObra(it, s, ep){
  const nx = s ? { s, ep: ep || 1 } : nextEp(it);
  go('patrocinar', ['pedir', it._slug, ...(nx ? [nx.s, nx.ep] : [])]);
}
onRoute.patrocinar = rest => {
  if(rest[0] !== 'pedir' || !DATA_READY) return;
  const it = DATA.find(d => d._slug === rest[1]); if(!it) return;
  const s = parseInt(rest[2], 10) || 1, ep = parseInt(rest[3], 10) || 1;
  fillCalc({ titulo: it.t, tipo: tipoOf(it), dur: faixaPadrao(it), s, de: ep, ate: ep, lock: lockOf(it) });
  scrollToCalc();
};

if(calcBox){
  calcBox.addEventListener('click', e => {
    const t = e.target.closest('#calc-tipo [data-t]'); if(t){ if(calc.lock && calc.lock.tipo) return; calc.tipo = t.dataset.t; calc.dur = DUR[calc.tipo][0][0]; calcDraw(); return; }
    const d = e.target.closest('#calc-dur [data-d]'); if(d){ if(calc.lock && calc.lock.dur) return; calc.dur = d.dataset.d; calcDraw(); return; }
    if(e.target.closest('[data-pac]')){ const pc = PRECO().pacote; cIn('calc-ate').value = Math.min(calc.de, calc.ate) + pc.minEps - 1; calcRead(); calcDraw(); return; }
    if(e.target.closest('[data-next]')){ const nx = nextEp(findWork(cIn('calc-t').value)); if(nx){ cIn('calc-s').value = nx.s; cIn('calc-de').value = nx.ep; cIn('calc-ate').value = nx.ep; calcRead(); calcDraw(); } return; }
    const cp = e.target.closest('[data-copy-pedido]');
    if(cp){
      if(!cIn('calc-t').value.trim()){ cIn('calc-t').focus(); cIn('calc-t').classList.add('need'); setTimeout(() => cIn('calc-t').classList.remove('need'), 1200); return; }
      copyText(calcText(), () => { const o = cp.textContent; cp.textContent = 'Copiado! ✅'; setTimeout(() => cp.textContent = o, 1800); });
    }
  });
  calcBox.addEventListener('input', e => {
    if(e.target.id === 'calc-t'){
      const w = findWork(e.target.value);
      if(w){ calc.tipo = tipoOf(w); calc.dur = faixaPadrao(w); calc.lock = lockOf(w); const nx = nextEp(w); if(nx){ cIn('calc-s').value = nx.s; cIn('calc-de').value = nx.ep; cIn('calc-ate').value = nx.ep; } }
      else if(!picked) calc.lock = null;
    }
    calcRead(); calcDraw();
  });
}
/* (o campo "Obra" agora busca sozinho: as sugestões do catálogo entram junto com as do TMDB) */
function fillCalcList(){}

/* ===================== Escolher episódios na janela de detalhes (TMDB) ===================== */
function setupEpPicker(d, hit, tipo, runtime){
  const box = tmBox.querySelector('#tm-pick'); if(!box) return null;
  const seasons = (d.seasons||[]).filter(s => s.season_number > 0 && s.episode_count > 0);
  if(!seasons.length){ box.remove(); return null; }
  const st = { s: seasons[0].season_number, eps: [], sel: new Set(), loading: true };
  const nx = hit && nextEp(hit);
  if(nx && seasons.some(x => x.season_number === nx.s)) st.s = nx.s;
  const sBox = box.querySelector('.tm-seasons'), grid = box.querySelector('.tm-epgrid'), tot = box.querySelector('.tm-total');

  function draw(){
    sBox.innerHTML = seasons.length > 1 ? seasons.map(x => `<button class="lpill${x.season_number === st.s ? ' active' : ''}" type="button" data-s="${x.season_number}">T${x.season_number}</button>`).join('') : '';
    const done = doneEps(hit, st.s);
    grid.innerHTML = st.loading ? '<span class="tm-note">Carregando episódios…</span>'
      : st.eps.map(e => `<button class="tm-ep${st.sel.has(e.n) ? ' on' : ''}${done.has(e.n) ? ' done' : ''}" type="button" data-n="${e.n}" title="${esc(e.name||'')}${e.runtime ? ` · ${e.runtime} min` : ''}${done.has(e.n) ? ' · já reagido' : ''}">${e.n}</button>`).join('')
        || '<span class="tm-note">O TMDB não tem os episódios dessa temporada.</span>';
    const sel = [...st.sel].sort((a,b) => a - b);
    if(!sel.length){ tot.innerHTML = `<span class="tm-note">Toque nos episódios que você quer${done.size ? ' (os com ✓ a Bruh já reagiu)' : ''}.</span>`; return; }
    const rts = st.eps.filter(e => st.sel.has(e.n)).map(e => e.runtime).filter(Boolean);
    const q = quote({ hint: tipo, eps: sel.length, min: rts.length ? Math.round(rts.reduce((a,b) => a + b, 0) / rts.length) : runtime });
    tot.innerHTML = `<b>T${st.s} · ${sel.length > 1 ? 'eps' : 'ep'} ${ranges(sel)}</b>
      <span class="tm-tot-v">${q && q.valor != null ? fmtBRL(q.valor) : 'A combinar'}${q && q.bits ? ` <small>ou ${q.bits} bits</small>` : ''}</span>
      ${q ? `<span class="tm-note">${FAIXA_NOME[q.faixa]}${q.economia > 0 ? ` · pacote: você economiza ${fmtBRL(q.economia)}` : ''}</span>` : ''}`;
  }
  async function load(n){
    st.s = n; st.sel.clear(); st.eps = []; st.loading = true; draw();
    try{ const j = await tmdb(`/tv/${d.id}/season/${n}`); if(st.s !== n) return; st.eps = (j.episodes||[]).map(e => ({ n: e.episode_number, runtime: e.runtime, name: e.name })); }catch(e){}
    st.loading = false; draw();
  }
  box.addEventListener('click', e => {
    const sb = e.target.closest('[data-s]'); if(sb){ load(+sb.dataset.s); return; }
    const eb = e.target.closest('[data-n]'); if(eb){ const n = +eb.dataset.n; st.sel.has(n) ? st.sel.delete(n) : st.sel.add(n); draw(); }
  });
  load(st.s);
  return st;
}

/* ===================== "Últimos patrocínios" (aba Patrocinar) =====================
   Duas faixas, tudo vindo do Trello pelo robô: o que está pago e esperando a vez (fila do cronograma)
   e os últimos reacts patrocinados que já subiram (episódios com nick, do mais novo pro mais antigo). */
function renderRecentPat(){
  const box = document.getElementById('recent-pat'); if(!box || !DATA_READY) return;
  const fila = (typeof CRONO !== 'undefined' && CRONO && CRONO.fila) || [];
  const done = DATA.filter(d => d.cat !== 'vods' && (d.pat||[]).length && (d.upd || d.add) && statusOf(d) !== 'fila' && statusOf(d) !== 'embreve')
    .sort((a,b) => lastDate(b).localeCompare(lastDate(a))).slice(0, 10);
  if(!fila.length && !done.length){ box.hidden = true; return; }
  const chip = (nick, titulo, sub, href) => `<${href ? `a href="${href}"` : 'span'} class="rp-chip"><b>💜 ${esc(nick)}</b><span>${esc(titulo)}${sub ? ` · ${esc(sub)}` : ''}</span></${href ? 'a' : 'span'}>`;
  const lastPor = d => { const eps = d.seasons ? d.seasons.flatMap(s => s.ep || []) : (d.episodes || []); const e = [...eps].reverse().find(x => x.por); return e ? e.por : d.pat.join(', '); };
  box.innerHTML = `
    <h3 class="pick-title">💜 Últimos patrocínios</h3>
    <p class="pick-sub">Obrigada a quem faz o Cinebruh acontecer! Os nomes vêm direto do Trello da Bruna.</p>
    ${fila.length ? `<div class="rp-h">📅 Pagos, esperando a vez <span class="cm-count">${fila.length}</span></div>
      <div class="rp-row">${fila.slice(0, 14).map(f => chip(f.patrocinador || 'Patrocinado', f.titulo, f.eps || '')).join('')}</div>` : ''}
    ${done.length ? `<div class="rp-h">✅ Reagidos recentemente</div>
      <div class="rp-row">${done.map(d => chip(lastPor(d), d.t, '', workHash(d))).join('')}</div>` : ''}
    <a class="mk-link" href="#/cronograma" data-nav="cronograma">Ver a fila completa no cronograma →</a>`;
  box.hidden = false;
}

/* ===================== "Quer o próximo episódio?" no player ===================== */
function renderAsk(st){
  const el = player.querySelector('.player-ask'); if(!el) return;
  const it = st && st.slug && DATA_READY ? DATA.find(d => d._slug === st.slug) : null;
  // obra completa ou já paga inteira (o robô marca "pago" pelo Trello): não tem o que oferecer
  const nx = it && statusOf(it) !== 'completo' && !it.pago ? nextEp(it) : null;
  if(!nx || !PRECO()){ el.hidden = true; el.innerHTML = ''; return; }
  const multi = it.seasons && it.seasons.filter(x => x.n != null).length > 1;
  const q = quote({ eps: 1, faixa: faixaPadrao(it) });
  const tT = multi ? ` da T${nx.s}` : '';
  const msg = nx.last && nx.pago ? `A Bruh parou no <b>ep ${nx.last}${tT}</b> e até o <b>ep ${nx.pago}</b> já está patrocinado. Quer o seguinte?`
    : nx.last ? `A Bruh parou no <b>ep ${nx.last}${tT}</b>. Quer o próximo?`
    : nx.pago ? `Até o <b>ep ${nx.pago}${tT}</b> já está patrocinado. Quer o seguinte?`
    : nx.fimT ? `A Bruh terminou a <b>T${nx.fimT}</b>. Quer ver a T${nx.s}?` : 'Quer ver a Bruh começando essa?';
  el.innerHTML = `<span>${msg}</span><button class="cta" type="button" data-ask>💰 Patrocinar o ep ${nx.ep}${q && q.valor != null ? ` · ${fmtBRL(q.valor)}` : ''}</button>`;
  el.hidden = false;
  el.querySelector('[data-ask]').onclick = () => { closePlayer(); pedirObra(it, nx.s, nx.ep); };
}
