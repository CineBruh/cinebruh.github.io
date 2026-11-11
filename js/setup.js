/* ===== Cinebruh · setup: PC e periféricos da Bruna, a partir do site.json ===== */
const GEAR_ICON = {
  'Microfone':'🎙️', 'Headset':'🎧', 'Fone intra-auricular':'🎶', 'Mouse':'🖱️', 'Teclado':'⌨️', 'Webcam':'📷', 'Iluminação':'💡',
  'Monitor':'🖥️', 'Stream Deck':'🎛️', 'Cadeira':'🪑',
  'Gabinete':'🗄️', 'Placa-mãe':'🧩', 'Processador':'🧠', 'Placa de vídeo':'🎮', 'Memória':'💾',
  'Water cooler':'❄️', 'Fonte':'🔌', 'Armazenamento':'💽',
};
/* periféricos primeiro: é o que o pessoal mais pergunta na live */
const GEAR_GROUPS = [
  { key:'perifericos', title:'Periféricos', emoji:'🎧' },
  { key:'hardware',    title:'O PC',        emoji:'🖥️' },
];

/* item de uma marca parceira (ex.: Redragon) ganha o cupom dela */
const partnerOf = (nome, parcerias) =>
  (parcerias||[]).find(p => p.cupom && nome.toLowerCase().includes(p.nome.toLowerCase())) || null;

function gearHTML(g, parcerias){
  const p = partnerOf(g.nome, parcerias);
  const buy = g.afiliado
    ? `<a class="gear-buy" href="${esc(g.afiliado)}" target="_blank" rel="noopener sponsored">🛒 Ver na loja</a>`
    : g.link ? `<a class="gear-buy" href="${esc(g.link)}" target="_blank" rel="noopener">Ver produto ↗</a>` : '';
  const cupom = p ? `<button class="gear-cupom" type="button" data-cupom="${esc(p.cupom)}" title="Copiar cupom ${esc(p.cupom)}">🏷️ ${esc(p.cupom)} · ${esc(p.desconto)} off</button>` : '';
  return `<div class="gear${p?' partner':''}">
    <span class="gear-ic" aria-hidden="true">${GEAR_ICON[g.item] || '🔧'}</span>
    <span class="gear-tx">
      <span class="gear-kind">${esc(g.item)}</span>
      <span class="gear-name">${esc(g.nome)}</span>
      ${buy || cupom ? `<span class="gear-act">${buy}${cupom}</span>` : ''}
    </span>
  </div>`;
}

function renderSetup(site){
  const el = document.getElementById('setup');
  const setup = site.setup || {};
  const parcerias = (site.canal || {}).parcerias || [];
  const all = GEAR_GROUPS.flatMap(gr => setup[gr.key] || []);
  if(!all.length){ el.innerHTML = '<div class="soon"><p>O setup ainda não foi cadastrado.</p></div>'; return; }

  const parceiros = parcerias.filter(p => p.cupom && all.some(g => partnerOf(g.nome, [p])));
  const temAfiliado = all.some(g => g.afiliado);
  const amazon = (site.apoioIndireto || []).find(a => a.id === 'amazon' && a.url);
  const notes = [
    amazon ? `<div class="setup-note">📦 <span>Vai comprar algo pela Amazon? Use o <a href="${esc(amazon.url)}" target="_blank" rel="noopener sponsored" style="text-decoration:underline;font-weight:700">link de afiliado da Bruh</a>: é só finalizar sua compra depois de entrar pelo link, e assim você apoia o canal diretamente!</span></div>` : '',
    ...parceiros.map(p => `<div class="setup-note">🤝 <span>A Bruna é parceira da <b>${esc(p.nome)}</b>: use o cupom <button class="gear-cupom" type="button" data-cupom="${esc(p.cupom)}">🏷️ ${esc(p.cupom)}</button> pra ganhar ${esc(p.desconto)} de desconto${p.url ? ` na <a href="${esc(p.url)}" target="_blank" rel="noopener" style="text-decoration:underline">loja oficial</a>` : ''}.</span></div>`),
    temAfiliado ? `<div class="setup-note">💜 <span>Alguns links são de afiliado: comprando por eles, você apoia a Bruna sem pagar nada a mais.</span></div>` : '',
  ].join('');

  el.innerHTML = notes + GEAR_GROUPS.map(gr => {
    const items = setup[gr.key] || [];
    if(!items.length) return '';
    return `<section class="setup-sec">
      <h3>${gr.emoji} ${gr.title} <span class="n">${items.length} ${items.length>1?'itens':'item'}</span></h3>
      <div class="gear-grid">${items.map(g => gearHTML(g, parcerias)).join('')}</div>
    </section>`;
  }).join('');
}

/* copiar cupom */
document.getElementById('setup').addEventListener('click', e=>{
  const b = e.target.closest('.gear-cupom'); if(!b) return;
  const original = b.innerHTML;
  copyText(b.dataset.cupom, ()=>{ b.textContent = 'Copiado! ✅'; setTimeout(()=>b.innerHTML = original, 1600); });
});
