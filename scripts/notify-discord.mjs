#!/usr/bin/env node
/**
 * notify-discord.mjs — Avisa no Discord o que mudou no catálogo (Cinebruh)
 *
 * O QUE FAZ
 *   Compara o data.json anterior com o novo e manda:
 *   1. Novidades (DISCORD_WEBHOOK_NOVIDADES): episódios e filmes novos, obras e
 *      temporadas concluídas, obras novas no catálogo e na fila, VODs novos.
 *   2. Alertas (DISCORD_WEBHOOK_ALERTAS): obras que ficaram sem capa, obras que
 *      sumiram do catálogo (pasta renomeada ou apagada no Drive) e avisos NOVOS do
 *      robô (cartão sem pasta, pasta sem cartão, pastas duplicadas…), lidos do sync-avisos.json.
 *
 * COMO RODAR LOCALMENTE (PowerShell):
 *   $env:DISCORD_WEBHOOK_NOVIDADES = "url"; node scripts/notify-discord.mjs antigo.json data.json avisos-antigo.json sync-avisos.json
 *
 * SEM dependências. Nunca derruba o workflow: erros só aparecem no log.
 */

import { readFile } from 'node:fs/promises';

// ───────────────────────────── CONFIG ─────────────────────────────

const [OLD_FILE = '/tmp/data-old.json', NEW_FILE = 'data.json',
       OLD_AVISOS = '/tmp/avisos-old.json', NEW_AVISOS = 'sync-avisos.json'] = process.argv.slice(2);
const HOOK_NOVIDADES = process.env.DISCORD_WEBHOOK_NOVIDADES;
const HOOK_ALERTAS   = process.env.DISCORD_WEBHOOK_ALERTAS;
const SITE = 'https://cinebruh.github.io/';
const MAX_POR_SECAO = 8;                                  // linhas por seção antes de "…e mais N"
// Trava contra spam: se de uma vez "aparecerem" mais obras que isso, é quase certo que foi
// mudança de formato/primeiro upload (e não novidade de verdade): manda só um alerta privado.
const MAX_OBRAS_NOVAS = 15;

const CAT_NOME = { animes: 'anime', filmes: 'filme', series: 'série', tokusatsu: 'tokusatsu', animacoes: 'animação', vods: 'VOD' };
const SEM_EPISODIOS = new Set(['filmes', 'vods']);        // um vídeo = a obra inteira

// ───────────────────────────── AJUDANTES ─────────────────────────────

const chave  = w => `${w.cat}::${w.t}`;
const status = w => w.status || 'completo';               // filme completo e VOD não gravam status
const nome   = w => `${w.em ? w.em + ' ' : ''}**${w.t}**`;
const rotulo = s => s.n ? `T${s.n}` : s.l;

// Episódios agrupados por temporada: "T1" → Map(número → nome do extra ou null). Episódios soltos ficam em "".
// Extras (spin-off, especial, OVA) têm número 1001+ e o nome em "l" (ver buildEpisodes no sync-drive.mjs).
// Vídeo "(SEM REAÇÃO)" (sr) é o original esperando o react: não conta como react novo.
const epMap = eps => new Map((eps || []).filter(e => !e.sr).map(e => [e.n, e.n > 1000 ? (e.l || 'Extra') : null]));
function epsPorTemporada(w) {
  const m = new Map();
  if (w.episodes) m.set('', epMap(w.episodes));
  for (const s of w.seasons || []) m.set(rotulo(s), epMap(s.ep));
  return m;
}

// [7] → "ep 7" · [12, 13] → "eps 12 a 13" · [3, 8] → "eps 3, 8" · [5.5] → "ep 5.5"
function faixa(nums) {
  nums.sort((a, b) => a - b);
  if (nums.length === 1) return `ep ${nums[0]}`;
  const seguidos = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (seguidos) return `eps ${nums[0]} a ${nums.at(-1)}`;
  return nums.length <= 4 ? `eps ${nums.join(', ')}` : `${nums.length} eps novos`;
}
// episódios normais + extras pelo nome: "eps 3 a 4 + Spin-Off - A Folga De Hoshina"
function descreverNovos(novos) {
  const nums = novos.filter(([, l]) => !l).map(([n]) => n);
  const extras = novos.filter(([, l]) => l).map(([, l]) => l);
  return [nums.length ? faixa(nums) : '', ...extras].filter(Boolean).join(' + ');
}

async function lerJSON(arquivo) {
  try { return JSON.parse(await readFile(arquivo, 'utf8')); } catch { return null; }
}

// Obras (exceto VODs) sem capa no data.json
const semCapa = d => new Set(d.data.filter(w => w.cat !== 'vods' && !d.img?.[w.t]).map(chave));

function montar(secoes) {
  const partes = secoes
    .filter(([, linhas]) => linhas.length)
    .map(([titulo, linhas]) => {
      const extra = linhas.length > MAX_POR_SECAO ? `\n…e mais ${linhas.length - MAX_POR_SECAO}` : '';
      return `**${titulo}**\n${linhas.slice(0, MAX_POR_SECAO).join('\n')}${extra}`;
    });
  return partes.join('\n\n').slice(0, 4000);              // limite do Discord: 4096
}

async function postar(hook, embed) {
  if (!hook) { console.log('ℹ Webhook não configurado, pulando:', embed.title); return; }
  const res = await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'Cinebruh', embeds: [embed], allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) console.warn(`⚠ Discord respondeu ${res.status}: ${await res.text()}`);
  else console.log('✅ Enviado:', embed.title);
}

// ───────────────────────────── MAIN ─────────────────────────────

async function main() {
  const antigo = await lerJSON(OLD_FILE);
  const novo = await lerJSON(NEW_FILE);
  if (!novo) { console.log(`ℹ Não consegui ler ${NEW_FILE}, nada a avisar.`); return; }

  // ---------- Avisos do robô que são novos nesta rodada (canal privado) ----------
  // Vale mesmo sem catálogo anterior: é por aqui que chega "cartão sem pasta no Drive" etc.
  const avA = (await lerJSON(OLD_AVISOS)) || {}, avN = (await lerJSON(NEW_AVISOS)) || {};
  const soNovos = (k, ic) => (avN[k] || []).filter(m => !(avA[k] || []).includes(m)).map(m => `${ic} ${m}`);
  const avisosNovos = soNovos('avisos', '📋');

  if (!antigo) {
    console.log('ℹ Sem catálogo anterior para comparar: só confiro os avisos do robô.');
    await alertar([['Avisos novos do robô', avisosNovos]]);
    return;
  }

  const antes  = new Map(antigo.data.map(w => [chave(w), w]));
  const depois = new Map(novo.data.map(w => [chave(w), w]));

  const concluidas = [], reacts = [], novas = [], fila = [], vods = [];

  for (const [k, w] of depois) {
    const a = antes.get(k);

    // Obra que não existia antes
    if (!a) {
      if (w.cat === 'vods') vods.push(`📹 ${nome(w)}`);
      else if (status(w) === 'fila') fila.push(`⏳ ${nome(w)} (${CAT_NOME[w.cat]})`);
      else novas.push(`🆕 ${nome(w)} (${CAT_NOME[w.cat]})`);
      continue;
    }

    // Filme saiu da fila = react novo
    if (SEM_EPISODIOS.has(w.cat)) {
      if (status(w) === 'completo' && status(a) !== 'completo') reacts.push(`🍿 ${nome(w)} · react do filme no ar!`);
      continue;
    }

    // Obra concluída (se o Trello já marcou tudo mas faltam vídeos no Drive, avisa que estão subindo)
    const emBreve = n => n ? ` · ${n > 1 ? `${n} eps` : '1 ep'} em breve no Drive` : '';
    const fdObra = (w.fd || 0) + (w.seasons || []).reduce((t, s) => t + (s.fd || 0), 0);
    if (status(w) === 'completo' && status(a) !== 'completo') concluidas.push(`✅ ${nome(w)} foi concluído!${emBreve(fdObra)}`);

    // Episódios novos, por temporada
    const epsA = epsPorTemporada(a);
    for (const [temp, eps] of epsPorTemporada(w)) {
      const velhos = epsA.get(temp) || new Map();
      const novos = [...eps].filter(([n]) => !velhos.has(n));
      if (novos.length) reacts.push(`▶️ ${nome(w)}${temp ? ` · ${temp}` : ''} · ${descreverNovos(novos)}`);
    }

    // Temporada que ficou verde (sem repetir quando a obra inteira foi concluída)
    if (status(w) !== 'completo') {
      const tempsA = new Map((a.seasons || []).map(s => [rotulo(s), s.s]));
      for (const s of w.seasons || [])
        if (s.s === 'g' && tempsA.get(rotulo(s)) !== 'g') concluidas.push(`🟢 ${nome(w)} · ${rotulo(s)} completa${emBreve(s.fd)}`);
    }
  }

  // ---------- Novidades (canal público) ----------
  const novidades = montar([
    ['Concluídos', concluidas],
    ['Reacts novos', reacts],
    ['Novos no catálogo', novas],
    ['Entraram na fila', fila],
    ['VODs novos', vods],
  ]);
  const sumiram = [...antes]
    .filter(([k]) => !depois.has(k))
    .map(([, w]) => `🗑️ ${nome(w)} (${CAT_NOME[w.cat]})`);
  const suspeito = novas.length + fila.length + vods.length > MAX_OBRAS_NOVAS || sumiram.length > MAX_OBRAS_NOVAS;

  if (suspeito) {
    console.log('⚠ Mudança grande demais de uma vez: não mando novidades pro público nesta rodada.');
    await postar(HOOK_ALERTAS, {
      title: '🤔 Mudança grande no catálogo, não avisei o público',
      description: `${novas.length + fila.length + vods.length} obra(s) "novas" e ${sumiram.length} "sumida(s)" de uma vez. ` +
        'Deve ser o primeiro upload ou uma mudança de formato do data.json. Se for novidade de verdade, avise no canal à mão.',
      color: 0xF39C12,
      timestamp: new Date().toISOString(),
    });
  } else if (novidades) {
    await postar(HOOK_NOVIDADES, {
      title: '🎬 Novidades no Cinebruh',
      url: SITE,
      description: novidades,
      color: 0xE91E8C,
      footer: { text: 'Atualizado automaticamente a partir do Trello e do Drive' },
      timestamp: new Date().toISOString(),
    });
  } else console.log('ℹ Nada de novo para o público.');

  // ---------- Alertas (canal privado) ----------
  const capaAntes = semCapa(antigo);
  const capas = [...semCapa(novo)]
    .filter(k => !capaAntes.has(k))
    .map(k => `🖼️ ${nome(depois.get(k))} (${CAT_NOME[depois.get(k).cat]})`);

  await alertar([
    ...(suspeito ? [] : [['Sumiram do catálogo (cartão ou pasta renomeada/apagada?)', sumiram]]),
    ['Ficaram sem capa (corrija em editorial.json → "tmdb" ou na linha "TMDB:" do cartão)', capas],
    ['Avisos novos do robô', avisosNovos],
  ]);
}

async function alertar(secoes) {
  const alertas = montar(secoes);
  if (!alertas) return;
  await postar(HOOK_ALERTAS, {
    title: '⚠️ Atenção no catálogo',
    description: alertas,
    color: 0xF39C12,
    timestamp: new Date().toISOString(),
  });
}

main().catch(err => console.error('⚠ Aviso no Discord falhou:', err));