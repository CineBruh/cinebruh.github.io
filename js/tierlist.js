/* ===== Cinebruh · tier list: a da Bruh (montada pelas notas) e a do visitante (arrastar capas, salvar e baixar imagem) ===== */
const TIERS = [
  {k:'S', c:'#ff4d6d'}, {k:'A', c:'#ff9f1c'}, {k:'B', c:'#ffd23f'},
  {k:'C', c:'#3ddc97'}, {k:'D', c:'#4ea8de'}, {k:'F', c:'#a78bfa'},
];
const TL_KEY = 'bru-tier';
const tierOfNota = n => n >= 10 ? 'S' : n >= 9 ? 'A' : n >= 8 ? 'B' : n >= 7 ? 'C' : n >= 5 ? 'D' : 'F';
const emptyTiers = () => TIERS.reduce((o,t)=>(o[t.k] = [], o), {});
let tlMode = 'bruh', tlCat = 'todos', tlQuery = '', tlSel = null, tlJustDragged = false;
let tlMine = tlLoad();

function tlLoad(){
  try{
    const j = JSON.parse(localStorage.getItem(TL_KEY) || '{}');
    return TIERS.reduce((o,t)=>(o[t.k] = Array.isArray(j[t.k]) ? j[t.k] : [], o), {});
  }catch(e){ return emptyTiers(); }
}
function tlSave(){ try{ localStorage.setItem(TL_KEY, JSON.stringify(tlMine)); }catch(e){} }

function coverSrc(it){ const f = IMG_MAP[it.t] || it.img; return f ? (/^https?:\/\//.test(f) ? f : `images/${f}`) : ''; }
const tlEligible = () => DATA.filter(d => d.cat !== 'vods' && statusOf(d) !== 'fila' && statusOf(d) !== 'embreve');
const bySlug = s => DATA.find(d => d._slug === s);

/* capa pequena: link pro react (tier da Bruh e favoritas) ou peça arrastável (tier do visitante) */
function tlItem(it, opts = {}){
  const grads = CAT_GRADS[it.cat] || CAT_GRADS.filmes;
  const g = grads[(it._i || 0) % grads.length];
  const src = coverSrc(it);
  const inner = `<span class="tl-em">${esc(it.em || '🎬')}</span>`
    + (src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false" onerror="this.remove()">` : '')
    + `<span class="tl-name">${esc(it.t)}</span>`
    + (opts.nota && it.nota ? `<b class="tl-nota">★${it.nota}</b>` : '');
  const style = `--c1:${g[0]};--c2:${g[1]}`;
  if(opts.link) return `<a class="tl-item" href="${workHash(it)}" title="${esc(it.t)}" style="${style}">${inner}</a>`;
  return `<div class="tl-item${tlSel === it._slug ? ' sel' : ''}" data-slug="${esc(it._slug)}" title="${esc(it.t)}" style="${style}" role="button" tabindex="0">${inner}</div>`;
}

function bruhTiers(){
  const o = emptyTiers();
  tlEligible().filter(d => d.nota && (tlCat === 'todos' || d.cat === tlCat))
    .sort((a,b) => b.nota - a.nota || a.t.localeCompare(b.t, 'pt'))
    .forEach(d => o[tierOfNota(d.nota)].push(d));
  return o;
}
const mineTiers = () => TIERS.reduce((o,t)=>(o[t.k] = tlMine[t.k].map(bySlug).filter(Boolean), o), {});

function tlPool(){
  const placed = new Set(Object.values(tlMine).flat());
  const q = tlQuery.trim().toLowerCase();
  return tlEligible().filter(d => !placed.has(d._slug) && (tlCat === 'todos' || d.cat === tlCat) && (!q || d.t.toLowerCase().includes(q)));
}

/* em quantas das obras com nota o visitante colocou na mesma fileira que a Bruh */
function tlAgreement(){
  let n = 0, same = 0;
  for(const k in tlMine) tlMine[k].forEach(s => { const it = bySlug(s); if(it && it.nota){ n++; if(tierOfNota(it.nota) === k) same++; } });
  return n >= 3 ? Math.round(same / n * 100) : null;
}

function rowsHTML(tiers, editable){
  return `<div class="tl-board">${TIERS.map(t => `<div class="tl-row">
    <div class="tl-lab" style="background:${t.c}"${editable ? ` data-drop="${t.k}" role="button" tabindex="0" title="Colocar na ${t.k}"` : ''}>${t.k}</div>
    <div class="tl-cells"${editable ? ` data-drop="${t.k}"` : ''}>${tiers[t.k].map(it => tlItem(it, {link:!editable, nota:!editable})).join('')
      || `<span class="tl-hint">${editable ? 'Arraste capas pra cá' : '—'}</span>`}</div>
  </div>`).join('')}</div>`;
}

function tlCatsHTML(){
  const cats = ORDER.filter(k => k !== 'vods' && tlEligible().some(d => d.cat === k));
  return `<div class="tl-cats">${['todos', ...cats].map(k => `<button class="lpill${tlCat === k ? ' active' : ''}" type="button" data-cat="${k}">${k === 'todos' ? 'Tudo' : CAT_LABEL[k]}</button>`).join('')}</div>`;
}

function renderTier(){
  const el = document.getElementById('tier-box');
  if(!DATA_READY){ el.innerHTML = '<p class="home-desc">Carregando o catálogo…</p>'; return; }
  const tabs = `<div class="tl-tabs">
    <a class="lpill${tlMode === 'bruh' ? ' active' : ''}" href="#/tierlist">⭐ Da Bruh</a>
    <a class="lpill${tlMode === 'sua' ? ' active' : ''}" href="#/tierlist/sua">✍️ Monte a sua</a></div>`;

  if(tlMode === 'bruh'){
    const t = bruhTiers(), total = Object.values(t).flat().length;
    el.innerHTML = `${tabs}
      <p class="band-sub">Montada sozinha com as notas que a Bruh deu: <b>S</b> = 10 · <b>A</b> = 9 · <b>B</b> = 8 · <b>C</b> = 7 · <b>D</b> = 5 e 6 · <b>F</b> = 4 ou menos. Clique numa capa pra ver o react.</p>
      ${tlCatsHTML()}
      ${total ? rowsHTML(t, false) : '<div class="soon"><p>Ainda não tem obra com nota nessa categoria.</p></div>'}
      <div class="tl-actions">
        ${total ? '<button class="cta alt" type="button" id="tl-png">⬇ Baixar imagem</button>' : ''}
        <a class="cta" href="#/tierlist/sua">✍️ Montar a minha</a>
      </div>`;
    return;
  }

  const mine = mineTiers(), placed = Object.values(mine).flat().length, ag = tlAgreement();
  const sel = tlSel && bySlug(tlSel);
  el.innerHTML = `${tabs}
    <p class="band-sub">Arraste as capas pras fileiras. No celular, toque numa capa e escolha a fileira. Fica salva neste navegador.</p>
    ${ag !== null ? `<div class="tl-agree">🤝 Você concorda com a Bruh em <b>${ag}%</b> das obras que ela deu nota</div>` : ''}
    ${rowsHTML(mine, true)}
    <div class="tl-actions">
      ${placed ? '<button class="cta" type="button" id="tl-png">⬇ Baixar imagem</button><button class="cta alt" type="button" id="tl-reset">Recomeçar</button>' : ''}
      <a class="cta alt" href="#/tierlist">Ver a da Bruh</a>
    </div>
    <h3 class="mk-h">Capas <span class="cm-count" id="tl-count"></span></h3>
    <div class="tl-poolbar"><input class="cm-q" id="tl-q" type="search" placeholder="Procurar obra…" aria-label="Procurar obra" value="${esc(tlQuery)}">${tlCatsHTML()}</div>
    <div class="tl-pool" id="tl-pool" data-drop="pool"></div>
    ${sel ? `<div class="tl-selbar" role="dialog" aria-label="Escolher fileira">
      <span class="tl-selname">Colocar <b>${esc(sel.t)}</b> em:</span>
      <div class="tl-selbtns">${TIERS.map(t => `<button type="button" data-put="${t.k}" style="background:${t.c}">${t.k}</button>`).join('')}
        ${Object.values(tlMine).flat().includes(tlSel) ? '<button type="button" data-put="pool" class="out" title="Tirar da tier list">↩</button>' : ''}
        <button type="button" data-put="" class="out" title="Cancelar">✕</button></div>
    </div>` : ''}`;
  renderPool();
}
function renderPool(){
  const box = document.getElementById('tl-pool'); if(!box) return;
  const pool = tlPool();
  box.innerHTML = pool.map(it => tlItem(it)).join('')
    || `<span class="tl-hint">${tlQuery ? 'Nenhuma obra com esse nome.' : 'Todas as capas já estão na sua tier list 🎉'}</span>`;
  const c = document.getElementById('tl-count'); if(c) c.textContent = pool.length;
}

function tlMove(slug, dest, beforeSlug){
  if(!slug) return;
  for(const k in tlMine) tlMine[k] = tlMine[k].filter(s => s !== slug);
  if(dest && dest !== 'pool'){
    const arr = tlMine[dest], i = beforeSlug ? arr.indexOf(beforeSlug) : -1;
    if(i >= 0) arr.splice(i, 0, slug); else arr.push(slug);
  }
  tlSel = null; tlSave(); renderTier();
}

/* ---------- toques e cliques ---------- */
const tierBox = document.getElementById('tier-box');
tierBox.addEventListener('click', e => {
  const cat = e.target.closest('[data-cat]');
  if(cat){ tlCat = cat.dataset.cat; renderTier(); return; }
  if(e.target.closest('#tl-png')){ tlExport(e.target.closest('#tl-png')); return; }
  if(e.target.closest('#tl-reset')){
    if(confirm('Apagar a sua tier list e começar de novo?')){ tlMine = emptyTiers(); tlSel = null; tlSave(); renderTier(); }
    return;
  }
  const put = e.target.closest('[data-put]');
  if(put){ if(put.dataset.put) tlMove(tlSel, put.dataset.put); else { tlSel = null; renderTier(); } return; }
  if(tlJustDragged) return;
  const item = e.target.closest('.tl-item[data-slug]');
  if(item){
    const s = item.dataset.slug;
    /* com uma capa escolhida, tocar em outra capa que já está numa fileira coloca a escolhida antes dela */
    const zone = item.closest('[data-drop]').dataset.drop;
    if(tlSel && tlSel !== s && zone !== 'pool') tlMove(tlSel, zone, s);
    else { tlSel = tlSel === s ? null : s; renderTier(); }
    return;
  }
  const drop = e.target.closest('[data-drop]');
  if(drop && tlSel) tlMove(tlSel, drop.dataset.drop);
});
tierBox.addEventListener('keydown', e => {
  if((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tl-item[data-slug], .tl-lab[data-drop]')){ e.preventDefault(); e.target.click(); }
  if(e.key === 'Escape' && tlSel){ tlSel = null; renderTier(); }
});
tierBox.addEventListener('input', e => { if(e.target.id === 'tl-q'){ tlQuery = e.target.value; renderPool(); } });

/* ---------- arrastar com o mouse ---------- */
let tlDrag = null;
tierBox.addEventListener('pointerdown', e => {
  const item = e.target.closest('.tl-item[data-slug]');
  if(!item || e.pointerType === 'touch' || e.button !== 0) return;
  tlDrag = { el:item, slug:item.dataset.slug, x:e.clientX, y:e.clientY, ghost:null, over:null };
});
window.addEventListener('pointermove', e => {
  if(!tlDrag) return;
  if(!tlDrag.ghost){
    if(Math.hypot(e.clientX - tlDrag.x, e.clientY - tlDrag.y) < 6) return;
    tlDrag.ghost = tlDrag.el.cloneNode(true);
    tlDrag.ghost.classList.add('tl-ghost'); tlDrag.ghost.classList.remove('sel');
    document.body.appendChild(tlDrag.ghost);
    tlDrag.el.classList.add('dragging');
    document.body.style.cursor = 'grabbing';
  }
  tlDrag.ghost.style.left = e.clientX + 'px'; tlDrag.ghost.style.top = e.clientY + 'px';
  const z = (document.elementFromPoint(e.clientX, e.clientY) || document.body).closest('#tier-box [data-drop]');
  if(z !== tlDrag.over){
    if(tlDrag.over) tlDrag.over.classList.remove('over');
    if(z) z.classList.add('over');
    tlDrag.over = z;
  }
});
window.addEventListener('pointerup', e => {
  if(!tlDrag) return;
  const d = tlDrag; tlDrag = null;
  if(!d.ghost) return;
  d.ghost.remove(); d.el.classList.remove('dragging'); document.body.style.cursor = '';
  if(d.over) d.over.classList.remove('over');
  tlJustDragged = true; setTimeout(() => tlJustDragged = false, 0);
  if(!d.over) return;
  /* soltou em cima de outra capa: entra antes ou depois dela, conforme o lado */
  let before = null;
  const on = (document.elementFromPoint(e.clientX, e.clientY) || document.body).closest('.tl-item[data-slug]');
  if(on && on !== d.el && d.over.contains(on)){
    const r = on.getBoundingClientRect();
    if(e.clientX < r.left + r.width / 2) before = on.dataset.slug;
    else { const nx = on.nextElementSibling; before = nx && nx.dataset.slug !== d.slug ? (nx.dataset.slug || null) : null; }
  }
  tlMove(d.slug, d.over.dataset.drop, before);
});

/* ---------- baixar como imagem ---------- */
/* As capas da página foram carregadas SEM CORS; o navegador reaproveita essa cópia e o canvas recusa desenhar
   (só as capas locais, de images/, apareciam). Por isso as capas de fora vêm de novo com um "?cors=1" no fim:
   endereço diferente = download novo, já com permissão pra desenhar. */
function tlLoadImg(src){
  return new Promise(res => {
    if(!src) return res(null);
    const remoto = /^https?:\/\//.test(src) && !src.startsWith(location.origin);
    const i = new Image(); i.crossOrigin = 'anonymous'; i.referrerPolicy = 'no-referrer';
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = remoto ? src + (src.includes('?') ? '&' : '?') + 'cors=1' : src;
  });
}
function tlRound(x, X, Y, W, H, r){ x.beginPath(); if(x.roundRect) x.roundRect(X, Y, W, H, r); else x.rect(X, Y, W, H); }

async function tlExport(btn){
  const old = btn.textContent; btn.textContent = 'Gerando…'; btn.disabled = true;
  try{
    const tiers = tlMode === 'bruh' ? bruhTiers() : mineTiers();
    const W = 1200, PAD = 28, LAB = 100, CW = 84, CH = 126, G = 8, HEAD = 96, FOOT = 54;
    const perRow = Math.floor((W - PAD*2 - LAB - G) / (CW + G));
    const rowsH = TIERS.map(t => Math.max(1, Math.ceil(tiers[t.k].length / perRow)) * (CH + G) + G);
    const H = HEAD + rowsH.reduce((a,b) => a + b, 0) + (TIERS.length - 1) * 4 + FOOT;
    const cv = document.createElement('canvas'), S = 2;
    cv.width = W * S; cv.height = H * S;
    const x = cv.getContext('2d'); x.scale(S, S);
    const dark = root.getAttribute('data-theme') === 'dark';
    const disp = getComputedStyle(document.body).getPropertyValue('--display').trim() || 'system-ui';
    const ink = dark ? '#fff' : '#1a0f14';

    x.fillStyle = dark ? '#1a0f14' : '#fff4f8'; x.fillRect(0, 0, W, H);
    x.fillStyle = ink; x.font = `36px ${disp}`; x.textBaseline = 'alphabetic';
    x.fillText((tlMode === 'bruh' ? 'TIER LIST DA BRUH' : 'MINHA TIER LIST DO CINEBRUH'), PAD, 56);
    x.font = '600 16px system-ui, sans-serif'; x.globalAlpha = .7;
    x.fillText(tlCat === 'todos' ? 'Animes, filmes, séries e mais' : CAT_LABEL[tlCat], PAD, 80); x.globalAlpha = 1;

    const all = TIERS.flatMap(t => tiers[t.k]);
    const imgs = new Map(await Promise.all(all.map(async it => [it._slug, await tlLoadImg(coverSrc(it))])));

    let y = HEAD;
    TIERS.forEach((t, ti) => {
      const h = rowsH[ti];
      x.fillStyle = dark ? '#2a1a22' : '#ffffff'; x.fillRect(PAD, y, W - PAD*2, h);
      x.fillStyle = t.c; x.fillRect(PAD, y, LAB, h);
      x.fillStyle = '#1a0f14'; x.font = `44px ${disp}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(t.k, PAD + LAB/2, y + h/2); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      tiers[t.k].forEach((it, n) => {
        const cx = PAD + LAB + G + (n % perRow) * (CW + G), cy = y + G + Math.floor(n / perRow) * (CH + G);
        const im = imgs.get(it._slug);
        x.save(); tlRound(x, cx, cy, CW, CH, 8); x.clip();
        if(im){
          const r = Math.max(CW / im.width, CH / im.height), iw = im.width * r, ih = im.height * r;
          x.drawImage(im, cx + (CW - iw)/2, cy + (CH - ih)/2, iw, ih);
        } else {
          const grads = CAT_GRADS[it.cat] || CAT_GRADS.filmes, g = grads[(it._i || 0) % grads.length];
          const gr = x.createLinearGradient(cx, cy, cx + CW, cy + CH); gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]);
          x.fillStyle = gr; x.fillRect(cx, cy, CW, CH);
          x.fillStyle = '#fff'; x.font = '800 11px system-ui, sans-serif';
          const words = it.t.split(/\s+/); let line = '', ly = cy + 20;
          for(const w of words){
            if(x.measureText(line + w).width > CW - 10 && line){ x.fillText(line.trim(), cx + 5, ly); line = ''; ly += 13; if(ly > cy + CH - 8) break; }
            line += w + ' ';
          }
          if(ly <= cy + CH - 8) x.fillText(line.trim(), cx + 5, ly);
        }
        x.restore();
      });
      y += h + 4;
    });

    x.fillStyle = ink; x.globalAlpha = .75; x.font = '700 16px system-ui, sans-serif';
    x.fillText('cinebruh.github.io · reacts da Bruna Rodrigues', PAD, H - 22); x.globalAlpha = 1;

    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'tier-list-cinebruh.png', {type:'image/png'});
    if(matchMedia('(hover: none)').matches && navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'Minha tier list do Cinebruh'}).catch(()=>{});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  }catch(err){
    alert('Não consegui gerar a imagem 😢 Tenta de novo ou tira um print.');
  }
  btn.textContent = old; btn.disabled = false;
}

onRoute.tierlist = rest => { tlMode = rest[0] === 'sua' ? 'sua' : 'bruh'; tlSel = null; renderTier(); };
onLeave.push(() => { tlSel = null; });
