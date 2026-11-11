/* ===== Cinebruh · comunidade: espaços da Família Goiabinha, pontos, música, comandos do chat e regras ===== */
const CMD_GROUPS = [
  ['canal','📢 Canal'], ['cinebruh','🎬 Cinebruh'], ['apoio','💜 Apoio'],
  ['musica','🎵 Música'], ['pontos','🦩 Pontos'], ['diversao','🎉 Diversão'],
];
const CMD_QUEM = {subs:'Subs', mods:'Mods'};
let cmdGroup = '';

function rulesHTML(titulo, icone, lista){
  if(!(lista||[]).length) return '';
  return `<details class="cm-rules" open>
    <summary><span>${icone}</span> ${esc(titulo)} <em>${lista.length} regras</em></summary>
    <ol>${lista.map(r=>`<li>${esc(r)}</li>`).join('')}</ol>
  </details>`;
}

function cmdRows(cmds, q){
  q = (q||'').trim().toLowerCase();
  const list = cmds.filter(c => (!cmdGroup || c.grupo === cmdGroup) && (!q || (c.cmd+' '+(c.desc||'')).toLowerCase().includes(q)));
  if(!list.length) return '<p class="cm-empty">Nenhum comando com esse nome.</p>';
  return list.map(c=>`<button class="cm-cmd" type="button" data-copy="${esc(c.cmd)}" title="Copiar">
    <code>${esc(c.cmd)}</code><span>${esc(c.desc||'')}</span>${CMD_QUEM[c.quem] ? `<em>${CMD_QUEM[c.quem]}</em>` : ''}
  </button>`).join('');
}

function spaceHTML(s){
  const body = `${brandIcon(s.id)}<b>${esc(s.nome)}</b><span>${esc(s.desc||'')}</span>`;
  if(s.copiar) return `<button class="cm-space cm-${esc(s.id)}" type="button" data-copy="${esc(s.copiar)}">${body}<em data-cta>${esc(s.cta||'Copiar')} ⧉</em></button>`;
  const href = s.nav ? '#/'+s.nav : s.url;
  const ext = !s.nav && /^https?:/.test(href);
  return `<a class="cm-space cm-${esc(s.id)}" href="${esc(href)}"${s.nav?` data-nav="${esc(s.nav)}"`:''}${ext?' target="_blank" rel="noopener"':''}>
    ${body}<em>${esc(s.cta||'Abrir')} ${ext?'↗':'→'}</em></a>`;
}

function renderComunidade(site){
  const el = document.getElementById('comunidade-box');
  const cm = site.comunidade || {};
  const rg = site.regras || {};
  const cmds = cm.comandos || [];
  const mu = cm.musica, pt = cm.pontos;
  const groups = CMD_GROUPS.filter(([id]) => cmds.some(c => c.grupo === id));

  el.innerHTML = `
    ${cm.intro ? `<p class="band-sub">${esc(cm.intro)}</p>` : ''}

    <div class="cm-spaces">${(cm.espacos||[]).map(spaceHTML).join('')}</div>

    ${(mu || pt) ? `<div class="mk-pub" style="margin-top:22px">
      ${mu ? `<div class="mk-card"><h4>🎵 Pedidos de música</h4>
        <p>${esc(mu.desc||'')}</p>
        ${mu.comando ? `<button class="cm-cmd" type="button" data-copy="!sr " style="margin-top:10px"><code>${esc(mu.comando)}</code><span>Copiar o !sr</span></button>` : ''}
        ${(mu.regras||[]).length ? `<div class="mk-cats" style="margin-top:10px">${mu.regras.map(r=>`<span class="chip">${esc(r)}</span>`).join('')}</div>` : ''}
        ${mu.url ? `<a class="mk-link" href="${esc(mu.url)}" target="_blank" rel="noopener">Ver a fila e o que está tocando ↗</a>` : ''}
      </div>` : ''}
      ${pt ? `<div class="mk-card"><h4>🦩 ${esc(pt.nome||'Pontos do canal')}</h4>
        <p>${esc(pt.desc||'')}</p>
        <div class="cta-row" style="margin-top:12px">
          ${pt.loja ? `<a class="cta" href="${esc(pt.loja)}" target="_blank" rel="noopener">🛍️ Loja de pontos</a>` : ''}
          ${pt.ranking ? `<a class="cta alt" href="${esc(pt.ranking)}" target="_blank" rel="noopener">🏆 Ranking</a>` : ''}
        </div>
      </div>` : ''}
    </div>` : ''}

    ${cmds.length ? `<h3 class="mk-h">Comandos do chat <span class="cm-count">${cmds.length}</span></h3>
      <div class="cm-tools">
        <input class="cm-q" id="cm-q" type="search" placeholder="Procurar comando…" aria-label="Procurar comando">
        ${groups.length > 1 ? `<div class="cm-groups" id="cm-groups">
          <button class="lpill active" type="button" data-g="">Todos</button>
          ${groups.map(([id,l])=>`<button class="lpill" type="button" data-g="${id}">${l}</button>`).join('')}
        </div>` : ''}
      </div>
      <div class="cm-cmds" id="cm-cmds">${cmdRows(cmds)}</div>
      <p class="cm-tip">Clique num comando pra copiar e cole no chat da live.</p>` : ''}

    ${(rg.live||[]).length || (rg.discord||[]).length ? `<h3 class="mk-h">Regras</h3>
      <div class="cm-rules-grid">${rulesHTML('Na live', '📺', rg.live)}${rulesHTML('No Discord', '💬', rg.discord)}</div>` : ''}`;

  const q = document.getElementById('cm-q');
  const redraw = ()=>{ document.getElementById('cm-cmds').innerHTML = cmdRows(cmds, q && q.value); };
  if(q) q.addEventListener('input', redraw);
  const gp = document.getElementById('cm-groups');
  if(gp) gp.addEventListener('click', e=>{
    const b = e.target.closest('[data-g]'); if(!b) return;
    cmdGroup = b.dataset.g;
    gp.querySelectorAll('[data-g]').forEach(x=>x.classList.toggle('active', x === b));
    redraw();
  });

  /* no celular, as regras começam fechadas pra aba não ficar enorme */
  if(matchMedia('(max-width: 699px)').matches) el.querySelectorAll('.cm-rules').forEach(d=>d.open = false);
}

document.getElementById('comunidade-box').addEventListener('click', e=>{
  const b = e.target.closest('[data-copy]'); if(!b) return;
  const cta = b.querySelector('[data-cta]');
  copyText(b.dataset.copy, ()=>{
    b.classList.add('ok');
    const old = cta && cta.textContent; if(cta) cta.textContent = 'Copiado! ✅';
    setTimeout(()=>{ b.classList.remove('ok'); if(cta) cta.textContent = old; }, 1400);
  });
});
