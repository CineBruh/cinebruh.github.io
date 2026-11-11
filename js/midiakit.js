/* ===== Cinebruh · mídia kit: números do canal, público, formatos de parceria, marcas e contato =====
   Em português em #/midiakit e em inglês em #/midiakit/en (textos do canal em midiakit.en, no site.json). */
const MK_NETS = [
  { id:'twitch',    nome:'Twitch',    url:'https://twitch.tv/brunarodrigues', base:'seguidores', stats:[
      'seguidores', 'subs', 'mediaViewsLive', 'mediaViewers', 'picoViewers', 'picoHistorico', 'horasAssistidas', 'espectadoresUnicos', 'horasLive', 'horasTotais' ]},
  { id:'instagram', nome:'Instagram', url:'https://instagram.com/faribruh_', base:'seguidores', stats:[
      'seguidores', 'novosSeguidores', 'visualizacoes', 'alcance', 'contasEngajadas', 'impressoes', ['engajamento','%'], ['engSeguidores','%'], 'mediaReels', 'mediaStories',
      'mediaCurtidas', 'mediaComentarios', 'visitasPerfil', 'posts' ]},
  { id:'threads',   nome:'Threads',   url:'https://threads.net/@faribruh_', base:'seguidores', stats:[
      'seguidores', 'visitasPerfil' ]},
  { id:'tiktok',   nome:'TikTok',    url:'https://tiktok.com/@faribruh_', base:'seguidores', stats:[
      'seguidores', 'mediaViews', ['engajamento','%'], 'impressoes', 'mediaCurtidas', 'mediaComentarios', ['conclusao','%'], 'videos', 'curtidas' ]},
  { id:'youtube',   nome:'YouTube',   url:'https://youtube.com/@Faribruh_', base:'inscritos', stats:[
      'inscritos', 'mediaShorts', 'impressoes', ['engajamento','%'], 'mediaCurtidas', 'videos', 'mediaViews' ]},
  { id:'kick',      nome:'Kick',      url:'https://kick.com/brunarodrigues', base:'seguidores', stats:[
      'seguidores', 'mediaViewers', 'picoHistorico', 'horasTotais' ]},
  { id:'discord',   nome:'Discord',   url:'https://discord.gg/MUs6NbZJ3r', base:'membros', stats:[
      'membros' ]},
];

/* textos fixos da aba, nas duas línguas */
const MK_TXT = {
  pt: {
    seguidores:'Seguidores', subs:'Inscritos (subs)', mediaViewers:'Média de viewers', mediaViewsLive:'Média de views por live',
    picoViewers:'Pico de viewers', horasAssistidas:'Horas assistidas', espectadoresUnicos:'Espectadores únicos', horasLive:'Horas de live',
    alcance:'Contas alcançadas', impressoes:'Impressões', engajamento:'Engajamento', curtidas:'Curtidas', mediaViews:'Média de views',
    inscritos:'Inscritos', membros:'Membros', mediaReels:'Média de views nos reels',
    contasEngajadas:'Contas engajadas', engSeguidores:'Engajamento dos seguidores', mediaStories:'Média de views nos stories',
    mediaCurtidas:'Média de curtidas', mediaComentarios:'Média de comentários', visitasPerfil:'Visitas ao perfil', posts:'Posts',
    videos:'Vídeos', conclusao:'Assistem até o fim', mediaShorts:'Média de views nos shorts',
    horasTotais:'Horas de live no total', picoHistorico:'Pico histórico de viewers',
    visualizacoes:'Visualizações', novosSeguidores:'Novos seguidores',
    dias:'Últimos {n} dias', paises:'Países', cidades:'Cidades',
    vazio:'O mídia kit ainda não foi cadastrado.', ex:'exemplo',
    demo:'<b>Versão de exemplo.</b> Os números marcados como {ex} são fictícios e vão ser trocados pelos reais.',
    kicker:'Mídia kit', dados:'dados de', anos:'anos',
    trabalhar:'✉️ Vamos trabalhar juntos', pdf:'⬇ Mídia kit no Beacons', salvarPdf:'📄 Salvar em PDF', baixarPdf:'📄 Baixar PDF', copiar:'🔗 Copiar link', copiado:'Link copiado! ✅',
    somados:'Seguidores somados', plataformas:'plataformas', aoVivo:'Twitch · ao vivo', twMes:'Twitch · por mês', igMes:'Instagram · últimos 30 dias',
    twLive:'Twitch · média dos últimos 90 dias', igEng:'Instagram · 30 dias',
    sobre:'Sobre mim', hPlat:'Plataformas', hPub:'Público', genero:'Gênero', idade:'Idade', regioes:'Regiões',
    hCont:'Conteúdo', rolam:'O que rola nas lives', reacts:'Reacts no Cinebruh', obras:'obras reagidas', verCat:'Ver o catálogo →',
    hFmt:'Formatos de parceria', hMarcas:'Marcas que já confiaram', hCases:'Cases', verCont:'Ver o conteúdo ↗', hEvt:'Eventos',
    ctaH:'Vamos trabalhar juntos?', ctaP:'Parcerias, publis e patrocínios: me chama por e-mail que eu respondo rapidinho.',
    assunto:'Parceria com a Bruna Rodrigues', outra:'English', outraT:'Read in English', titulo:'Mídia kit',
  },
  en: {
    seguidores:'Followers', subs:'Subscribers', mediaViewers:'Average viewers', mediaViewsLive:'Average views per stream',
    picoViewers:'Peak viewers', horasAssistidas:'Hours watched', espectadoresUnicos:'Unique viewers', horasLive:'Hours streamed',
    alcance:'Accounts reached', impressoes:'Impressions', engajamento:'Engagement', curtidas:'Likes', mediaViews:'Average views',
    inscritos:'Subscribers', membros:'Members', mediaReels:'Average reel views',
    contasEngajadas:'Accounts engaged', engSeguidores:'Follower engagement', mediaStories:'Average story views',
    mediaCurtidas:'Average likes', mediaComentarios:'Average comments', visitasPerfil:'Profile views', posts:'Posts',
    videos:'Videos', conclusao:'Completion rate', mediaShorts:'Average Shorts views',
    horasTotais:'Total hours streamed', picoHistorico:'All-time peak viewers',
    visualizacoes:'Views', novosSeguidores:'New followers',
    dias:'Last {n} days', paises:'Countries', cidades:'Cities',
    vazio:'The media kit has not been set up yet.', ex:'sample',
    demo:'<b>Sample version.</b> Numbers marked as {ex} are placeholders and will be replaced with real data.',
    kicker:'Media kit', dados:'data from', anos:'years old',
    trabalhar:'✉️ Let\'s work together', pdf:'⬇ Media kit on Beacons', salvarPdf:'📄 Save as PDF', baixarPdf:'📄 Download PDF', copiar:'🔗 Copy link', copiado:'Link copied! ✅',
    somados:'Total followers', plataformas:'platforms', aoVivo:'Twitch · live', twMes:'Twitch · per month', igMes:'Instagram · last 30 days',
    twLive:'Twitch · 90-day average', igEng:'Instagram · 30 days',
    sobre:'About me', hPlat:'Platforms', hPub:'Audience', genero:'Gender', idade:'Age', regioes:'Regions',
    hCont:'Content', rolam:'What happens on stream', reacts:'Reacts on Cinebruh', obras:'titles reacted to', verCat:'See the catalog →',
    hFmt:'Partnership formats', hMarcas:'Brands I\'ve worked with', hCases:'Case studies', verCont:'See the content ↗', hEvt:'Events',
    ctaH:'Let\'s work together?', ctaP:'Partnerships, sponsored content and sponsorships: send me an e-mail and I\'ll get back to you quickly.',
    assunto:'Partnership with Bruna Rodrigues', outra:'Português', outraT:'Ler em português', titulo:'Media kit',
  },
};
const MK_CAT_EN = {'Animes':'Anime', 'Filmes':'Movies', 'Séries':'TV series', 'Tokusatsu':'Tokusatsu', 'Animações':'Animation'};

let MK_LANG = 'pt';
const mkLoc = () => MK_LANG === 'en' ? 'en-US' : 'pt-BR';
/* aceita número ou texto com "+" no fim ("100000+" = "100 mil+"), pra quando só se sabe que passou de um valor */
const nCompact = n => { const mais = /\+$/.test(String(n)) ? '+' : '';
  return new Intl.NumberFormat(mkLoc(), {notation:'compact', maximumFractionDigits:1}).format(parseFloat(n)) + mais; };
const nFull = n => new Intl.NumberFormat(mkLoc()).format(n);
const pct = p => `${MK_LANG === 'en' ? p : String(p).replace('.', ',')}%`;
const has = v => v !== null && v !== undefined && v !== '';
const fmtStat = (v, suf) => suf ? `${MK_LANG === 'en' ? v : String(v).replace('.', ',')}${suf}` : nCompact(v);
const statKey = s => Array.isArray(s) ? s : [s];

/* nome do item na língua atual: lista traduzida, campo "en" do próprio item ou o nome em português */
const mkName = (r, key, names, i) => (names && names[i]) || (MK_LANG === 'en' && r.en) || r[key];

/* pizza de gênero em CSS (conic-gradient), nas mesmas cores da legenda */
const MK_PIE = ['#1D6FE0', '#ff68b4', '#E3B23C'];
function mkPie(list){
  const tot = list.reduce((s,g) => s + Number(g.p), 0) || 1;
  let acc = 0;
  return `conic-gradient(${list.map((g,i) => { const a = acc; acc += Number(g.p) / tot * 100;
    return `${MK_PIE[i % MK_PIE.length]} ${a}% ${acc}%`; }).join(',')})`;
}

function mkBars(list, labelKey, names){
  return `<div class="mk-bars">${list.map((r,i)=>`
    <div class="mk-bar"><span class="mk-bar-l">${esc(mkName(r, labelKey, names, i))}</span>
      <span class="mk-bar-t"><span class="mk-bar-f" style="width:${Math.max(0,Math.min(100,r.p))}%"></span></span>
      <b>${pct(r.p)}</b></div>`).join('')}</div>`;
}

/* troca de língua pelo endereço: #/midiakit (pt) ou #/midiakit/en */
onRoute.midiakit = rest => {
  const lang = rest[0] === 'en' ? 'en' : 'pt';
  document.title = `${MK_TXT[lang].titulo} · Cinebruh`;
  if(lang === MK_LANG) return;
  MK_LANG = lang;
  if(typeof SITE !== 'undefined' && SITE) renderMidiakit(SITE);
};

function renderMidiakit(site){
  const el = document.getElementById('midiakit');
  const t = MK_TXT[MK_LANG];
  const mk = site.midiakit;
  if(!mk){ el.innerHTML = `<div class="soon"><p>${t.vazio}</p></div>`; return; }
  const en = MK_LANG === 'en' ? (mk.en || {}) : {};
  const pick = (list, i, key) => ((en[list] || [])[i] || {})[key];   // texto traduzido do item i, se houver
  el.lang = MK_LANG === 'en' ? 'en' : 'pt-BR';

  const c = site.canal || {};
  const redes = mk.redes || {};
  const nets = MK_NETS.filter(n => redes[n.id] && n.stats.some(s => has(redes[n.id][statKey(s)[0]])));

  /* destaques: alcance somado + os números mais fortes da Twitch e do Instagram */
  const total = nets.reduce((s,n) => s + (parseFloat(redes[n.id][n.base]) || 0), 0);
  const tw = redes.twitch || {}, ig = redes.instagram || {};
  const big = [
    total && [t.somados, nCompact(total), `${nets.length} ${t.plataformas}`],
    has(tw.mediaViewsLive) && [t.mediaViewsLive, nCompact(tw.mediaViewsLive), t.twLive],
    has(ig.visualizacoes) ? [t.visualizacoes, nCompact(ig.visualizacoes), `${t.igMes}${has(ig.visualizacoesCresc) ? ` · +${pct(ig.visualizacoesCresc)}` : ''}`]
      : has(ig.alcance) && [t.alcance, nCompact(ig.alcance), t.igMes],
    has(ig.engajamento) && [t.engajamento, pct(ig.engajamento), t.igEng],
  ].filter(Boolean);

  /* números do próprio catálogo (quando o data.json já carregou) */
  const reacts = DATA_READY ? DATA.filter(d => d.cat !== 'vods' && statusOf(d) !== 'fila' && statusOf(d) !== 'embreve') : [];
  const porCat = ORDER.filter(k => k !== 'vods').map(k => [CAT_LABEL[k], reacts.filter(d => d.cat === k).length]).filter(([,n]) => n)
    .map(([l,n]) => [MK_LANG === 'en' ? (MK_CAT_EN[l] || l) : l, n]);

  const av = c.imagens && c.imagens.avatar, avPos = (c.imagens && c.imagens.avatarPos) || 'center';
  const ex = mk.exemplo ? `<span class="mk-ex">${t.ex}</span>` : '';
  const pub = mk.publico || {};
  const pubs = (Array.isArray(pub) ? pub : [pub]).filter(p => p && (p.genero || p.idade || p.regioes || p.paises || p.cidades));
  const marcas = mk.marcas || [];
  const cases = mk.cases || [];
  const sobre = en.sobre || mk.sobre || c.sobre;
  const tags = en.tags || mk.tags || [];
  const conteudo = en.conteudo || mk.conteudo || [];
  const posic = en.posicionamento || mk.posicionamento;
  const atual = en.atualizadoEm || mk.atualizadoEm;
  const contato = c.contato;
  const mailto = contato ? `mailto:${esc(contato)}?subject=${encodeURIComponent(t.assunto)}` : '';
  const netsTop = nets.filter(n => has(redes[n.id][n.base]));
  const chips = [
    (en.horario || c.horario) && `🌙 ${en.horario || c.horario}`,
    (en.local || c.local) && `📍 ${en.local || c.local}`,
    c.idade && `${c.idade} ${t.anos}`,
  ].filter(Boolean);
  const outra = MK_LANG === 'en' ? '#/midiakit' : '#/midiakit/en';

  el.innerHTML = `
    ${mk.exemplo ? `<div class="mk-demo">⚠️ <span>${t.demo.replace('{ex}', ex)}</span></div>` : ''}

    <div class="mk-hero">
      <div class="home-avatar">${av ? `<img src="${esc(av)}" alt="${esc(c.nome)}" style="object-position:${esc(avPos)}" onerror="this.remove()">` : ''}🦩</div>
      <div class="mk-hero-tx">
        <div class="mk-kicker">${t.kicker}${atual ? ` · ${t.dados} ${esc(atual)}` : ''}</div>
        <h3>${esc(c.nome || '')}</h3>
        ${tags.length ? `<div class="mk-tags">${tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${posic ? `<p>${esc(posic)}</p>` : ''}
        <div class="home-chips">${chips.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>
        ${netsTop.length ? `<div class="mk-mini">${netsTop.map(n=>`<a href="${n.url}" target="_blank" rel="noopener" title="${n.nome}">${brandIcon(n.id)}<b>${nCompact(redes[n.id][n.base])}</b></a>`).join('')}</div>` : ''}
        <div class="cta-row">
          ${contato ? `<a class="cta" href="${mailto}">${t.trabalhar}</a>` : ''}
          ${mk.pdf ? `<a class="cta alt" href="${esc(mk.pdf)}" target="_blank" rel="noopener">${t.pdf}</a>` : ''}
          ${(mk.pdfArquivo || {})[MK_LANG] ? `<a class="cta alt" href="${esc(mk.pdfArquivo[MK_LANG])}" download id="mk-pdf" hidden>${t.baixarPdf}</a>` : ''}
          <button class="cta alt" type="button" id="mk-print">${t.salvarPdf}</button>
          <button class="cta alt" type="button" id="mk-share">${t.copiar}</button>
          <a class="cta alt" href="${outra}" hreflang="${MK_LANG === 'en' ? 'pt-BR' : 'en'}" title="${t.outraT}">🌐 ${t.outra}</a>
        </div>
      </div>
    </div>

    ${big.length ? `<div class="mk-big">${big.map(([l,v,s]) => `<div class="mk-big-i"><span class="mk-big-l">${l}</span><b>${v}</b><span class="mk-big-s">${s}</span>${ex}</div>`).join('')}</div>` : ''}

    ${sobre ? `<h3 class="mk-h">${t.sobre}</h3>
    <div class="mk-card mk-about">${String(sobre).split(/\n{2,}/).map(p=>`<p>${esc(p)}</p>`).join('')}</div>` : ''}

    ${nets.length ? `<h3 class="mk-h">${t.hPlat}</h3>
    <div class="mk-nets">${nets.map(n => {
      const r = redes[n.id];
      const b = BRAND[n.id] || {bg:'var(--accent)'};
      return `<a class="mk-net" href="${n.url}" target="_blank" rel="noopener">
        <div class="mk-net-h" style="background:${b.bg};color:${b.fg||'#fff'}">${brandIcon(n.id)}<b>${n.nome}</b><span class="arr">↗</span></div>
        <div class="mk-net-b">${n.stats.map(statKey).filter(([k]) => has(r[k])).map(([k,suf]) => `<div class="mk-st"><b>${fmtStat(r[k], suf)}</b><span>${t[k] || k}</span></div>`).join('')}</div>
        ${r.dias ? `<div class="mk-net-f">${t.dias.replace('{n}', r.dias)}</div>` : ''}
      </a>`;
    }).join('')}</div>` : ''}

    ${pubs.length ? `<h3 class="mk-h">${t.hPub} ${ex}</h3>
    ${pubs.length > 1 ? `<div class="mk-ptabs" role="tablist">${pubs.map((p,i)=>`<button type="button" class="lpill${i ? '' : ' active'}" role="tab" aria-selected="${!i}" data-pub="${i}">${p.rede ? brandIcon(p.rede) : ''}${esc(p.fonte || '')}</button>`).join('')}</div>` : ''}
    ${pubs.map((p,i) => `<div class="mk-pub" data-pubp="${i}"${i ? ' hidden' : ''}>
      ${p.genero ? `<div class="mk-card"><h4>${t.genero}</h4>
        <div class="mk-gen">
          <div class="mk-pie" role="img" aria-label="${p.genero.map((g,j)=>`${esc(mkName(g,'nome',en.genero,j))} ${pct(g.p)}`).join(', ')}" style="background:${mkPie(p.genero)}"></div>
          <div class="mk-legend">${p.genero.map((g,j)=>`<span><i class="s${j}"></i>${esc(mkName(g,'nome',en.genero,j))} <b>${pct(g.p)}</b></span>`).join('')}</div>
        </div></div>` : ''}
      ${p.idade ? `<div class="mk-card"><h4>${t.idade}</h4>${mkBars(p.idade, 'faixa')}</div>` : ''}
      ${p.paises ? `<div class="mk-card"><h4>${t.paises}</h4>${mkBars(p.paises, 'nome')}</div>` : ''}
      ${p.cidades ? `<div class="mk-card"><h4>${t.cidades}</h4>${mkBars(p.cidades, 'nome')}</div>` : ''}
      ${p.regioes ? `<div class="mk-card"><h4>${t.regioes}</h4>${mkBars(p.regioes, 'nome', en.regioes)}</div>` : ''}
      ${p.dias ? `<div class="mk-net-f mk-pub-f">${esc(p.fonte || '')} · ${t.dias.replace('{n}', p.dias)}</div>` : ''}
    </div>`).join('')}` : ''}

    ${(conteudo.length || porCat.length) ? `<h3 class="mk-h">${t.hCont}</h3>
    <div class="mk-pub">
      ${conteudo.length ? `<div class="mk-card"><h4>${t.rolam}</h4><ul class="mk-list">${conteudo.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${porCat.length ? `<div class="mk-card"><h4>${t.reacts}</h4>
        <div class="mk-num"><b>${nFull(reacts.length)}</b><span>${t.obras}</span></div>
        <div class="mk-cats">${porCat.map(([l,n])=>`<span class="chip">${l} · ${n}</span>`).join('')}</div>
        <a class="mk-link" href="#/catalogo" data-nav="catalogo">${t.verCat}</a></div>` : ''}
    </div>` : ''}

    ${(mk.formatos||[]).length ? `<h3 class="mk-h">${t.hFmt}</h3>
    <div class="mk-fmts">${mk.formatos.map((f,i)=>`<div class="mk-fmt"><span class="mk-fmt-ic">${esc(f.icone||'✨')}</span><b>${esc(pick('formatos',i,'nome') || f.nome)}</b><span>${esc(pick('formatos',i,'desc') || f.desc || '')}</span></div>`).join('')}</div>` : ''}

    ${marcas.length ? `<h3 class="mk-h">${t.hMarcas}</h3>
    <div class="mk-brands">${marcas.map((m,i)=>{
      const desc = pick('marcas',i,'desc') || m.desc;
      const inner = `${m.logo ? `<img src="${esc(m.logo)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<b>${esc(m.nome)}</b>${desc ? `<span>${esc(desc)}</span>` : ''}`;
      return m.url ? `<a class="mk-brand" href="${esc(m.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="mk-brand">${inner}</div>`;
    }).join('')}</div>` : ''}

    ${cases.length ? `<h3 class="mk-h">${t.hCases}</h3>
    <div class="mk-fmts">${cases.map((k,i)=>{
      const desc = pick('cases',i,'desc') || k.desc;
      return `<div class="mk-fmt mk-case">
      <span class="mk-case-top"><b>${esc(k.marca)}</b>${k.exemplo ? ex : ''}</span>
      <span class="mk-case-meta">${[pick('cases',i,'formato') || k.formato, k.plataforma, pick('cases',i,'periodo') || k.periodo].filter(Boolean).map(esc).join(' · ')}</span>
      ${desc ? `<span>${esc(desc)}</span>` : ''}
      ${k.url ? `<a class="mk-link" href="${esc(k.url)}" target="_blank" rel="noopener">${t.verCont}</a>` : ''}
    </div>`;
    }).join('')}</div>` : ''}

    ${(mk.eventos||[]).length ? `<h3 class="mk-h">${t.hEvt}</h3>
    <div class="mk-evts">${mk.eventos.map((e,i)=>{
      const papel = pick('eventos',i,'papel') || e.papel;
      return `<span class="mk-evt">🎟️ <b>${esc(e.nome)}</b>${e.ano ? ` ${e.ano}` : ''}${papel ? ` · ${esc(papel)}` : ''}</span>`;
    }).join('')}</div>` : ''}

    ${contato ? `<div class="mk-cta">
      <div><h3>${t.ctaH}</h3><p>${t.ctaP}</p></div>
      <a class="cta" href="${mailto}">✉️ ${esc(contato)}</a>
    </div>` : ''}`;

  /* PDF pronto: o botão "Baixar PDF" só aparece (no lugar do "Salvar em PDF") se o arquivo existir mesmo */
  const pdfA = document.getElementById('mk-pdf');
  if(pdfA) fetch(pdfA.getAttribute('href'), {method:'HEAD'}).then(r => {
    if(!r.ok) return;
    pdfA.hidden = false;
    const pr = document.getElementById('mk-print'); if(pr) pr.hidden = true;
  }).catch(()=>{});

  /* abas do público (uma por rede) */
  el.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', ()=>{
    el.querySelectorAll('[data-pub]').forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', on); });
    el.querySelectorAll('[data-pubp]').forEach(p => p.hidden = p.dataset.pubp !== b.dataset.pub);
  }));

  const share = document.getElementById('mk-share');
  /* "Salvar em PDF": usa a impressão do navegador; o CSS de impressão (paginas.css) esconde o menu e abre todas as abas do público */
  const prt = document.getElementById('mk-print');
  if(prt) prt.addEventListener('click', ()=> window.print());
  if(share) share.addEventListener('click', ()=>{
    /* no site publicado, copia o link com prévia própria (cinebruh.github.io/midiakit/) */
    const pub = /\.github\.io$/.test(location.hostname);
    const url = pub ? location.origin + '/' + (MK_LANG === 'en' ? 'midiakit/en/' : 'midiakit/')
                    : location.href.split('#')[0] + (MK_LANG === 'en' ? '#/midiakit/en' : '#/midiakit');
    copyText(url, ()=>{ share.textContent = t.copiado; setTimeout(()=>share.textContent = t.copiar, 1800); });
  });
}
