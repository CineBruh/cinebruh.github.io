/* ===== Cinebruh · apoiar: Pix, outras formas de doação, bits, parede do amor, apoio sem gastar e subs ===== */
function renderApoiar(site){
  const el = document.getElementById('apoiar-box');
  const d = site.doacoes || {};
  const pix = d.principal;
  const outras = d.outras || [];
  const ind = (site.apoioIndireto || []);
  const parc = ((site.canal || {}).parcerias || []).filter(p => p.cupom);
  const subs = site.subs || {};
  const ICO = {livepix:'💸', pixgg:'⚡', wise:'🌍', incentive:'🎯', amazon:'📦', 'amazon-wishlist':'🎁', 'steam-wishlist':'🎮', epic:'🕹️'};

  el.innerHTML = `
    ${pix ? `<div class="ap-pix">
      <div class="ap-pix-tx">
        <span class="mk-kicker">Forma principal</span>
        <h3>🔑 ${esc(pix.nome)} direto pra Bruh</h3>
        <p>${esc(pix.desc || '')}</p>
        <div class="ap-key"><code>${esc(pix.chave)}</code><button class="cta" type="button" data-copy="${esc(pix.chave)}">Copiar chave</button></div>
        <span class="ap-small">Chave ${esc(pix.tipoChave || '')}</span>
      </div>
    </div>` : ''}

    ${outras.length ? [['Com mensagem na tela', outras.filter(o => o.tela)], ['Outras formas de doar', outras.filter(o => !o.tela)]]
      .filter(([, l]) => l.length).map(([tit, l]) => `<h3 class="mk-h">${tit}</h3>
    <div class="link-grid">${l.map(o=>`<a class="link-tile" href="${esc(o.url)}" target="_blank" rel="noopener"><span class="ic">${ICO[o.id]||'💜'}</span><span class="txt"><b>${esc(o.nome)}</b><span>${esc(o.desc||'')}</span></span></a>`).join('')}</div>`).join('') : ''}

    ${d.aviso ? `<div class="setup-note" style="margin-top:18px">ℹ️ <span>${esc(d.aviso)}</span></div>` : ''}

    ${ind.length || parc.length ? `<h3 class="mk-h">Apoie sem gastar nada a mais</h3>
    <div class="link-grid">
      ${ind.map(a => a.url
        ? `<a class="link-tile" href="${esc(a.url)}" target="_blank" rel="noopener${a.id==='amazon'?' sponsored':''}"><span class="ic">${ICO[a.id]||'💜'}</span><span class="txt"><b>${esc(a.nome)}</b><span>${esc(a.desc||'')}</span></span></a>`
        : `<button class="link-tile ap-btn" type="button" data-copy="${esc(a.codigo||'')}"><span class="ic">${ICO[a.id]||'💜'}</span><span class="txt"><b>${esc(a.nome)}: ${esc(a.codigo||'')}</b><span>${esc(a.desc||'')} · clique p/ copiar</span></span></button>`).join('')}
      ${parc.map(p=>`<button class="link-tile ap-btn" type="button" data-copy="${esc(p.cupom)}"><span class="ic">🏷️</span><span class="txt"><b>${esc(p.nome)} · ${esc(p.cupom)}</b><span>${esc(p.desconto)} de desconto · clique p/ copiar</span></span></button>`).join('')}
    </div>` : ''}

    ${d.bits && (d.bits.alertas||[]).length ? `<h3 class="mk-h">Alertas de bits</h3>
    <p class="band-sub" style="margin-top:-6px">${esc(d.bits.desc||'')}</p>
    <div class="ap-bits">${d.bits.alertas.map(b=>`<div class="ap-bit"><b>💎 ${esc(b.bits)}</b><span>${esc(b.som)}</span></div>`).join('')}</div>` : ''}

    ${d.parede ? `<h3 class="mk-h">💗 ${esc(d.parede.nome)}</h3>
    <div class="mk-card"><p>${esc(d.parede.desc||'')}</p>
      <div class="mk-cats" style="margin-top:10px">${(d.parede.formas||[]).map(f=>`<span class="chip">${esc(f)}</span>`).join('')}</div></div>` : ''}

    ${(subs.beneficios||[]).length ? `<h3 class="mk-h">🦩 ${esc(subs.titulo || 'Seja sub')}</h3>
    <div class="mk-card">
      <ul class="ap-subs">${subs.beneficios.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>
      <div class="cta-row" style="margin-top:14px"><a class="cta" href="https://www.twitch.tv/subs/brunarodrigues" target="_blank" rel="noopener">💜 Inscrever-se na Twitch</a></div>
    </div>` : ''}`;
}

document.getElementById('apoiar-box').addEventListener('click', e=>{
  const b = e.target.closest('[data-copy]'); if(!b || !b.dataset.copy) return;
  const original = b.innerHTML;
  copyText(b.dataset.copy, ()=>{ b.innerHTML = '<span class="txt"><b>Copiado! ✅</b></span>'; setTimeout(()=>b.innerHTML = original, 1600); });
});
