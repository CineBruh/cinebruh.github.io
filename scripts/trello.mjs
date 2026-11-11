/**
 * trello.mjs — leitura do quadro do Trello (Cinebruh). Usado pelo sync-drive.mjs.
 *
 * O QUE O TRELLO DECIDE (ver GUIA-TRELLO.md)
 *   - Status   = a LISTA do cartão (1ª palavra): FILA · EM ABERTO · FIXOS · FINALIZADOS · CRONOGRAMA · INFOS
 *   - Categoria, áudio, nota (★ N), Stand-by, Off Live, Próximo, Meta Incentive, Escolha do Chat = ETIQUETAS
 *   - Patrocinadores = "(nick)" nos itens/nomes das checklists e a linha "Patrocinado por:" na descrição
 *   - Assistido = item da checklist marcado
 *   - Descrição: linhas "TMDB:", "Drive:", "Dia:", "Patrocinado por:", "Review:", "Obs:", "Classificação:", "Aviso:"
 * O Drive continua mandando nos VÍDEOS (temporadas, episódios, duração).
 *
 * O quadro é público, então não precisa de chave. Se um dia ficar privado, defina TRELLO_KEY e TRELLO_TOKEN.
 */

const BOARD = process.env.TRELLO_BOARD || 'b3LlCpc8';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tget(path, params = {}) {
  const q = new URLSearchParams(params);
  if (process.env.TRELLO_KEY && process.env.TRELLO_TOKEN) { q.set('key', process.env.TRELLO_KEY); q.set('token', process.env.TRELLO_TOKEN); }
  const url = `https://api.trello.com/1/${path}?${q}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    const retryable = res.status >= 500 || res.status === 429;
    if (!retryable || attempt >= 3) throw new Error(`Trello API ${res.status} em ${path}: ${await res.text()}`);
    console.warn(`⚠️ Trello API ${res.status} em ${path}; tentando de novo (${attempt + 1}/3)…`);
    await sleep(1000 * 3 ** attempt);
  }
}

// ───────────────────────────── TEXTO ─────────────────────────────
const stripAccents = s => s.normalize('NFD').replace(/\p{M}/gu, '');
export const keyOf = s => stripAccents(String(s || '')).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Markdown do Trello → texto simples: [texto](url "x") vira texto, some \_ \* e os espaços
// invisíveis (categoria Unicode "Cf") que o Trello deixa nas linhas "vazias".
const plain = s => String(s || '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\\([_*~`#>\-\[\]()])/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\*/g, '')                                  // itálico / asterisco solto do Markdown
  .replace(/\p{Cf}/gu, '')
  .trim();

// "Austeroz e GODMWLS", "Austeroz, Locknell e Redivo_" → lista de nicks
// ("????" ou "-" = patrocinador desconhecido: não vira nick, mas a linha continua valendo como "já pago")
const splitNicks = s => plain(s).split(/\s*,\s*|\s+e\s+|\s*&\s*|\s*\/\s*/).map(x => x.trim()).filter(x => /[\p{L}\p{N}]/u.test(x));
const isChat = n => /^(o\s+)?chat$/i.test(n) || /^escolha do chat$/i.test(n);

// ───────────────────────────── LISTAS E ETIQUETAS ─────────────────────────────
function listKind(name) {
  const k = keyOf(name);
  if (k.startsWith('finalizad')) return 'completo';
  if (k.startsWith('em aberto')) return 'aberto';
  if (k.startsWith('fixo')) return 'fixo';
  if (k.startsWith('fila')) return 'fila';
  if (k.startsWith('cronograma')) return 'cronograma';
  return 'infos';                                   // INFOS e qualquer lista desconhecida: ignoradas
}

const LABEL_CAT = { anime: 'animes', filme: 'filmes', serie: 'series', animacao: 'animacoes', tokusatsu: 'tokusatsu' };
function readLabels(names) {
  const o = { cat: null, lang: null, nota: null, flags: new Set() };
  for (const raw of names) {
    const k = keyOf(raw);
    if (LABEL_CAT[k]) o.cat = LABEL_CAT[k];
    else if (k === 'dublado') o.lang = o.lang && o.lang !== 'dub' ? 'both' : 'dub';
    else if (k === 'legendado') o.lang = o.lang && o.lang !== 'leg' ? 'both' : 'leg';
    else if (/★/.test(raw) || /^\d{1,2}$/.test(k)) { const n = parseInt(raw.replace(/\D+/g, ''), 10); if (n >= 0 && n <= 10) o.nota = n; }
    else o.flags.add(k.replace(/\s+/g, ''));   // standby, offlive, proximo, metaincentive, escolhadochat, folga, adiado, cancelado
  }
  return o;
}

// ───────────────────────────── DESCRIÇÃO ─────────────────────────────
const DESC_KEYS = { tmdb: 'tmdb', drive: 'drive', dia: 'dia', 'patrocinado por': 'pat', patrocinadores: 'pat',
  review: 'review', obs: 'obs', classificacao: 'classificacao', aviso: 'aviso' };
function parseDesc(desc) {
  const out = {};
  let cur = null;
  for (const line of String(desc || '').split(/\r?\n/)) {
    const m = line.match(/^\s*\**\s*([A-Za-zÀ-ú ]{2,20}?)\s*\**\s*:\s*(.*)$/);
    const key = m && DESC_KEYS[keyOf(m[1])];
    if (key) { cur = key; out[key] = plain(m[2]); continue; }
    if (cur === 'review' || cur === 'obs' || cur === 'aviso') {     // texto que continua na linha de baixo
      const t = plain(line);
      if (t) out[cur] = (out[cur] ? out[cur] + '\n' : '') + t;
    }
  }
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];      // "TMDB:" vazio do modelo
  return out;
}

// "37854" · "tv/37854" · "https://www.themoviedb.org/movie/149-akira" → "tv/37854" / "movie/149"
export function tmdbRef(v, cat) {
  if (!v) return null;
  const m = String(v).match(/(movie|tv)\/(\d+)/i);
  if (m) return `${m[1].toLowerCase()}/${m[2]}`;
  const n = String(v).match(/\d+/);
  return n ? `${cat === 'filmes' ? 'movie' : 'tv'}/${n[0]}` : null;
}

// ───────────────────────────── CHECKLISTS ─────────────────────────────
// "Temporada 2 (JandersonShady)" · "Temporada 1  (✅)" · "Saga East Blue ()" · "Programação"
function parseChecklistName(name) {
  let label = String(name || '').trim(), nicks = [], done = false;
  const m = label.match(/\(([^)]*)\)\s*$/);
  if (m) {
    label = label.slice(0, m.index).trim();
    const inner = m[1].trim();
    if (/✅|✔/.test(inner)) done = true;
    else if (inner) nicks = splitNicks(inner);
  }
  if (/✅/.test(label)) { done = true; label = label.replace(/✅/g, '').trim(); }
  const n = label.match(/(?:temporada|season|^t)\s*(\d+)/i);
  return { n: n ? Number(n[1]) : null, l: label, nicks, done };
}
// "Episódio 7 (Austeroz, Fulana)" · "Ep 7" · "Episódio 1 (Chat)" · "Episódio 5.5" (especial entre o 5 e o 6)
function parseItem(it) {
  const name = plain(it.name);
  const m = name.match(/(?:epis[oó]dio|ep\.?)\s*(\d+(?:[.,]\d+)?)/i) || name.match(/(\d+(?:[.,]\d+)?)/);
  const p = name.match(/\(([^)]*)\)\s*$/);
  let nicks = p ? splitNicks(p[1]) : [];
  const chat = nicks.some(isChat);
  nicks = nicks.filter(x => !isChat(x));
  return { n: m ? Number(m[1].replace(',', '.')) : null, done: it.state === 'complete', nicks, chat, text: name, pos: it.pos };
}

// ───────────────────────────── QUADRO ─────────────────────────────
export async function loadBoard() {
  const [lists, labels, cards, checklists] = await Promise.all([
    tget(`boards/${BOARD}/lists`, { fields: 'name,pos' }),
    tget(`boards/${BOARD}/labels`, { fields: 'name,color', limit: '1000' }),
    tget(`boards/${BOARD}/cards`, { fields: 'name,idList,idLabels,desc,pos' }),
    tget(`boards/${BOARD}/checklists`, { fields: 'name,idCard,pos', checkItem_fields: 'name,state,pos' }),
  ]);
  const listById = Object.fromEntries(lists.map(l => [l.id, l]));
  const labelName = Object.fromEntries(labels.map(l => [l.id, l.name || '']));
  const clByCard = {};
  for (const cl of checklists) (clByCard[cl.idCard] ||= []).push(cl);

  const listRank = Object.fromEntries([...lists].sort((a, b) => a.pos - b.pos).map((l, i) => [l.id, i]));
  const out = [];
  for (const c of cards) {
    const list = listById[c.idList];
    if (!list) continue;
    const lb = readLabels((c.idLabels || []).map(id => labelName[id]).filter(Boolean));
    const desc = parseDesc(c.desc);
    const cls = (clByCard[c.id] || []).sort((a, b) => a.pos - b.pos).map(cl => ({
      ...parseChecklistName(cl.name),
      raw: cl.name,
      items: (cl.checkItems || []).sort((a, b) => a.pos - b.pos).map(parseItem),
    }));
    out.push({
      id: c.id, name: plain(c.name), kind: listKind(list.name), list: list.name,
      rank: listRank[c.idList] * 1e6 + (c.pos || 0) / 1e9,     // ordem do quadro: lista, depois posição
      ...lb, desc, checklists: cls,
    });
  }
  return out;
}

// Cartões de OBRA: listas FILA / EM ABERTO / FIXOS / FINALIZADOS com etiqueta de categoria.
export function workCards(cards, warn) {
  const works = [];
  for (const c of cards) {
    if (!['fila', 'aberto', 'fixo', 'completo'].includes(c.kind)) continue;
    if (!c.cat) {
      if (c.checklists.length || c.lang) warn(`Cartão sem etiqueta de categoria (ignorado): "${c.name}" em ${c.list}`);
      continue;
    }
    // patrocinadores da obra inteira: descrição + nomes das checklists + itens
    const pat = [];
    const add = n => { if (n && !isChat(n) && !pat.includes(n)) pat.push(n); };
    splitNicks(c.desc.pat || '').forEach(add);
    for (const cl of c.checklists) { cl.nicks.forEach(add); cl.items.forEach(i => i.nicks.forEach(add)); }
    const anyDone = c.checklists.some(cl => cl.done || cl.items.some(i => i.done));
    // Obra já paga inteira (o site tira o "Peça esse react"): tem "Patrocinado por:" na descrição, ou
    // toda temporada/episódio tem nick (no nome da checklist ou no item; "(Chat)" também conta como escolhido).
    const pago = !!c.desc.pat || (c.checklists.length > 0 && c.checklists.every(cl =>
      cl.nicks.length > 0 || (cl.items.length > 0 && cl.items.every(i => i.nicks.length || i.chat))));
    works.push({ ...c, pat, anyDone, pago, tmdb: tmdbRef(c.desc.tmdb, c.cat) });
  }
  return works;
}

// Nome da obra no índice (o nome do cartão, ou a linha "Drive:" se a pasta tiver outro nome).
export function indexWorks(works, warn) {
  const idx = new Map();
  for (const w of works) {
    for (const nm of [w.name, w.desc.drive].filter(Boolean)) {
      const k = keyOf(nm);
      if (idx.has(k) && idx.get(k) !== w) warn(`Dois cartões com o mesmo nome: "${nm}" (vale o primeiro, junte os dois num cartão só)`);
      else idx.set(k, w);
    }
  }
  return idx;
}

// ───────────────────────────── CRONOGRAMA ─────────────────────────────
const brNow = () => new Date(Date.now() - 3 * 3600e3);
const iso = d => d.toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5);

// "Segunda 02/11" · "Sexta 30/10 · 21h" · "Sábado 31/10 · 15h30" · "Sábado 31/10 21:30"
function parseDayTitle(title, today) {
  const m = title.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0'), mm = m[2].padStart(2, '0');
  let y = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : Number(today.slice(0, 4));
  let data = `${y}-${mm}-${dd}`;
  if (!m[3]) {                                     // sem ano: o mais perto de hoje
    if (dayDiff(data, today) < -180) data = `${++y}-${mm}-${dd}`;
    else if (dayDiff(data, today) > 185) data = `${--y}-${mm}-${dd}`;
  }
  if (isNaN(Date.parse(data))) return null;
  const rest = title.slice(m.index + m[0].length);
  const h = rest.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i);
  const hora = h ? `${h[1].padStart(2, '0')}:${(h[2] || '00')}` : null;
  return { data, hora };
}
const horaLabel = h => { const [H, M] = h.split(':'); return `${Number(H)}h${M !== '00' ? M : ''}`; };

// "Mob Psycho 100 · T2 Ep 7" → { titulo, eps, work }
// Acha a obra pelo COMEÇO do texto (o nome mais longo que bate), assim nomes com " - " no meio
// (ex.: "KONOSUBA - God's blessing…") não quebram. Sem obra conhecida, separa no primeiro " · ".
function parseProgItem(text, idx) {
  const clean = text.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const k = keyOf(clean);
  let best = null;
  for (const [nk, w] of idx) if ((k === nk || k.startsWith(nk + ' ')) && (!best || nk.length > best[0].length)) best = [nk, w];
  if (best) {
    let need = best[0].split(' ').length, i = 0;
    const toks = clean.split(/\s+/);
    while (i < toks.length && need > 0) { need -= keyOf(toks[i]).split(' ').filter(Boolean).length; i++; }
    while (i < toks.length && !keyOf(toks[i])) i++;                  // pula o "·" / "-"
    return { titulo: best[1].name, eps: toks.slice(i).join(' ').trim(), work: best[1] };
  }
  const parts = clean.split(/\s+[·•|]\s+/);
  return { titulo: parts[0].trim(), eps: parts.slice(1).join(' · ').trim(), work: null };
}
// "T2 Ep 7" · "Eps 6 e 7" · "Eps 1 ao 3" · "Ep 5 (final)" → { t, eps:[…] }
function epsOf(str) {
  const t = (str.match(/\bT\s*(\d+)/i) || str.match(/temporada\s*(\d+)/i) || [])[1];
  const s = str.replace(/\bT\s*\d+/i, '').replace(/temporada\s*\d+/i, '');
  const nums = [];
  const r = s.match(/(\d+)\s*(?:ao|a|-|–|até)\s*(\d+)/i);
  if (r) for (let i = Number(r[1]); i <= Number(r[2]) && nums.length < 60; i++) nums.push(i);
  else for (const n of s.match(/\d+/g) || []) nums.push(Number(n));
  return { t: t ? Number(t) : null, eps: nums };
}
function sponsorsFor(work, eps) {
  if (!work) return [];
  const { t, eps: list } = epsOf(eps || '');
  const nicks = [];
  const add = n => { if (!nicks.includes(n)) nicks.push(n); };
  if (list.length) {
    const cls = work.checklists.filter(cl => t == null || cl.n === t || (t === 1 && cl.n == null));
    for (const cl of cls) for (const it of cl.items) if (list.includes(it.n)) (it.nicks.length ? it.nicks : cl.nicks).forEach(add);
  }
  if (!nicks.length && !work.checklists.length) splitNicks(work.desc.pat || '').forEach(add);   // filme: "Patrocinado por:"
  return nicks;
}

export function buildCronograma(cards, works, idx, warn, horarioPadrao = '23h') {
  const now = brNow(), today = iso(now);
  const days = new Map();
  let offline = null;
  const crono = cards.filter(c => c.kind === 'cronograma');
  for (const c of crono) {
    const d = parseDayTitle(c.name, today);
    if (!d) { warn(`Cartão do CRONOGRAMA sem data no título (ignorado): "${c.name}"`); continue; }
    const fl = c.flags;
    const isOff = fl.has('offlive');
    const day = days.get(d.data) || { data: d.data, itens: [] };
    if (!isOff && d.hora) day.hora = horaLabel(d.hora);
    if (!isOff && fl.has('folga')) { day.folga = true; if (c.desc.obs) day.nota = c.desc.obs; }

    const items = c.checklists.flatMap(cl => cl.items);
    for (const it of items) {
      const p = parseProgItem(it.text, idx);
      const w = p.work;
      const ownNicks = (it.text.match(/\(([^)]*)\)\s*$/) || [])[1];
      const nicks = ownNicks ? splitNicks(ownNicks).filter(x => !isChat(x)) : sponsorsFor(w, p.eps);
      const status = fl.has('cancelado') ? 'cancelado' : fl.has('adiado') ? 'adiado' : (w && w.flags.has('standby')) ? 'standby' : 'confirmado';
      const o = { titulo: p.titulo };
      if (w) { o.cat = w.cat; if (w.lang) o.lang = w.lang; }
      if (p.eps) o.eps = p.eps;
      if (nicks.length) o.patrocinador = nicks.join(', ');
      o.status = status;
      if (isOff) o.nota = `🎬 React Offline${d.hora ? ' · ' + horaLabel(d.hora) : ''}`;
      else if (c.desc.obs && items.length === 1) o.nota = c.desc.obs;
      day.itens.push(o);
      if (!w && !/just chatting|jogo|game|irl|conversa/i.test(it.text)) warn(`Item do cronograma sem cartão de obra com esse nome: "${it.text}" (${c.name})`);

      // Off Live: a próxima sessão (a partir de 4h atrás) vira a "Próxima sessão" da aba Reacts Offline
      if (isOff) {
        const when = Date.parse(`${d.data}T${d.hora || '23:00'}:00-03:00`);
        if (when > Date.now() - 4 * 3600e3 && (!offline || when < offline._t)) {
          offline = { _t: when, titulo: p.titulo, data: d.data, hora: d.hora || '23:00' };
          if (w) { offline.cat = w.cat; if (w.lang) offline.lang = w.lang; }
          if (c.desc.classificacao) offline.classificacao = c.desc.classificacao.replace(/\D+/g, '') || c.desc.classificacao;
          if (c.desc.aviso) offline.aviso = c.desc.aviso;
          if (nicks.length) offline.patrocinador = nicks.join(', ');
        }
      }
    }
    if (!items.length && !day.folga && !isOff) {
      if (fl.has('cancelado')) day.itens.push({ titulo: 'Live cancelada', status: 'cancelado', ...(c.desc.obs ? { motivo: c.desc.obs } : {}) });
      else if (fl.has('adiado')) day.itens.push({ titulo: 'Live adiada', status: 'adiado', ...(c.desc.obs ? { motivo: c.desc.obs } : {}) });
    }
    days.set(d.data, day);
  }
  const dias = [...days.values()]
    .filter(d => d.data >= today)
    .filter(d => d.folga || d.itens.length)           // dia sem programação ainda: não mostra
    .sort((a, b) => a.data.localeCompare(b.data));
  for (const d of dias) if (!d.itens.length) delete d.itens;

  // Fila de patrocinados: episódios pagos e ainda não assistidos que não estão nos próximos dias.
  const marcados = new Set(dias.flatMap(d => (d.itens || []).map(i => keyOf(i.titulo))));
  const fila = [];
  for (const w of [...works].sort((a, b) => a.rank - b.rank)) {
    if (w.kind === 'completo' || marcados.has(keyOf(w.name))) continue;
    const base = { titulo: w.name, cat: w.cat, ...(w.lang ? { lang: w.lang } : {}) };
    if (w.flags.has('standby')) base.status = 'standby';
    if (w.checklists.length) {
      for (const cl of w.checklists) {
        const pend = cl.items.filter(i => !i.done && (i.nicks.length || cl.nicks.length));
        if (!pend.length) continue;
        const nums = pend.map(i => i.n).filter(n => n != null);
        const nicks = [...new Set(pend.flatMap(i => i.nicks.length ? i.nicks : cl.nicks))];
        const label = cl.n ? `T${cl.n} ` : cl.l ? `${cl.l} · ` : '';
        const eps = nums.length === 1 ? `Ep ${nums[0]}` : nums.length ? `Eps ${rangeText(nums)}` : '';
        fila.push({ ...base, eps: (label + eps).trim(), patrocinador: nicks.join(', ') });
      }
    } else if (w.kind === 'fila' && (w.pat.length || w.pago) && !w.flags.has('offlive')) {
      fila.push({ ...base, ...(w.pat.length ? { patrocinador: w.pat.join(', ') } : {}) });   // pago sem nick conhecido ("????")
    }
  }
  if (offline) delete offline._t;
  return { horario: horarioPadrao, dias, fila, offline };
}
function rangeText(nums) {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const runs = [];
  for (const n of s) { const r = runs[runs.length - 1]; if (r && n === r[1] + 1) r[1] = n; else runs.push([n, n]); }
  const parts = runs.map(([a, b]) => a === b ? `${a}` : b === a + 1 ? `${a} e ${b}` : `${a} ao ${b}`);
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1] : parts[0];
}
