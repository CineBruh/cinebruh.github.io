/* ===== Cinebruh · núcleo: utilidades, ícones, navegação entre abas e tema =====
   Os scripts são carregados em ordem (core → player → catalogo → patrocinar → inicio → app)
   e compartilham as variáveis de topo entre si. */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* copia texto e chama done() quando terminar (com ou sem API de área de transferência) */
function copyText(txt, done){
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done).catch(done); return; }
  const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(t); done();
}

/* ---------- Ícones do menu ---------- */
const ICON = {
  home:     '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-5.5h4v5.5"/>',
  play:     '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor"/>',
  star:     '<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9L3.5 9.4l5.9-.8z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  radio:    '<circle cx="12" cy="12" r="2"/><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  tier:     '<rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="12.5" height="4" rx="1.5"/><rect x="3" y="16" width="7" height="4" rx="1.5"/>',
  heart:    '<path d="M12 20s-7.5-4.6-9.3-9.2A4.9 4.9 0 0 1 12 7.1a4.9 4.9 0 0 1 9.3 3.7C19.5 15.4 12 20 12 20z"/>',
  chart:    '<path d="M3.5 20.5h17"/><path d="M7 16.5v-5M12 16.5V6M17 16.5v-8"/>',
  monitor:  '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  users:    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  more:     '<circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/>',
};
const svgI = name => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]||''}</svg>`;

/* ---------- Abas ----------
   bar: aparece na barra inferior do celular (as outras ficam no "Mais").
   sep: linha divisória antes do item no menu lateral. */
const PAGES = [
  {id:'inicio',     label:'Início',         icon:'home',     bar:true},
  {id:'catalogo',   label:'Catálogo',       icon:'play',     bar:true},
  {id:'patrocinar', label:'Patrocinar',     icon:'star',     bar:true},
  {id:'cronograma', label:'Cronograma',     icon:'calendar', bar:true},
  {id:'offline',    label:'Reacts Offline', icon:'radio'},
  {id:'tierlist',   label:'Tier list',      icon:'tier'},
  {id:'apoiar',     label:'Apoiar',         icon:'heart',    sep:true},
  {id:'midiakit',   label:'Mídia kit',      icon:'chart'},
  {id:'setup',      label:'Setup',          icon:'monitor'},
  {id:'comunidade', label:'Comunidade',     icon:'users'},
];
const DEFAULT_PAGE = 'inicio';
/* endereços antigos (site de página única) continuam funcionando */
const PAGE_ALIAS = {precos:'patrocinar', pick:'patrocinar', redes:'inicio'};
const pageById = id => PAGES.find(p=>p.id===id);

const onRoute = {};   // id da aba -> função(resto do endereço) chamada a cada navegação
const onLeave = [];   // funções chamadas ao trocar de aba (fecham janelas abertas)
const scrollMem = {}; // posição de rolagem de cada aba, pra voltar onde estava
let currentPage = null;

function parseHash(){
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  let page = parts.shift() || DEFAULT_PAGE;
  page = PAGE_ALIAS[page] || page;
  if(!pageById(page)) page = DEFAULT_PAGE;
  return { page, rest: parts.map(p=>{ try{ return decodeURIComponent(p); }catch(e){ return p; } }) };
}
function hashFor(page, rest){
  return '#/' + page + ((rest && rest.length) ? '/' + rest.map(encodeURIComponent).join('/') : '');
}
/* navega pra uma aba (cria entrada no histórico, então o "voltar" do navegador funciona) */
function go(page, rest, state){
  const h = hashFor(page, rest);
  if(location.hash !== h) history.pushState(state || null, '', h);
  route();
}
function route(){
  const { page, rest } = parseHash();
  if(page !== currentPage){
    onLeave.forEach(fn=>fn());
    if(currentPage) scrollMem[currentPage] = window.scrollY;
    document.querySelectorAll('.page').forEach(s=>{ s.hidden = s.dataset.page !== page; });
    document.querySelectorAll('[data-nav]').forEach(a=>{
      const on = a.dataset.nav === page;
      a.classList.toggle('active', on);
      if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    const tabMore = document.getElementById('tab-more');
    if(tabMore) tabMore.classList.toggle('active', !pageById(page).bar);
    document.title = page===DEFAULT_PAGE ? 'Cinebruh' : `${pageById(page).label} · Cinebruh`;
    currentPage = page;
    window.scrollTo({top: scrollMem[page] || 0, behavior:'instant'});
  }
  (onRoute[page] || (()=>{}))(rest);
}
window.addEventListener('hashchange', route);
window.addEventListener('popstate', route);

/* ---------- Monta o menu lateral, a barra inferior e a folha "Mais" ---------- */
document.getElementById('nav').innerHTML = PAGES.map(p=>
  `${p.sep?'<div class="nav-sep" role="separator"></div>':''}<a href="#/${p.id}" data-nav="${p.id}" title="${p.label}">${svgI(p.icon)}<span class="nl">${p.label}</span></a>`
).join('');
document.getElementById('tabbar').innerHTML =
  PAGES.filter(p=>p.bar).map(p=>`<a class="tab" href="#/${p.id}" data-nav="${p.id}"><span class="ti">${svgI(p.icon)}</span><span class="tl">${p.label}</span></a>`).join('') +
  `<button class="tab" id="tab-more" type="button" aria-haspopup="dialog" aria-controls="sheet"><span class="ti">${svgI('more')}</span><span class="tl">Mais</span></button>`;
document.getElementById('sheet-grid').innerHTML = PAGES.filter(p=>!p.bar).map(p=>
  `<a class="sheet-item" href="#/${p.id}" data-nav="${p.id}">${svgI(p.icon)}<span>${p.label}</span></a>`
).join('');

/* cliques nos itens de menu: navegam sem recarregar; tocar na aba atual volta pro topo */
document.addEventListener('click', e=>{
  const a = e.target.closest('a[data-nav]');
  if(!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  closeSheet();
  if(a.dataset.nav === currentPage) window.scrollTo({top:0, behavior:'smooth'});
  else go(a.dataset.nav);
});

/* folha "Mais" */
const sheet = document.getElementById('sheet');
const tabMoreBtn = document.getElementById('tab-more');
function openSheet(){ sheet.classList.add('open'); sheet.setAttribute('aria-hidden','false'); }
function closeSheet(){ sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true'); }
tabMoreBtn.addEventListener('click', ()=> sheet.classList.contains('open') ? closeSheet() : openSheet());
sheet.addEventListener('click', e=>{ if(e.target === sheet) closeSheet(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && sheet.classList.contains('open')) closeSheet(); });
onLeave.push(closeSheet);

/* ---------- Tema claro/escuro (o tema salvo é aplicado no <head>, antes de pintar a página) ---------- */
const root = document.documentElement;
function toggleTheme(){
  const next = root.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
  const apply = ()=>{
    root.setAttribute('data-theme', next);
    try{ localStorage.setItem('bru-theme', next); }catch(e){}
  };
  if(document.startViewTransition){ document.startViewTransition(apply); }
  else{ apply(); }
}
document.querySelectorAll('.js-theme').forEach(b=>b.addEventListener('click', toggleTheme));

/* ---------- Voltar ao topo ---------- */
const toTop = document.getElementById('totop');
window.addEventListener('scroll', ()=>{ toTop.classList.toggle('show', window.scrollY > 400); }, {passive:true});
toTop.addEventListener('click', ()=>window.scrollTo({top:0, behavior:'smooth'}));
