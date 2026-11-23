/* ===== Cinebruh · apoiar: Pix, outras formas de doação, bits, parede do amor, apoio sem gastar e subs ===== */
function renderApoiar(site){
  const el = document.getElementById('apoiar-box');
  const d = site.doacoes || {};
  const pix = d.principal;
  const outras = d.outras || [];
  const ind = (site.apoioIndireto || []);
  const parc = ((site.canal || {}).parcerias || []).filter(p => p.cupom);
  const subs = site.subs || {};
  const apiUrl = (site.api && site.api.livepix && site.api.url) ? String(site.api.url).replace(/\/+$/, '') : null;
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

    ${apiUrl ? `<form class="ap-don" id="ap-don" novalidate>
      <span class="mk-kicker">Com mensagem na tela</span>
      <h3>💸 Enviar Pix pelo LivePix</h3>
      <p>Escolha o valor, escreva sua mensagem e vá direto pro pagamento.</p>
      <div class="ap-don-presets">
        ${[5, 10, 20, 50].map(v => `<button class="lpill" type="button" data-don-v="${v}">R$${v}</button>`).join('')}
      </div>
      <div class="ap-don-grid">
        <label class="ap-don-f"><span>Seu nome / nick</span><input id="don-nome" type="text" maxlength="40" placeholder="Como aparece na tela" autocomplete="off"></label>
        <label class="ap-don-f"><span>Valor (R$)</span><input id="don-val" type="number" min="2" max="5000" step="1" value="10" inputmode="decimal"></label>
        <label class="ap-don-f ap-don-wide"><span>Mensagem</span><input id="don-msg" type="text" maxlength="250" placeholder="Mande um recado pra Bruna…" autocomplete="off"></label>
      </div>
      <div class="cta-row" style="margin-top:16px">
        <button class="cta" type="submit" id="don-go">💸 Gerar Pix no LivePix</button>
        <span class="ap-don-err" id="don-err" role="status" aria-live="polite"></span>
      </div>
    </form>` : ''}

    ${outras.length ? [['Com mensagem na tela', outras.filter(o => o.tela)], ['Outras formas de doar', outras.filter(o => !o.tela)]]
      .filter(([, l]) => l.length).map(([tit, l]) => `<h3 class="mk-h">${tit}</h3>
    <div class="link-grid">${l.map(o=>`<a class="link-tile" href="${escUrl(o.url)}" target="_blank" rel="noopener"><span class="ic">${ICO[o.id]||'💜'}</span><span class="txt"><b>${esc(o.nome)}</b><span>${esc(o.desc||'')}</span></span></a>`).join('')}</div>`).join('') : ''}

    ${d.aviso ? `<div class="setup-note" style="margin-top:18px">ℹ️ <span>${esc(d.aviso)}</span></div>` : ''}

    ${ind.length || parc.length ? `<h3 class="mk-h">Apoie sem gastar nada a mais</h3>
    <div class="link-grid">
      ${ind.map(a => a.url
        ? `<a class="link-tile" href="${escUrl(a.url)}" target="_blank" rel="noopener${a.id==='amazon'?' sponsored':''}"><span class="ic">${ICO[a.id]||'💜'}</span><span class="txt"><b>${esc(a.nome)}</b><span>${esc(a.desc||'')}</span></span></a>`
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
  const pv = e.target.closest('[data-don-v]');
  if(pv){
    const inp = document.getElementById('don-val');
    if(inp) inp.value = pv.dataset.donV;
    return;
  }
  const b = e.target.closest('[data-copy]'); if(!b || !b.dataset.copy) return;
  const original = b.innerHTML;
  copyText(b.dataset.copy, ()=>{ b.innerHTML = '<span class="txt"><b>Copiado! ✅</b></span>'; setTimeout(()=>b.innerHTML = original, 1600); });
});

document.getElementById('apoiar-box').addEventListener('submit', e=>{
  if(e.target.id !== 'ap-don') return;
  e.preventDefault();
  const apiUrl = (typeof SITE !== 'undefined' && SITE && SITE.api && SITE.api.livepix && SITE.api.url) ? String(SITE.api.url).replace(/\/+$/, '') : null;
  if(!apiUrl) return;
  const nome = (document.getElementById('don-nome') || {}).value?.trim() || '';
  const valor = Number(String((document.getElementById('don-val') || {}).value || '').replace(',', '.'));
  const mensagem = (document.getElementById('don-msg') || {}).value?.trim() || '';
  const errEl = document.getElementById('don-err');
  const btn = document.getElementById('don-go');
  if(!Number.isFinite(valor) || valor < 2){
    if(errEl) errEl.textContent = 'Informe um valor a partir de R$2.';
    return;
  }
  if(errEl) errEl.textContent = '';
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Gerando Pix…';
  fetch(`${apiUrl}/api/donate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, valor, mensagem }),
  }).then(r => r.json().then(j => ({ ok: r.ok, j }))).then(({ ok, j }) => {
    if(ok && j && j.redirectUrl){
      const w = window.open(j.redirectUrl, '_blank', 'noopener');
      if(!w) location.href = j.redirectUrl;
      return;
    }
    throw new Error((j && j.error) || 'Não consegui gerar o Pix agora.');
  }).catch(err => {
    if(errEl) errEl.textContent = err.message || 'Não consegui gerar o Pix agora.';
  }).finally(() => { btn.disabled = false; btn.textContent = orig; });
});
