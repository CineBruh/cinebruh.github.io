/* ===== Cinebruh · subathon: aba ativada pelo cartão SUBATHON no Trello (cronograma.json) ou site.json =====
   Overlays (timer e metas) só são montadas quando a aba está aberta e devem ser sempre versões SOMENTE LEITURA. */
const SB_CHANNEL = 'brunarodrigues';

function sbData(){
  const cfg = (typeof SITE !== 'undefined' && SITE && SITE.subathon) || {};
  const tr = (typeof CRONO !== 'undefined' && CRONO && CRONO.subathon) || null;
  const raw = String(cfg.estado || 'auto').toLowerCase();
  const estado = raw === 'auto' ? ((tr && tr.estado) || 'off') : raw;
  return { estado, cfg, tr };
}

function sbMoney(v){
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

function sbMount(){
  const { estado, cfg } = sbData();
  if(estado !== 'ativo') return;
  const host = location.hostname;
  const pl = document.getElementById('sb-live');
  if(pl && !pl.dataset.on && host){
    pl.innerHTML = `<iframe src="https://player.twitch.tv/?channel=${SB_CHANNEL}&parent=${host}&autoplay=true" title="Subathon da Bruna na Twitch" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    pl.dataset.on = '1';
  }
  const ch = document.getElementById('sb-chat');
  if(ch && !ch.dataset.on && host){
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ? '&darkpopout' : '';
    ch.innerHTML = `<iframe src="https://www.twitch.tv/embed/${SB_CHANNEL}/chat?parent=${host}${dark}" title="Chat da Twitch"></iframe>`;
    ch.dataset.on = '1';
  }
  const tm = document.getElementById('sb-ov-timer');
  if(tm && !tm.dataset.on && cfg.overlayTimer){
    tm.innerHTML = `<iframe src="${escUrl(cfg.overlayTimer)}" title="Cronômetro da Subathon (somente leitura)"></iframe>`;
    tm.dataset.on = '1';
  }
  const mt = document.getElementById('sb-ov-metas');
  if(mt && !mt.dataset.on && cfg.overlayMetas){
    mt.innerHTML = `<iframe src="${escUrl(cfg.overlayMetas)}" title="Metas da Subathon (somente leitura)"></iframe>`;
    mt.dataset.on = '1';
  }
}

function sbUnmount(){
  ['sb-live', 'sb-chat', 'sb-ov-timer', 'sb-ov-metas'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.innerHTML = ''; delete el.dataset.on; }
  });
}

function renderHomeSubathonBanner(estado, cfg, tr){
  const box = document.getElementById('home-subathon');
  if(!box) return;
  if(estado !== 'ativo' && estado !== 'breve'){ box.innerHTML = ''; return; }
  const live = estado === 'ativo';
  const inicio = (tr && tr.inicio) || cfg.inicio || '';
  box.innerHTML = `<a class="sb-banner${live ? ' live' : ''}" href="#/subathon" data-nav="subathon">
    <span class="sb-dot">${live ? '🔴 AO VIVO' : '⏳ EM BREVE'}</span>
    <b>${esc(cfg.titulo || 'Subathon da Bruh')}</b>
    <span>${live ? 'Acompanhe o cronômetro, as metas e quanto tempo cada apoio soma →' : (inicio ? `Começa: ${esc(inicio)} · veja as metas e regras →` : 'Veja a tabela de tempos, metas e regras →')}</span>
  </a>`;
}

function renderSubathon(){
  const box = document.getElementById('subathon-box');
  if(!box) return;
  const { estado, cfg, tr } = sbData();
  if(typeof setNavVisible === 'function') setNavVisible('subathon', estado !== 'off', estado === 'ativo');
  renderHomeSubathonBanner(estado, cfg, tr);

  const titulo = cfg.titulo || 'Subathon da Bruh';
  const subtitulo = cfg.subtitulo || '';
  const inicio = (tr && tr.inicio) || cfg.inicio || '';
  const obs = (tr && tr.obs) || '';
  const resumo = (tr && tr.resumo) || cfg.resumo || '';
  const rates = cfg.quantoVale || [];
  const trMetas = (tr && Array.isArray(tr.metas) && tr.metas.length) ? tr.metas : null;
  const cfgMetas = Array.isArray(cfg.metas) ? cfg.metas : [];
  const regras = cfg.regras || [];

  if(estado === 'off'){
    box.innerHTML = `<div class="band">
      <div class="band-head"><h2>${esc(titulo)}</h2><span class="kicker">Fora de temporada</span></div>
      <div class="soon">
        <p>Nenhuma Subathon está acontecendo no momento. Fica de olho no Discord e no Cronograma pra saber quando a próxima for anunciada! 💜</p>
        <div class="cta-row" style="margin-top:4px">
          <a class="cta" href="#/inicio" data-nav="inicio">Voltar pro início</a>
          <a class="cta alt" href="#/cronograma" data-nav="cronograma">Ver cronograma</a>
        </div>
      </div>
    </div>`;
    return;
  }

  const badge = estado === 'ativo' ? '🔴 Ao vivo' : estado === 'breve' ? '⏳ Em breve' : '✅ Encerrada';
  const hasOv = estado === 'ativo' && (cfg.overlayTimer || cfg.overlayMetas);

  let metasHTML = '';
  if(trMetas){
    const feitas = trMetas.filter(m => m.feita).length;
    const pct = Math.round((feitas / trMetas.length) * 100);
    metasHTML = `<h3 class="mk-h">Metas da Subathon <span class="cm-count">${feitas}/${trMetas.length}</span></h3>
      <div class="sb-prog" aria-label="${feitas} de ${trMetas.length} metas batidas"><i style="width:${pct}%"></i></div>
      <div class="sb-goals">${trMetas.map(m => `<div class="sb-goal${m.feita ? ' done' : ''}">
        <span class="sb-gck">${m.feita ? '✅' : '🎯'}</span>
        <span class="sb-gtx">${esc(m.texto)}</span>
      </div>`).join('')}</div>`;
  } else if(cfgMetas.length){
    metasHTML = `<h3 class="mk-h">Metas da Subathon <span class="cm-count">${cfgMetas.length}</span></h3>
      <div class="sb-goals">${cfgMetas.map(m => `<div class="sb-goal">
        <span class="sb-gamt">${esc(sbMoney(m.valor))}</span>
        <span class="sb-gtx">${esc(m.titulo)}</span>
        ${m.horas ? `<span class="sb-gbon">+${esc(m.horas)}h</span>` : ''}
      </div>`).join('')}</div>`;
  }

  box.innerHTML = `<div class="band">
    <div class="band-head"><h2>${esc(titulo)}</h2><span class="kicker">${badge}</span></div>
    ${subtitulo ? `<p class="band-sub">${esc(subtitulo)}</p>` : ''}
    ${inicio && estado === 'breve' ? `<div class="setup-note">📅 <span><b>Início previsto:</b> ${esc(inicio)}</span></div>` : ''}
    ${obs ? `<div class="setup-note">ℹ️ <span>${esc(obs)}</span></div>` : ''}
    ${resumo && estado === 'encerrado' ? `<div class="mk-card" style="margin-bottom:var(--s5)"><h4>Resumo do evento</h4><p style="white-space:pre-line">${esc(resumo)}</p></div>` : ''}

    ${estado === 'ativo' ? `<div class="sb-stage">
      <div class="sb-live" id="sb-live"></div>
      <aside class="sb-chat" id="sb-chat" aria-label="Chat da Twitch"></aside>
    </div>` : ''}

    ${hasOv ? `<h3 class="mk-h">Placar ao vivo</h3>
    <div class="sb-widgets">
      ${cfg.overlayTimer ? `<div class="sb-frame sb-frame-timer" id="sb-ov-timer"></div>` : ''}
      ${cfg.overlayMetas ? `<div class="sb-frame sb-frame-metas" id="sb-ov-metas"></div>` : ''}
    </div>` : ''}

    ${rates.length ? `<h3 class="mk-h">Quanto tempo cada apoio soma</h3>
    <div class="sb-rates">${rates.map(r => `<div class="sb-rate">
      <span class="sb-ric">${esc(r.icone || '⏱️')}</span>
      <b>${esc(r.tempo)}</b>
      <span>${esc(r.acao)}</span>
    </div>`).join('')}</div>` : ''}

    ${metasHTML}

    <div class="cta-row">
      <a class="cta" href="https://twitch.tv/${SB_CHANNEL}" target="_blank" rel="noopener">💜 Assistir na Twitch</a>
      <a class="cta alt" href="#/apoiar" data-nav="apoiar">💸 Apoiar / LivePix</a>
      <a class="cta alt" href="#/patrocinar" data-nav="patrocinar">🎬 Pedir um react</a>
    </div>

    ${regras.length ? `<h3 class="mk-h">Regras</h3>
    <details class="cm-rules" open>
      <summary>Como funciona a Subathon <em>${regras.length} itens</em></summary>
      <ol>${regras.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
    </details>` : ''}
  </div>`;

  if(currentPage === 'subathon') sbMount();
}

onRoute.subathon = () => { if(typeof SITE !== 'undefined' && SITE) renderSubathon(); sbMount(); };
onLeave.push(sbUnmount);
