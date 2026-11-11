#!/usr/bin/env node
/**
 * sync-drive.mjs — Robô de sincronização Trello + Google Drive → data.json e cronograma.json (Cinebruh)
 *
 * DESDE 31/10/2026: O TRELLO MANDA NAS INFORMAÇÕES, O DRIVE MANDA NOS VÍDEOS
 *   - Trello (scripts/trello.mjs, ver GUIA-TRELLO.md): status (lista), categoria, áudio, nota, Stand-by,
 *     Off Live, patrocinadores, episódios assistidos, dia fixo, review e o cronograma.
 *   - Drive: as pastas têm o MESMO nome do cartão no Trello e guardam só os vídeos (temporadas e episódios).
 *   - Pasta sem cartão no Trello continua funcionando do jeito antigo (símbolo e [DUB]/[LEG] no nome).
 *   - Cartão sem pasta no Drive entra no catálogo sem vídeo (ex.: obra na fila que ainda não começou).
 *   - Se o Trello não responder, o robô PARA sem mexer em nada (o site fica com o catálogo anterior).
 *
 * O QUE FAZ (parte do Drive)
 *   1. Lê a pasta pública do Drive da Bruna (só leitura, via chave de API).
 *   2. Interpreta a convenção de nomes das pastas:
 *        - Categoria = pasta da raiz (Animes, Filmes, Séries, Tokusatsu, Animações, VOD's do Canal)
 *        - Status    = símbolo no início do nome:
 *                        ✅ completo · $ em aberto · ⌧ em breve · ⚠ incompleto
 *                        (sem símbolo + com conteúdo = assistindo · sem símbolo + pasta vazia = fila)
 *        - Idioma    = [DUB] / [LEG]
 *        - Nota      = número logo após o [DUB]/[LEG]   (ex.: "✅ Orange [DUB] 10")
 *        - Temporadas = subpastas ("Temporada N (✅)" → verde; sem ✅ mas com vídeos → amarelo; vazia → vermelho)
 *        - Episódios  = arquivos de vídeo soltos (captura ID + número "EpN"; "(SEM REAÇÃO)" vira sr:1)
 *        - VODs       = arquivos soltos dentro de "VOD's do Canal"
 *        - Pastas de agrupamento (Naruto, Studio Ghibli, etc.) → entra e cataloga cada obra dentro
 *   3. Mescla com editorial.json (emoji, alias, aka) e busca no TMDB as CAPAS, o ano e os outros nomes da obra
 *      (original e em inglês, pra busca do site achar "Sousou no Frieren" ou "Frieren: Beyond Journey's End").
 *      Do Drive também vêm as datas (pasta criada = "add", vídeo mais novo = "upd") e a duração de cada vídeo ("d").
 *   4. Reescreve data.json preservando a ordem atual; obras novas entram no fim de cada categoria.
 *   5. No fim, lista toda obra sem capa (o emoji é opcional; o título vem do próprio Drive).
 *
 * COMO RODAR LOCALMENTE (PowerShell):
 *   $env:GDRIVE_API_KEY = "sua-chave"; node scripts/sync-drive.mjs
 * No GitHub isso roda sozinho — veja .github/workflows/sync-catalog.yml.
 *
 * SEM dependências: usa só o que já vem no Node 20+ (fetch e fs nativos).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { loadBoard, workCards, indexWorks, buildCronograma, keyOf } from './trello.mjs';

// ───────────────────────────── CONFIG ─────────────────────────────
const ROOT_FOLDER_ID = process.env.CINEBRUH_ROOT_ID || '1iAgJHwf9WwZyZX6nGfWq0-KcjvjsZBiX';
const API_KEY        = process.env.GDRIVE_API_KEY;
const OUT_FILE       = 'data.json';
const EDITORIAL_FILE = 'editorial.json';
const CRONO_FILE     = 'cronograma.json';
const AVISOS_FILE    = 'sync-avisos.json';                // avisos da última rodada (o notify-discord.mjs avisa só os novos)

// '$' no início do nome = obra "em aberto" (aberta a pedidos/patrocínio).
//   true  → toda pasta com '$' vira aberto:true (fiel ao marcador do Drive; pode adicionar
//           o selo "Em aberto" a itens que hoje estão sem ele).
//   false → ignora o '$' (mantém como estava no data.json anterior).
const OPEN_MARKER_ABERTO = true;

if (!API_KEY) {
  console.error('❌ Falta a variável de ambiente GDRIVE_API_KEY.');
  process.exit(1);
}

const TMDB_KEY = process.env.TMDB_API_KEY;              // opcional: liga as capas automáticas
const COVERS_CACHE = 'covers-cache.json';               // guarda as capas já resolvidas (runs rápidos e estáveis)
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';     // CDN de imagens do TMDB (usado direto pelo site)

// Nome da pasta da raiz → chave de categoria do site.
const CAT_BY_FOLDER = {
  'animes': 'animes',
  'filmes': 'filmes',
  'series': 'series',
  'tokusatsu': 'tokusatsu',
  'animacoes': 'animacoes',
  'vods do canal': 'vods',
};
const CAT_ORDER = ['animes', 'filmes', 'series', 'tokusatsu', 'animacoes', 'vods'];
const CAT_EMOJI = { animes: '🎬', filmes: '🎞️', series: '📺', tokusatsu: '🦸', animacoes: '🎨', vods: '📹' };
const CAT_LABEL_TXT = { animes: 'Animes', filmes: 'Filmes', series: 'Séries', tokusatsu: 'Tokusatsu', animacoes: 'Animações', vods: "VOD's" };
const videoCount = o => (o.seasons || []).reduce((n, s) => n + (s.ep ? s.ep.length : 0), 0) + (o.episodes ? o.episodes.length : 0);

// Categorias em que "com conteúdo e sem marcador" significa completo (e não assistindo).
const DEFAULT_COMPLETO = new Set(['filmes', 'vods']);

// ───────────────────────────── DRIVE API ─────────────────────────────
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Erros 5xx/429 do Google costumam ser passageiros: tenta de novo (1s, 3s, 9s) antes de desistir.
async function driveFetch(url, id) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    const retryable = res.status >= 500 || res.status === 429;
    if (!retryable || attempt >= 3) throw new Error(`Drive API ${res.status} ao listar ${id}: ${await res.text()}`);
    console.warn(`⚠️ Drive API ${res.status} ao listar ${id}; tentando de novo (${attempt + 1}/3)…`);
    await sleep(1000 * 3 ** attempt);
  }
}

async function listFolder(id) {
  const files = [];
  let pageToken = '';
  do {
    const p = new URLSearchParams({
      q: `'${id}' in parents and trashed=false`,
      key: API_KEY,
      fields: 'nextPageToken,files(id,name,mimeType,createdTime,videoMediaMetadata(durationMillis))',
      pageSize: '1000',
      orderBy: 'name_natural',
    });
    if (pageToken) p.set('pageToken', pageToken);
    const json = await driveFetch(`https://www.googleapis.com/drive/v3/files?${p}`, id);
    files.push(...(json.files || []));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return files;
}

const isFolder = f => f.mimeType === FOLDER_MIME;
const isVideo  = f => /\.(mp4|mkv|webm|mov|m4v|avi)$/i.test(f.name) || (f.mimeType || '').startsWith('video/');
const day      = iso => iso ? String(iso).slice(0, 10) : null;                      // "2026-10-26T…" → "2026-10-26"
const durSec   = f => { const ms = Number(f.videoMediaMetadata && f.videoMediaMetadata.durationMillis); return ms > 0 ? Math.round(ms / 1000) : null; };
const newest   = list => list.map(f => f.createdTime).filter(Boolean).sort().pop() || null;

// ───────────────────────────── PARSING DE NOMES ─────────────────────────────
const STATUS_MARK = { '✅': 'completo', '⌧': 'embreve', '⚠': 'incompleto', '$': 'aberto' };

const stripAccents = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '');
const norm = s => stripAccents(s).toLowerCase().replace(/[’]/g, "'").trim();

function parseName(raw) {
  let name = raw.trim();
  let mark = null;
  const first = [...name][0];
  if (STATUS_MARK[first]) { mark = STATUS_MARK[first]; name = name.slice(first.length).trim(); }

  let lang = null, nota = null, title = name;
  const m = name.match(/\[(DUB|LEG)\]/i);
  if (m) {
    lang = m[1].toLowerCase();
    title = name.slice(0, m.index).trim();              // título = tudo antes da tag de idioma
    const after = name.slice(m.index + m[0].length).trim();
    const n = after.match(/^(\d{1,2})\b/);              // nota = número logo após a tag
    if (n) nota = Number(n[1]);
  }
  title = title.replace(/\s{2,}/g, ' ').trim();
  return { title, lang, nota, mark };
}

// ───────────────────────────── TEMPORADAS / EPISÓDIOS ─────────────────────────────
async function buildSeasons(subfolders) {
  const out = [];
  let last = null;
  for (const sf of subfolders) {
    const kids = await listFolder(sf.id);
    const vids = kids.filter(isVideo);
    const ep = buildEpisodes(vids);
    const nw = newest(vids); if (nw && (!last || nw > last)) last = nw;
    // temporada só com vídeos "(SEM REAÇÃO)" (original esperando o react) conta como vazia
    const s = ep.some(e => !e.sr) ? (/✅/.test(sf.name) ? 'g' : 'y') : 'r';
    const numM = sf.name.match(/temporada\s+(\d+)/i) || sf.name.match(/season\s+(\d+)/i);
    const base = numM
      ? { n: Number(numM[1]) }
      : { l: sf.name.replace(/\(\s*✅\s*\)/g, '').replace(/✅/g, '').trim() };
    const season = { ...base, s, id: sf.id };
    if (ep.length) season.ep = ep;
    out.push(season);
  }
  out.last = last;                                            // vídeo mais novo de todas as temporadas
  return out;
}

// Lista de episódios com ID de cada arquivo (é o que o player usa para tocar episódio a episódio).
// "d" = duração em segundos (quando o Drive informa), usada no total de horas de react.
// EXTRA = vídeo sem "Ep N" no nome, ou com "Spin-Off" / "Especial" / "OVA" / "Extra" no nome.
//   Entra com o nome do arquivo em "l" e número 1001, 1002… (não se confunde com o "Episódio N" do Trello).
//   Posição: "Ep 0" no nome = antes de todos; "Ep 14" = logo depois do episódio 14; sem número = no fim.
//   Ex.: "Kaiju No 8. Ep0 - Spin-Off - A Folga De Hoshina.mp4" → primeiro da temporada.
// Se NENHUM vídeo da pasta tiver número (ex.: filme), numera 1, 2, 3… como antes.
const EXTRA_RX = /spin[\s_-]*off|especial|\bova\b|\bextra\b/i;
function extraLabel(name) {
  let l = name.replace(/\.[^.]+$/, '').replace(/\(\s*sem\s*rea[cç][aã]o\s*\)/i, '');
  const sp = l.search(EXTRA_RX);
  if (sp > 0) l = l.slice(sp);                                // tira "Kaiju No 8. Ep0 - " da frente
  else l = l.replace(/\b(?:ep|epis[oó]dio)\.?\s*\d+\b/i, '');
  return l.replace(/\(\s*\)/g, '').replace(/^[\s.·:_-]+|[\s.·:_-]+$/g, '').replace(/\s{2,}/g, ' ') || 'Extra';
}
function buildEpisodes(videos) {
  const raw = videos.map(v => {
    const m = v.name.match(/\b(?:ep|epis[oó]dio)\.?\s*(\d+(?:[.,]\d+)?)/i);       // "Ep5.5" = episódio especial entre o 5 e o 6
    const sr = /sem\s*rea[cç][aã]o/i.test(v.name);
    const n = m ? Number(m[1].replace(',', '.')) : null;
    const x = n == null || EXTRA_RX.test(v.name);
    return { n, x, k: x ? (n == null ? 1e9 : n + 0.5) : n, id: v.id, sr, d: durSec(v), name: v.name };
  });
  raw.sort((a, b) => a.k - b.k);                               // ordena por número (extras no lugar deles)
  const anyNumbered = raw.some(e => !e.x);
  const seen = new Set();
  const out = [];
  let extra = 0;
  for (const e of raw) {
    if (!e.x) { if (seen.has(e.n)) continue; seen.add(e.n); } // remove Ep duplicado
    const o = { n: e.x ? (anyNumbered ? 1001 + extra++ : out.length + 1) : e.n, id: e.id };
    if (e.x && anyNumbered) o.l = extraLabel(e.name);
    if (e.sr) o.sr = 1;                                       // "(SEM REAÇÃO)"
    if (e.d) o.d = e.d;
    out.push(o);
  }
  return out;
}

// ───────────────────────────── MONTAGEM DE OBRA ─────────────────────────────
const hasTag = name => /\[(DUB|LEG)\]/i.test(name);
// subpasta com cara de temporada/parte (o resto, numa pasta sem vídeos soltos, é obra dentro de agrupamento)
const SEASON_LIKE = /^(temporada|season|parte|part|ovas?|especial|especiais|extras?|filmes?|movie|cour|t \d+)\b|\b(arc|arco|saga)\b/;
const looksLikeSeason = name => SEASON_LIKE.test(keyOf(name));

// ctx.cardFor(título) → cartão do Trello com esse nome; inherit = cartão da pasta de agrupamento
async function buildWork(folder, cat, depth, ctx, inherit = null) {
  // ⚠ no começo do nome = pasta adiantada (vídeos originais esperando patrocínio): o site ignora
  if (/^\s*⚠/.test(folder.name)) { console.log(`   (ignorada, marcada com ⚠: "${folder.name}")`); return []; }
  const { title, lang, nota, mark } = parseName(folder.name);
  const kids = await listFolder(folder.id);
  const subfolders = kids.filter(isFolder);
  const videos = kids.filter(isVideo);
  const card = ctx.cardFor(title);

  // Pasta de agrupamento (ex.: "Naruto", "Studio Ghibli", "O Senhor dos Anéis (Trilogia)"): as subpastas
  // são OBRAS. Vale quando alguma subpasta tem cartão próprio no Trello (ou [DUB]/[LEG] no nome antigo),
  // ou quando nenhuma subpasta tem cara de temporada. Obra sem cartão próprio herda o cartão do agrupamento.
  const isGroup = depth === 0 && !lang && subfolders.length && !videos.length && (
    subfolders.some(sf => hasTag(sf.name) || ctx.cardFor(parseName(sf.name).title)) ||
    subfolders.every(sf => !looksLikeSeason(sf.name)));
  if (isGroup) {
    if (card) ctx.groupCards.add(card);
    const nested = [];
    for (const sf of subfolders) nested.push(...await buildWork(sf, cat, depth + 1, ctx, card || inherit));
    return nested;
  }

  // Temporadas (qualquer subpasta que não seja uma obra) x episódios soltos.
  let seasons = null, eps = null, episodes = null;
  const seasonSubs = subfolders.filter(sf => !hasTag(sf.name));
  if (seasonSubs.length) seasons = await buildSeasons(seasonSubs);
  else if (videos.length) { episodes = buildEpisodes(videos); eps = episodes.length; }

  // Status a partir do marcador.
  let status = null, aberto = false, incomplete = false;
  if (mark === 'completo') status = 'completo';
  else if (mark === 'embreve') status = 'embreve';
  else if (mark === 'incompleto') { status = 'assistindo'; incomplete = true; }
  else if (mark === 'aberto' && OPEN_MARKER_ABERTO) aberto = true;

  // Só conta como "já tem react" vídeo que NÃO é "(SEM REAÇÃO)" (original subido pra Bruna assistir depois).
  const hasContent = (seasons && seasons.some(s => s.s !== 'r')) || !!(episodes && episodes.some(e => !e.sr));
  if (!status) status = !hasContent ? 'fila' : (DEFAULT_COMPLETO.has(cat) ? 'completo' : 'assistindo');

  const folderUrl = `https://drive.google.com/drive/folders/${folder.id}`;
  const url = status === 'fila' ? null : folderUrl;

  // Datas: "add" = quando a pasta da obra foi criada; "upd" = vídeo mais novo (episódio novo).
  const add = day(folder.createdTime);
  const upd = day(seasons ? seasons.last : newest(videos));

  return [{ _driveTitle: title, _card: card || inherit, _inherited: !card && !!inherit, _folder: folder.name,
    cat, lang, nota, status, aberto, incomplete, url, folderUrl, hasContent, seasons, eps, episodes, add, upd }];
}

// ───────────────────────────── TRELLO → OBRA ─────────────────────────────
// Liga as temporadas/episódios do Drive às checklists do cartão: temporada verde quando a checklist
// está toda marcada (ou tem ✅ no nome), nick de quem patrocinou em cada episódio ("por").
function findChecklist(cls, s) {
  const hit = cls.find(cl => s.n != null ? cl.n === s.n : (cl.l && keyOf(cl.l) === keyOf(s.l)));
  if (hit) return hit;
  return s.n === 1 && cls.length === 1 && cls[0].n == null ? cls[0] : null;
}
const clDone = cl => cl.done || (cl.items.length > 0 && cl.items.every(i => i.done));
function tagEpisodes(eps, cl) {
  if (!cl || !eps) return;
  for (const e of eps) {
    const it = cl.items.find(i => i.n === e.n);
    const nicks = it && it.nicks.length ? it.nicks : cl.nicks;
    if (nicks.length) e.por = nicks.join(', ');
    if (it && it.chat) e.chat = 1;
  }
}
function mergeSeasons(w, c) {
  const cls = c.checklists;
  if (w.seasons) {
    const used = new Set();
    for (const s of w.seasons) {
      const cl = findChecklist(cls, s);
      if (cl) used.add(cl);
      if (s.ep && s.ep.length) s.s = (c.kind === 'completo' || (cl && clDone(cl))) ? 'g' : (cl ? 'y' : s.s);
      tagEpisodes(s.ep, cl);
    }
    // temporada/parte que só existe no Trello (paga, mas ainda sem vídeo no Drive)
    for (const cl of cls) if (!used.has(cl) && cl.items.length) w.seasons.push(cl.n != null ? { n: cl.n, s: 'r' } : { l: cl.l, s: 'r' });
    w.seasons.sort((a, b) => (a.n ?? 1e3) - (b.n ?? 1e3));
  } else if (w.episodes) {
    tagEpisodes(w.episodes, cls.find(cl => cl.n === 1) || (cls.length === 1 ? cls[0] : null));
  } else if (cls.some(cl => cl.items.length) && c.cat !== 'filmes') {
    // obra sem vídeo nenhum no Drive: mostra as temporadas do Trello (sem link)
    w.seasons = cls.filter(cl => cl.items.length).map(cl => ({ ...(cl.n != null ? { n: cl.n } : { l: cl.l }), s: clDone(cl) ? 'g' : cl.items.some(i => i.done) ? 'y' : 'r' }));
  }
}

// Monta a obra do site com o que o Trello diz (o Drive entra com vídeos e datas).
function applyCard(o, w, c) {
  mergeSeasons(w, c);
  const watched = c.anyDone || w.hasContent;
  let status;
  if (c.flags.has('offlive')) status = 'embreve';
  else if (c.kind === 'completo') status = 'completo';
  else if (c.kind === 'fila' || c.kind === 'fixo') status = watched ? 'assistindo' : 'fila';   // FIXO que ainda não começou = na fila
  else status = 'assistindo';                                            // EM ABERTO
  const lang = c.lang || w.lang, nota = c.nota ?? w.nota;
  const url = status === 'fila' && !w.hasContent ? null : w.folderUrl;
  if (url) o.url = url;
  if (lang) o.lang = lang;
  if (!(o.cat === 'filmes' && status === 'completo')) o.status = status;  // filme completo omite status
  if (c.kind === 'aberto') o.aberto = true;
  if (c.kind === 'fixo') o.fixo = true;
  if (w.incomplete) o.incomplete = true;
  if (nota != null) o.nota = nota;
  if (w.eps != null) o.eps = w.eps;
  if (w.episodes && w.episodes.length) o.episodes = w.episodes;
  if (w.seasons && w.seasons.length) o.seasons = w.seasons;
  if (w.add) o.add = w.add;
  if (w.upd && w.upd !== w.add) o.upd = w.upd;
  if (c.pat.length) o.pat = c.pat;
  if (status !== 'completo' && c.pago) o.pago = true;                    // tudo já pago: o site não oferece patrocínio
  if (c.desc.dia) o.dia = c.desc.dia;
  if (c.desc.review) o.review = c.desc.review;
  if (c.flags.has('standby')) o.pausa = true;
  if (c.flags.has('escolhadochat')) o.chat = true;
  if (c.flags.has('metaincentive')) o.meta = true;
  if (c.flags.has('proximo')) o.prox = true;
  o.tr = 1;                                                              // status veio do Trello (o site não "adivinha")
  o._rank = c.rank;
  o._tmdb = c.tmdb;
}

// ───────────────────────────── TMDB (capas, outros nomes e ano) ─────────────────────────────
const stripParen = s => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
const coverMiss = (w, map) => { const dt = map[w.t]; return `${w.cat} :: ${w.t}${dt && dt !== w.t ? `  (pasta: "${dt}")` : ''}`; };
const yearOf = r => { const y = parseInt((r.release_date || r.first_air_date || '').slice(0, 4), 10); return y > 1800 ? y : null; };

async function tmdbJSON(path, params = {}) {
  const q = new URLSearchParams({ api_key: TMDB_KEY, ...params });
  const res = await fetch(`https://api.themoviedb.org/3/${path}?${q}`);
  return res.ok ? res.json() : null;
}
// Detalhes de uma obra: capa (em pt-BR), ano e os outros nomes (pra busca do site): original, inglês, pt-BR
// e os "títulos alternativos" do TMDB (romaji, Japão, EUA, Brasil, Portugal…), ex.: "Sousou no Frieren".
const AKA_VER = 2;                                         // subir quando mudar o que entra em "aka" (refaz o cache)
const ALT_COUNTRIES = new Set(['JP', 'US', 'GB', 'BR', 'PT', 'KR', 'CN']);
async function tmdbDetails(type, id) {
  const pt = await tmdbJSON(`${type}/${id}`, { language: 'pt-BR' });
  if (!pt) return null;
  const en = await tmdbJSON(`${type}/${id}`, { language: 'en-US' });
  const alt = await tmdbJSON(`${type}/${id}/alternative_titles`);
  const alts = ((alt && (alt.titles || alt.results)) || [])
    .filter(a => a.title && (ALT_COUNTRIES.has(a.iso_3166_1) || /roma/i.test(a.type || '')))
    .map(a => a.title).slice(0, 8);
  const aka = [pt.original_title || pt.original_name, en && (en.title || en.name), pt.title || pt.name, ...alts].filter(Boolean);
  return { url: pt.poster_path ? TMDB_IMG + pt.poster_path : null, tmdb: `${type}/${id}`, ano: yearOf(pt), aka, akav: AKA_VER };
}
async function tmdbSearch(title, type) {
  const j = await tmdbJSON(`search/${type}`, { query: stripParen(title), include_adult: 'false', language: 'pt-BR' });
  const hit = j && (j.results || []).find(r => r.poster_path);
  return hit ? tmdbDetails(type, hit.id) : null;
}
async function tmdbById(ref) {
  const [type, id] = String(ref).split('/');
  return type && id ? tmdbDetails(type, id) : null;
}

// Outros nomes que valem na busca do site (sem repetir o título exibido nem nomes iguais).
// A lista pode ter buracos: obra que só existe no Trello não tem nome de pasta no Drive.
function akaFor(title, list) {
  const seen = new Set([norm(title)]), out = [];
  for (const a of list || []) {
    if (typeof a !== 'string') continue;
    const k = norm(a);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(a);
  }
  return out;
}

// ───────────────────────────── EDITORIAL ─────────────────────────────
function canonicalTitle(driveTitle, editorial) {
  const a = editorial.alias || {};
  if (a[driveTitle]) return a[driveTitle];
  const nk = norm(driveTitle);
  for (const [k, v] of Object.entries(a)) if (norm(k) === nk) return v;
  return driveTitle;
}

// ───────────────────────────── SERIALIZAÇÃO ─────────────────────────────
// Uma obra por linha (como o data.json atual), para diffs limpos no GitHub.
function jv(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(jv).join(', ') + ']';
  if (typeof v === 'object') return '{ ' + Object.entries(v).map(([k, val]) => `${JSON.stringify(k)}: ${jv(val)}`).join(', ') + ' }';
  return JSON.stringify(v);
}

function serialize({ data, lang, img }) {
  const L = ['{', '  "data": ['];
  let prevCat = null;
  data.forEach((w, i) => {
    if (prevCat && w.cat !== prevCat) L.push('');
    prevCat = w.cat;
    L.push('    ' + jv(w) + (i < data.length - 1 ? ',' : ''));
  });
  L.push('  ],', '', '  "lang": {');
  const le = Object.entries(lang);
  le.forEach(([k, v], i) => L.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)}${i < le.length - 1 ? ',' : ''}`));
  L.push('  },', '', '  "img": {');
  const ie = Object.entries(img);
  ie.forEach(([k, v], i) => L.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)}${i < ie.length - 1 ? ',' : ''}`));
  L.push('  }', '}');
  return L.join('\n') + '\n';
}

// cronograma.json: só reescreve quando a programação muda (senão a hora de "atualizado" geraria commit toda hora)
async function writeCronograma(cr) {
  let prev = {};
  try { prev = JSON.parse(await readFile(CRONO_FILE, 'utf8')); } catch { /* primeira vez */ }
  const body = {
    _leia: 'Gerado pelo robô a partir da lista CRONOGRAMA do Trello (não edite à mão). status: confirmado | adiado | standby | cancelado. hora = horário daquele dia (sem hora, vale "horario"). offline = próxima sessão de React Offline (cartão com etiqueta Off Live).',
    exemplo: false,
    atualizadoEm: null,
    horario: cr.horario,
    aviso: prev.aviso || 'O cronograma pode mudar por imprevistos. Quando algo for adiado ou cancelado, aparece marcado aqui.',
    dias: cr.dias,
    fila: cr.fila,
    ...(cr.offline ? { offline: cr.offline } : {}),
  };
  const same = !prev.exemplo && JSON.stringify({ ...prev, atualizadoEm: null, _leia: null }) === JSON.stringify({ ...body, _leia: null });
  if (same) { console.log(`📅 ${CRONO_FILE}: nada mudou.`); return; }
  const now = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19) + '-03:00';
  body.atualizadoEm = now;
  await writeFile(CRONO_FILE, JSON.stringify(body, null, 2) + '\n');
  console.log(`📅 ${CRONO_FILE}: ${cr.dias.length} dia(s), ${cr.fila.length} na fila de patrocinados${cr.offline ? `, próxima Off Live: ${cr.offline.titulo}` : ''}.`);
}

// ───────────────────────────── MAIN ─────────────────────────────
async function main() {
  const editorial = JSON.parse(await readFile(EDITORIAL_FILE, 'utf8').catch(() => '{}'));
  editorial.alias ||= {}; editorial.emoji ||= {}; editorial.img ||= {}; editorial.tmdb ||= {}; editorial.aka ||= {};

  // Ordem anterior (para minimizar diffs): "cat::título" → posição.
  const prevOrder = {};
  try {
    const prev = JSON.parse(await readFile(OUT_FILE, 'utf8'));
    (prev.data || []).forEach((w, i) => { prevOrder[`${w.cat}::${w.t}`] = i; });
  } catch { /* primeira execução: sem data.json anterior */ }

  const root = await listFolder(ROOT_FOLDER_ID);
  const missing = [];
  const driveTitleOf = {};
  const byCat = {};
  for (const k of CAT_ORDER) byCat[k] = [];

  // ---------- Trello ----------
  const warns = [];
  const warn = m => { if (!warns.includes(m)) warns.push(m); };
  let board;
  try { board = await loadBoard(); }
  catch (e) {
    console.error(`❌ Não consegui ler o Trello: ${e.message}\n   Nada foi alterado: o site continua com o catálogo anterior.`);
    process.exit(1);
  }
  const works = workCards(board, warn);
  const idx = indexWorks(works, warn);
  const ctx = { cardFor: t => idx.get(keyOf(t)) || null, groupCards: new Set() };
  const usedCards = new Map();                                             // cartão → obra montada
  console.log(`📋 Trello: ${works.length} cartões de obra.`);

  for (const catFolder of root.filter(isFolder)) {
    const key = norm(catFolder.name).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const cat = CAT_BY_FOLDER[key];
    if (!cat) { console.warn(`⚠ Categoria desconhecida no Drive: "${catFolder.name}" (ignorada).`); continue; }

    // VODs são arquivos soltos, não pastas.
    if (cat === 'vods') {
      for (const f of (await listFolder(catFolder.id)).filter(isVideo)) {
        const t0 = f.name.replace(/\.[^.]+$/, '').replace(/^vod\s+/i, '').trim();
        const t = canonicalTitle(t0, editorial);
        driveTitleOf[t] = t0;
        const obj = { t, cat: 'vods', em: editorial.emoji[t] || CAT_EMOJI.vods, url: `https://drive.google.com/file/d/${f.id}/view` };
        const d = durSec(f); if (d) obj.d = d;
        const add = day(f.createdTime); if (add) obj.add = add;
        byCat.vods.push(obj);
      }
      continue;
    }

    for (const wf of (await listFolder(catFolder.id)).filter(isFolder)) {
      for (const w of await buildWork(wf, cat, 0, ctx)) {
        const card = w._card;
        const t = card && !w._inherited ? card.name : canonicalTitle(w._driveTitle, editorial);
        driveTitleOf[t] = w._driveTitle;

        if (card) {
          const oc = card.cat;
          if (oc !== cat && !w._inherited) warn(`Categoria diferente: "${t}" está em ${CAT_LABEL_TXT[cat]} no Drive e ${CAT_LABEL_TXT[oc]} no Trello (vale o Trello)`);
          const obj = { t, cat: w._inherited ? cat : oc, em: editorial.emoji[t] || CAT_EMOJI[w._inherited ? cat : oc] };
          applyCard(obj, w, card);
          if (w._inherited) delete obj._tmdb;                          // cada filme do agrupamento tem a sua capa
          if (!w._inherited) {
            const prev = usedCards.get(card);
            if (prev) {                                                  // duas pastas com o mesmo nome
              warn(`Duas pastas no Drive para "${t}" (fica a que tem mais vídeos; junte as duas numa só)`);
              if (videoCount(obj) <= videoCount(prev)) continue;
              byCat[prev.cat].splice(byCat[prev.cat].indexOf(prev), 1);
            }
            usedCards.set(card, obj);
          }
          byCat[obj.cat].push(obj);
          continue;
        }

        // Pasta sem cartão no Trello: jeito antigo (símbolo e [DUB]/[LEG] no nome da pasta).
        // Com ⌧ (Off Live / "em breve", ex.: Obsessão) é de propósito, então não avisa.
        if (w.status !== 'embreve') warn(`Pasta sem cartão no Trello (usei o nome da pasta): ${CAT_LABEL_TXT[cat]} › "${w._folder}"`);
        const obj = { t, cat, em: editorial.emoji[t] || CAT_EMOJI[cat] };
        if (w.url) obj.url = w.url;
        if (w.lang) obj.lang = w.lang;
        if (!(cat === 'filmes' && w.status === 'completo')) obj.status = w.status; // filme completo omite status
        if (w.aberto) obj.aberto = true;
        if (w.incomplete) obj.incomplete = true;
        if (w.nota != null) obj.nota = w.nota;
        if (w.eps != null) obj.eps = w.eps;
        if (w.episodes && w.episodes.length) obj.episodes = w.episodes;
        if (w.seasons && w.seasons.length) obj.seasons = w.seasons;
        if (w.add) obj.add = w.add;
        if (w.upd && w.upd !== w.add) obj.upd = w.upd;
        byCat[cat].push(obj);
      }
    }
  }

  // Cartões sem pasta no Drive: entram sem vídeo (normal pra obra na fila que ainda não começou).
  for (const c of works) {
    if (usedCards.has(c) || ctx.groupCards.has(c)) continue;
    const obj = { t: c.name, cat: c.cat, em: editorial.emoji[c.name] || CAT_EMOJI[c.cat] };
    applyCard(obj, { hasContent: false, folderUrl: null }, c);
    byCat[c.cat].push(obj);
    if (c.kind !== 'fila' || c.anyDone) warn(`Cartão sem pasta no Drive: "${c.name}" (${c.list}). Crie a pasta com o mesmo nome ou use "Drive:" na descrição`);
  }

  // Ordem de cada categoria = a ordem do Trello (lista e posição do cartão). Obras sem cartão
  // vêm depois, na ordem anterior; obras novas sem cartão vão para o fim.
  const data = [];
  for (const cat of CAT_ORDER) {
    byCat[cat].sort((a, b) => {
      const ra = a._rank ?? Infinity, rb = b._rank ?? Infinity;
      if (ra !== rb) return ra - rb;
      const ia = prevOrder[`${cat}::${a.t}`] ?? Infinity;
      const ib = prevOrder[`${cat}::${b.t}`] ?? Infinity;
      return ia !== ib ? ia - ib : a.t.localeCompare(b.t, 'pt');
    });
    data.push(...byCat[cat]);
  }

  // ---------- Idioma + capas + outros nomes/ano ----------
  // Capa: editorial.img (arquivo local) > editorial.tmdb ou linha "TMDB:" do cartão (id fixo) > cache > busca no TMDB por nome.
  // O cache antigo (só com a capa) é completado sozinho com o ano e os outros nomes na próxima execução.
  const cache = JSON.parse(await readFile(COVERS_CACHE, 'utf8').catch(() => '{}'));
  const lang = {}, img = {};
  for (const w of data) {
    if (w.lang) lang[w.t] = w.lang;
    if (w.cat === 'vods') continue;                                        // VODs (lives) não têm capa no TMDB
    const manualAka = editorial.aka[w.t] || [];
    const forced = editorial.tmdb[w.t] || w._tmdb || null;
    if (!TMDB_KEY) {
      if (editorial.img[w.t]) img[w.t] = editorial.img[w.t]; else missing.push(coverMiss(w, driveTitleOf));
      const aka = akaFor(w.t, [driveTitleOf[w.t], ...manualAka]); if (aka.length) w.aka = aka;
      continue;
    }

    let hit = null;
    const c = cache[w.t];
    const fresh = c && c.aka && c.akav === AKA_VER;                        // cache já com os nomes alternativos
    if (forced) {                                                          // id forçado
      hit = c && c.tmdb === forced && fresh ? c : await tmdbById(forced);
    } else if (c && c.tmdb) {                                              // já resolvido antes
      hit = fresh ? c : (await tmdbById(c.tmdb)) || c;
    } else {
      hit = await tmdbSearch(w.t, w.cat === 'filmes' ? 'movie' : 'tv');   // busca por nome
    }

    if (hit && hit.tmdb) cache[w.t] = { url: hit.url || (c && c.url) || null, tmdb: hit.tmdb, ano: hit.ano || null, aka: hit.aka || [], akav: hit.akav || (c && c.akav) || 1 };
    if (editorial.img[w.t]) img[w.t] = editorial.img[w.t];                // override manual (arquivo local)
    else if (hit && hit.url) img[w.t] = hit.url;
    else missing.push(coverMiss(w, driveTitleOf));
    if (hit && hit.ano) w.ano = hit.ano;
    const aka = akaFor(w.t, [driveTitleOf[w.t], ...(hit && hit.aka || []), ...manualAka]);
    if (aka.length) w.aka = aka;
  }
  if (TMDB_KEY) await writeFile(COVERS_CACHE, JSON.stringify(cache, null, 2) + '\n');

  for (const w of data) for (const k of Object.keys(w)) if (k.startsWith('_')) delete w[k];   // campos internos
  await writeFile(OUT_FILE, serialize({ data, lang, img }));
  console.log(`✅ ${data.length} obras escritas em ${OUT_FILE}.`);

  // ---------- Cronograma (lista CRONOGRAMA do Trello) ----------
  await writeCronograma(buildCronograma(board, works, idx, warn));

  if (warns.length) {
    console.log(`\n📋 ${warns.length} aviso(s) do Trello/Drive (o site funciona, mas vale arrumar):`);
    for (const m of warns) console.log('   • ' + m);
  }
  if (missing.length) {
    const why = TMDB_KEY
      ? 'o TMDB não achou — force o id certo em editorial.json → "tmdb" (ex.: "tv/12345"), ou use uma capa local em "img"'
      : 'defina TMDB_API_KEY para buscar as capas automaticamente, ou use editorial.json → "img"';
    console.log(`\n⚠ ${missing.length} obra(s) sem capa (${why}):`);
    for (const m of missing) console.log('   • ' + m);
  }

  // Guarda os avisos pra o notify-discord.mjs mandar no Discord só o que for NOVO (ordenado = sem commit à toa)
  await writeFile(AVISOS_FILE, JSON.stringify({
    _leia: 'Gerado pelo robô (não edite à mão). Avisos da última sincronização; o Discord recebe só os que aparecerem de novo.',
    avisos: [...warns].sort(), semCapa: [...missing].sort(),
  }, null, 2) + '\n');
}

main().catch(err => { console.error('❌ Sync falhou:', err); process.exit(1); });
