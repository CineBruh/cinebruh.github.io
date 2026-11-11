/* ===== Cinebruh · cronograma: hoje à noite, a semana e a fila de patrocinados (cronograma.json) ===== */
const CR_STATUS = {
  confirmado: { nome:'Confirmado', ic:'✅' },
  adiado:     { nome:'Adiado',     ic:'⏳' },
  standby:    { nome:'Stand-by',   ic:'⏸️' },
  cancelado:  { nome:'Cancelado',  ic:'❌' },
};
const CR_CAT = { live:'🎮 Live' };
const CR_DIA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const CR_MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
let CRONO = null;

/* "hoje" e a hora contam no horário de Brasília (UTC-3), não no do computador de quem visita */
function brNow(){ return new Date(Date.now() - 3*3600e3); }
function brToday(){ return brNow().toISOString().slice(0,10); }
function addDays(iso, n){ const d = new Date(iso+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function dayDiff(a, b){ return Math.round((new Date(a+'T12:00:00Z') - new Date(b+'T12:00:00Z')) / 864e5); }
function dayInfo(iso){ const d = new Date(iso+'T12:00:00Z'); return { dia: CR_DIA[d.getUTCDay()], num: d.getUTCDate(), mes: CR_MES[d.getUTCMonth()] }; }

/* na versão de exemplo, as datas andam junto com o calendário pra começar sempre hoje */
function rebaseExample(c){
  if(!c.exemplo || !(c.dias||[]).length) return c;
  const shift = dayDiff(brToday(), c.dias[0].data);
  c.dias.forEach(d => d.data = addDays(d.data, shift));
  return c;
}

function workFor(titulo){
  if(typeof DATA_READY === 'undefined' || !DATA_READY) return null;
  const s = slugify(titulo);
  return DATA.find(d => d._slug === s) || null;
}

function crItem(it){
  const st = CR_STATUS[it.status] || CR_STATUS.confirmado;
  const w = workFor(it.titulo);
  const cat = CR_CAT[it.cat] || CAT_LABEL[it.cat] || '';
  const meta = [cat, it.lang === 'dub' ? '🎙️ Dublado' : it.lang === 'leg' ? '💬 Legendado' : '', it.eps].filter(Boolean);
  const title = w ? `<a href="${workHash(w)}">${esc(it.titulo)}</a>` : esc(it.titulo);
  return `<div class="cr-it st-${esc(it.status||'confirmado')}">
    <div class="cr-it-top"><b class="cr-it-t">${title}</b>${it.status && it.status !== 'confirmado' ? `<span class="cr-tag">${st.ic} ${st.nome}</span>` : ''}</div>
    ${meta.length ? `<span class="cr-meta">${meta.map(esc).join(' · ')}</span>` : ''}
    ${it.patrocinador ? `<span class="cr-sp">💜 Patrocínio de <b>${esc(it.patrocinador)}</b></span>` : ''}
    ${it.motivo || it.nota ? `<span class="cr-note">${esc(it.motivo || it.nota)}</span>` : ''}
  </div>`;
}

/* contagem pra live de hoje (23h em Brasília; "21h30" e "21:30" também valem) */
function liveClock(horario){
  const m = String(horario||'').match(/(\d{1,2})(?:\s*[h:]\s*(\d{2}))?/); if(!m) return '';
  const now = brNow(), mins = now.getUTCHours()*60 + now.getUTCMinutes(), start = Number(m[1])*60 + Number(m[2]||0);
  if(mins >= start || mins < 4*60) return '🔴 Tá na hora da live!';
  const left = start - mins;
  return `⏰ Começa em ${Math.floor(left/60) ? Math.floor(left/60)+'h ' : ''}${left%60}min`;
}
/* horário de um dia: o do cartão do Trello ("Sexta 30/10 · 21h") ou o de sempre */
const crHora = d => (d && d.hora) || (CRONO && CRONO.horario) || '';

function renderCronograma(){
  const el = document.getElementById('cronograma-box');
  const c = CRONO; if(!c) return;
  const today = brToday();
  const dias = (c.dias||[]).filter(d => d.data >= today);
  const hoje = dias.find(d => d.data === today);
  const ex = c.exemplo ? '<span class="mk-ex">exemplo</span>' : '';
  const upd = c.atualizadoEm ? new Date(c.atualizadoEm) : null;

  el.innerHTML = `
    ${c.exemplo ? `<div class="mk-demo">⚠️ <span><b>Versão de exemplo.</b> As obras e os nicks são fictícios. Quando a integração com o Trello estiver pronta, a programação real aparece aqui sozinha.</span></div>` : ''}

    <div class="cr-today">
      <div class="cr-today-h">
        <span class="mk-kicker">Hoje à noite · ${esc(crHora(hoje))}</span>
        <h3>${hoje ? (hoje.folga ? 'Hoje não tem live' : 'Na live de hoje') : 'Nada marcado pra hoje'} ${ex}</h3>
        ${hoje && !hoje.folga && crHora(hoje) ? `<span class="cr-clock" id="cr-clock">${liveClock(crHora(hoje))}</span>` : ''}
      </div>
      ${hoje && !hoje.folga ? `<div class="cr-today-l">${(hoje.itens||[]).map(crItem).join('')}</div>`
        : `<p>${esc((hoje && hoje.nota) || 'Fica de olho no Discord pra saber das próximas lives.')}</p>`}
      <div class="cta-row" style="margin-top:14px"><a class="cta" href="https://twitch.tv/brunarodrigues" target="_blank" rel="noopener">💜 Assistir na Twitch</a><a class="cta alt" href="https://kick.com/brunarodrigues" target="_blank" rel="noopener">Kick ↗</a></div>
    </div>

    <h3 class="mk-h">Próximos dias</h3>
    <div class="cr-week">${dias.filter(d => d.data !== today).map(d => {
      const i = dayInfo(d.data), diff = dayDiff(d.data, today);
      return `<div class="cr-day${d.folga ? ' folga' : ''}">
        <div class="cr-day-h"><b>${diff === 1 ? 'Amanhã' : i.dia}</b><span>${i.num} ${i.mes}${!d.folga && d.hora && d.hora !== c.horario ? ` · ${esc(d.hora)}` : ''}</span></div>
        ${d.folga ? `<p class="cr-off">${esc(d.nota || 'Folga 💤')}</p>` : (d.itens||[]).map(crItem).join('')}
      </div>`;
    }).join('') || '<p class="cm-empty">Ainda não tem nada marcado pros próximos dias.</p>'}</div>

    ${(c.fila||[]).length ? `<h3 class="mk-h">Fila de patrocinados <span class="cm-count">${c.fila.length}</span></h3>
    <p class="band-sub" style="margin-top:-6px">Já foram pedidos, mas ainda não têm data. Entram no cronograma por ordem de chegada.</p>
    <div class="cr-fila">${c.fila.map((it, n) => `<div class="cr-fila-i"><span class="cr-pos">${n+1}</span>${crItem(it)}</div>`).join('')}</div>` : ''}

    <div class="cr-legend">${Object.entries(CR_STATUS).map(([k,s]) => `<span class="cr-lg st-${k}">${s.ic} ${s.nome}</span>`).join('')}</div>
    ${c.aviso ? `<div class="setup-note" style="margin-top:14px">ℹ️ <span>${esc(c.aviso)}</span></div>` : ''}

    <div class="cr-foot">
      <span>${upd && !c.exemplo ? `Atualizado em ${upd.toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo'})}` : ''}</span>
      <div class="cta-row">
        <a class="cta" href="#/patrocinar" data-nav="patrocinar">🎬 Quero patrocinar um react</a>
        <a class="cta alt" href="https://trello.com/b/b3LlCpc8/reacts-cinebruh" target="_blank" rel="noopener">Ver no Trello ↗</a>
      </div>
    </div>`;
}

function bootCronograma(j){ CRONO = rebaseExample(j); renderCronograma(); }
function failCronograma(){
  document.getElementById('cronograma-box').innerHTML = `<div class="soon"><p>Não consegui carregar o cronograma agora 😢</p>
    <a class="cta alt" href="https://trello.com/b/b3LlCpc8/reacts-cinebruh" target="_blank" rel="noopener">Ver no Trello ↗</a></div>`;
}

/* ao abrir a aba, refaz (pra "hoje" e a contagem ficarem certos) e atualiza o relógio a cada minuto */
let crTimer = null;
onRoute.cronograma = () => {
  if(CRONO) renderCronograma();
  clearInterval(crTimer);
  crTimer = setInterval(()=>{
    const k = document.getElementById('cr-clock');
    if(k && CRONO) k.textContent = liveClock(crHora((CRONO.dias||[]).find(d => d.data === brToday())));
  }, 60e3);
};
onLeave.push(() => clearInterval(crTimer));
