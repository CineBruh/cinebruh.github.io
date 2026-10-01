#!/usr/bin/env node
/**
 * sync-drive.mjs — Robô de sincronização Google Drive → data.json (Cinebruh)
 *
 * O QUE FAZ
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
 *   3. Mescla com editorial.json (emoji, alias) e busca as CAPAS automaticamente no TMDB.
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

// ───────────────────────────── CONFIG ─────────────────────────────
const ROOT_FOLDER_ID = process.env.CINEBRUH_ROOT_ID || '1iAgJHwf9WwZyZX6nGfWq0-KcjvjsZBiX';
const API_KEY        = process.env.GDRIVE_API_KEY;
const OUT_FILE       = 'data.json';
const EDITORIAL_FILE = 'editorial.json';

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

// Categorias em que "com conteúdo e sem marcador" significa completo (e não assistindo).
const DEFAULT_COMPLETO = new Set(['filmes', 'vods']);

// ───────────────────────────── DRIVE API ─────────────────────────────
const FOLDER_MIME = 'application/vnd.google-apps.folder';

async function listFolder(id) {
  const files = [];
  let pageToken = '';
  do {
    const p = new URLSearchParams({
      q: `'${id}' in parents and trashed=false`,
      key: API_KEY,
      fields: 'nextPageToken,files(id,name,mimeType)',
      pageSize: '1000',
      orderBy: 'name_natural',
    });
    if (pageToken) p.set('pageToken', pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${p}`);
    if (!res.ok) throw new Error(`Drive API ${res.status} ao listar ${id}: ${await res.text()}`);
    const json = await res.json();
    files.push(...(json.files || []));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return files;
}

const isFolder = f => f.mimeType === FOLDER_MIME;
const isVideo  = f => /\.(mp4|mkv|webm|mov|m4v|avi)$/i.test(f.name) || (f.mimeType || '').startsWith('video/');

// ───────────────────────────── PARSING DE NOMES ─────────────────────────────
const STATUS_MARK = { '✅': 'completo', '⌧': 'embreve', '⚠': 'incompleto', '$': 'aberto' };

const stripAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
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
  for (const sf of subfolders) {
    const kids = await listFolder(sf.id);
    const ep = buildEpisodes(kids.filter(isVideo));
    const s = ep.length ? (/✅/.test(sf.name) ? 'g' : 'y') : 'r';
    const numM = sf.name.match(/temporada\s+(\d+)/i) || sf.name.match(/season\s+(\d+)/i);
    const base = numM
      ? { n: Number(numM[1]) }
      : { l: sf.name.replace(/\(\s*✅\s*\)/g, '').replace(/✅/g, '').trim() };
    const season = { ...base, s, id: sf.id };
    if (ep.length) season.ep = ep;
    out.push(season);
  }
  return out;
}

// Lista de episódios com ID de cada arquivo (é o que o player usa para tocar episódio a episódio).
function buildEpisodes(videos) {
  const raw = videos.map(v => {
    const m = v.name.match(/\bep\.?\s*(\d+)/i);
    const sr = /sem\s*rea[cç][aã]o/i.test(v.name);
    return { n: m ? Number(m[1]) : null, id: v.id, sr };
  });
  raw.sort((a, b) => (a.n ?? 1e9) - (b.n ?? 1e9));           // ordena por número de episódio
  const seen = new Set();
  const out = [];
  for (const e of raw) {
    if (e.n != null) { if (seen.has(e.n)) continue; seen.add(e.n); } // remove Ep duplicado
    const o = { n: e.n ?? out.length + 1, id: e.id };
    if (e.sr) o.sr = 1;                                       // "(SEM REAÇÃO)"
    out.push(o);
  }
  return out;
}

// ───────────────────────────── MONTAGEM DE OBRA ─────────────────────────────
async function buildWork(folder, cat, depth) {
  const { title, lang, nota, mark } = parseName(folder.name);
  const kids = await listFolder(folder.id);
  const subfolders = kids.filter(isFolder);
  const videos = kids.filter(isVideo);

  // Pasta de agrupamento (ex.: "Naruto", "Studio Ghibli"): sem tag de idioma e com
  // subpastas que SÃO obras (com [DUB]/[LEG]). Entra e cataloga cada uma.
  const workSubs = subfolders.filter(sf => /\[(DUB|LEG)\]/i.test(sf.name));
  if (!lang && depth === 0 && workSubs.length) {
    const nested = [];
    for (const sf of workSubs) nested.push(...await buildWork(sf, cat, depth + 1));
    return nested;
  }

  // Temporadas (qualquer subpasta que não seja uma obra) x episódios soltos.
  let seasons = null, eps = null, episodes = null;
  const seasonSubs = subfolders.filter(sf => !/\[(DUB|LEG)\]/i.test(sf.name));
  if (seasonSubs.length) seasons = await buildSeasons(seasonSubs);
  else if (videos.length) { episodes = buildEpisodes(videos); eps = episodes.length; }

  // Status a partir do marcador.
  let status = null, aberto = false, incomplete = false;
  if (mark === 'completo') status = 'completo';
  else if (mark === 'embreve') status = 'embreve';
  else if (mark === 'incompleto') { status = 'assistindo'; incomplete = true; }
  else if (mark === 'aberto' && OPEN_MARKER_ABERTO) aberto = true;

  const hasContent = (seasons && seasons.some(s => s.s !== 'r')) || !!eps;
  if (!status) status = !hasContent ? 'fila' : (DEFAULT_COMPLETO.has(cat) ? 'completo' : 'assistindo');

  const url = status === 'fila' ? null : `https://drive.google.com/drive/folders/${folder.id}`;

  return [{ _driveTitle: title, cat, lang, nota, status, aberto, incomplete, url, seasons, eps, episodes }];
}

// ───────────────────────────── TMDB (capas automáticas) ─────────────────────────────
const stripParen = s => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
const coverMiss = (w, map) => { const dt = map[w.t]; return `${w.cat} :: ${w.t}${dt && dt !== w.t ? `  (pasta: "${dt}")` : ''}`; };

async function tmdbSearch(title, type) {
  const q = new URLSearchParams({ api_key: TMDB_KEY, query: stripParen(title), include_adult: 'false', language: 'pt-BR' });
  const res = await fetch(`https://api.themoviedb.org/3/search/${type}?${q}`);
  if (!res.ok) return null;
  const j = await res.json();
  const hit = (j.results || []).find(r => r.poster_path);
  return hit ? { url: TMDB_IMG + hit.poster_path, tmdb: `${type}/${hit.id}` } : null;
}
async function tmdbById(ref) {
  const [type, id] = String(ref).split('/');
  if (!type || !id) return null;
  const q = new URLSearchParams({ api_key: TMDB_KEY, language: 'pt-BR' });
  const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?${q}`);
  if (!res.ok) return null;
  const j = await res.json();
  return j.poster_path ? { url: TMDB_IMG + j.poster_path, tmdb: `${type}/${id}` } : null;
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

// ───────────────────────────── MAIN ─────────────────────────────
async function main() {
  const editorial = JSON.parse(await readFile(EDITORIAL_FILE, 'utf8').catch(() => '{}'));
  editorial.alias ||= {}; editorial.emoji ||= {}; editorial.img ||= {}; editorial.tmdb ||= {};

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
        byCat.vods.push({ t, cat: 'vods', em: editorial.emoji[t] || CAT_EMOJI.vods, url: `https://drive.google.com/file/d/${f.id}/view` });
      }
      continue;
    }

    for (const wf of (await listFolder(catFolder.id)).filter(isFolder)) {
      for (const w of await buildWork(wf, cat, 0)) {
        const t = canonicalTitle(w._driveTitle, editorial);
        driveTitleOf[t] = w._driveTitle;

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
        byCat[cat].push(obj);
      }
    }
  }

  // Ordena cada categoria pela ordem anterior; obras novas vão para o fim.
  const data = [];
  for (const cat of CAT_ORDER) {
    byCat[cat].sort((a, b) => {
      const ia = prevOrder[`${cat}::${a.t}`] ?? Infinity;
      const ib = prevOrder[`${cat}::${b.t}`] ?? Infinity;
      return ia !== ib ? ia - ib : a.t.localeCompare(b.t, 'pt');
    });
    data.push(...byCat[cat]);
  }

  // ---------- Idioma + capas ----------
  // Capa: editorial.img (arquivo local) > editorial.tmdb (id fixo) > cache > busca no TMDB por nome.
  const cache = JSON.parse(await readFile(COVERS_CACHE, 'utf8').catch(() => '{}'));
  const lang = {}, img = {};
  for (const w of data) {
    if (w.lang) lang[w.t] = w.lang;
    if (w.cat === 'vods') continue;                                        // VODs (lives) não têm capa no TMDB
    if (editorial.img[w.t]) { img[w.t] = editorial.img[w.t]; continue; }   // override manual (arquivo local)
    if (!TMDB_KEY) { missing.push(coverMiss(w, driveTitleOf)); continue; }

    let hit = null;
    if (editorial.tmdb[w.t]) hit = await tmdbById(editorial.tmdb[w.t]);     // id forçado
    else if (cache[w.t] && cache[w.t].url) hit = cache[w.t];               // já resolvido antes
    else hit = await tmdbSearch(w.t, w.cat === 'filmes' ? 'movie' : 'tv'); // busca por nome

    if (hit && hit.url) { img[w.t] = hit.url; cache[w.t] = { url: hit.url, tmdb: hit.tmdb }; }
    else missing.push(coverMiss(w, driveTitleOf));
  }
  if (TMDB_KEY) await writeFile(COVERS_CACHE, JSON.stringify(cache, null, 2) + '\n');

  await writeFile(OUT_FILE, serialize({ data, lang, img }));
  console.log(`✅ ${data.length} obras escritas em ${OUT_FILE}.`);
  if (missing.length) {
    const why = TMDB_KEY
      ? 'o TMDB não achou — force o id certo em editorial.json → "tmdb" (ex.: "tv/12345"), ou use uma capa local em "img"'
      : 'defina TMDB_API_KEY para buscar as capas automaticamente, ou use editorial.json → "img"';
    console.log(`\n⚠ ${missing.length} obra(s) sem capa (${why}):`);
    for (const m of missing) console.log('   • ' + m);
  }
}

main().catch(err => { console.error('❌ Sync falhou:', err); process.exit(1); });
