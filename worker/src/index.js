/**
 * Cinebruh API · Cloudflare Worker (Etapas 2A + 2B: LivePix -> Discord / Trello)
 *
 * Rotas:
 *   GET  /health               -> status do Worker e quais integrações estão ativas
 *   POST /api/pedido           -> recalcula o pedido no servidor e cria pagamento na LivePix
 *   POST /api/donate           -> valida valor/mensagem e cria pagamento na LivePix
 *   POST /api/webhook/livepix  -> confirma pagamento, evita duplicidade (KV) e avisa Discord / cria cartão no Trello
 *
 * Segredos (definidos no painel da Cloudflare ou via `wrangler secret put`):
 *   LIVEPIX_CLIENT_ID, LIVEPIX_CLIENT_SECRET, LIVEPIX_WEBHOOK_SECRET
 *   DISCORD_WEBHOOK_PEDIDOS    (opcional — aviso de pedido pago no canal privado)
 *   TRELLO_KEY, TRELLO_TOKEN, TRELLO_LIST_PEDIDOS (opcional — cria cartão na lista de conferência)
 *   GITHUB_TOKEN               (opcional — dispara o workflow sync-catalog.yml de hora em hora)
 */

const LIVEPIX_OAUTH_URL = 'https://oauth.livepix.gg/oauth2/token';
const LIVEPIX_PAYMENTS_URL = 'https://api.livepix.gg/v2/payments';
const TRELLO_CARDS_URL = 'https://api.trello.com/1/cards';

/* Espelha as regras de site.json -> precos.
   Se mudar algum preço no site.json, atualize aqui também. */
export const PRECOS = {
  faixas: {
    curto: 12,
    medio: 20,
    longo: 30,
    filme: 40,
    'filme-longo': null,
  },
  pacote: {
    minEps: 5,
    valorPorEp: 10,
    faixas: ['curto'],
  },
  donateMin: 2,
  donateMax: 5000,
};

const FAIXA_NOME = {
  curto: 'Episódio curto',
  medio: 'Episódio até 1h',
  longo: 'Episódio de 1h+',
  filme: 'Filme',
  'filme-longo': 'Filme 2h30+',
};

let tokenCache = { value: null, exp: 0 };
const processedMem = new Set();

/* ---------- Helpers HTTP / CORS ---------- */
function allowedOrigins(env) {
  return String(env?.ALLOWED_ORIGINS || 'https://cinebruh.github.io')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const list = allowedOrigins(env);
  const allow = list.includes(origin) ? origin : list[0] || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
    },
  });
}

function cleanText(v, max = 140) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function fmtBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- Cálculo de preço no servidor (nunca confia no valor do cliente) ---------- */
export function calcularPedido(body) {
  const titulo = cleanText(body?.titulo, 120);
  if (!titulo) return { error: 'Informe o nome da obra.' };

  const tipo = body?.tipo === 'filmes' ? 'filmes' : 'eps';
  const dur = String(body?.dur || (tipo === 'filmes' ? 'filme' : 'curto'));
  if (!(dur in PRECOS.faixas)) return { error: 'Faixa de duração inválida.' };

  const isFilme = dur === 'filme' || dur === 'filme-longo';
  if ((tipo === 'filmes') !== isFilme) return { error: 'Tipo e duração não combinam.' };

  const unit = PRECOS.faixas[dur];
  if (unit == null) {
    return { error: 'Filmes com mais de 2h30 têm valor a combinar direto com a Bruna.' };
  }

  let s = 1, de = 1, ate = 1, eps = 1;
  if (tipo === 'eps') {
    s = Math.max(1, Math.min(99, parseInt(body?.s, 10) || 1));
    const a = Math.max(1, Math.min(2000, parseInt(body?.de, 10) || 1));
    const b = Math.max(1, Math.min(2000, parseInt(body?.ate, 10) || a));
    de = Math.min(a, b);
    ate = Math.max(a, b);
    eps = ate - de + 1;
    if (eps > 100) return { error: 'Máximo de 100 episódios por pedido.' };
  }

  const pc = PRECOS.pacote;
  const pacote = tipo === 'eps' && pc.faixas.includes(dur) && eps >= pc.minEps;
  const valor = pacote ? eps * pc.valorPorEp : eps * unit;
  const nick = cleanText(body?.nick, 40);
  const epsLabel = tipo === 'filmes' ? '' : ` · T${s} ${eps > 1 ? `eps ${de}–${ate}` : `ep ${de}`}`;
  const descricao = `Pedido de react${nick ? ` (${nick})` : ''}: ${titulo} · ${FAIXA_NOME[dur]}${epsLabel}`;

  return {
    ok: true,
    titulo,
    tipo,
    dur,
    s,
    de,
    ate,
    eps,
    nick,
    pacote,
    valor,
    amountCents: Math.round(valor * 100),
    descricao,
  };
}

export function validarDonate(body) {
  const nome = cleanText(body?.nome, 40);
  const mensagem = cleanText(body?.mensagem, 250);
  const valor = Number(String(body?.valor ?? '').replace(',', '.'));
  if (!Number.isFinite(valor) || valor < PRECOS.donateMin || valor > PRECOS.donateMax) {
    return { error: `Informe um valor entre R$${PRECOS.donateMin} e R$${PRECOS.donateMax}.` };
  }
  const amountCents = Math.round(valor * 100);
  return { ok: true, nome, mensagem, valor: amountCents / 100, amountCents };
}

/* ---------- Cliente LivePix API v2 ---------- */
async function getLivePixToken(env) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.exp > now + 60_000) return tokenCache.value;

  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.LIVEPIX_CLIENT_ID,
    client_secret: env.LIVEPIX_CLIENT_SECRET,
    scope: env.LIVEPIX_SCOPE || 'payments:write payments:read webhooks',
  });

  const res = await fetch(LIVEPIX_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`LivePix OAuth HTTP ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('LivePix OAuth sem access_token');
  tokenCache = {
    value: data.access_token,
    exp: now + (Number(data.expires_in) || 3600) * 1000,
  };
  return tokenCache.value;
}

async function createLivePixPayment(env, { amountCents, redirectUrl }) {
  if (env?.MOCK_LIVEPIX === '1') {
    const ref = `mock_${Date.now()}`;
    return {
      mock: true,
      reference: ref,
      redirectUrl: `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}mock_ref=${ref}`,
    };
  }

  const token = await getLivePixToken(env);
  const res = await fetch(LIVEPIX_PAYMENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountCents,
      currency: 'BRL',
      redirectUrl,
    }),
  });
  if (!res.ok) throw new Error(`LivePix Payment HTTP ${res.status}`);
  const body = await res.json();
  const data = body?.data || body || {};
  return {
    mock: false,
    reference: data.reference || data.id || null,
    redirectUrl: data.redirectUrl || data.url || null,
  };
}

function isLivePixReady(env) {
  return env?.MOCK_LIVEPIX === '1' || Boolean(env?.LIVEPIX_CLIENT_ID && env?.LIVEPIX_CLIENT_SECRET);
}

/* ---------- Etapa 2B: KV (idempotência + metadados), Trello e Discord ---------- */
async function kvSaveOrder(env, ref, data) {
  if (!env?.PEDIDOS_KV || !ref) return;
  try {
    await env.PEDIDOS_KV.put(`order:${ref}`, JSON.stringify({ ...data, createdAt: new Date().toISOString() }), {
      expirationTtl: 7 * 86400,
    });
  } catch {}
}

async function kvGetOrder(env, ref) {
  if (!env?.PEDIDOS_KV || !ref) return null;
  try {
    const raw = await env.PEDIDOS_KV.get(`order:${ref}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function isDuplicate(env, ref) {
  if (!ref) return false;
  if (processedMem.has(ref)) return true;
  if (env?.PEDIDOS_KV) {
    try {
      const done = await env.PEDIDOS_KV.get(`done:${ref}`);
      if (done) { processedMem.add(ref); return true; }
    } catch {}
  }
  return false;
}

async function markProcessed(env, ref) {
  if (!ref) return;
  processedMem.add(ref);
  if (processedMem.size > 500) processedMem.clear();
  if (env?.PEDIDOS_KV) {
    try {
      await env.PEDIDOS_KV.put(`done:${ref}`, new Date().toISOString(), { expirationTtl: 30 * 86400 });
    } catch {}
  }
}

async function createTrelloOrderCard(env, order, ref) {
  if (!env?.TRELLO_KEY || !env?.TRELLO_TOKEN || !env?.TRELLO_LIST_PEDIDOS) return null;
  if (!order || order.kind !== 'pedido') return null;
  const descLines = [
    order.nick ? `Patrocinado por: ${order.nick}` : null,
    `Obs: ${order.descricao}`,
    `Valor pago: ${fmtBRL(order.valor)} (LivePix ref: ${ref})`,
  ].filter(Boolean);

  if (env?.MOCK_EXTERNAL === '1') {
    return { mock: true, url: `https://trello.com/c/mock-${ref}`, name: order.titulo };
  }

  const params = new URLSearchParams({
    key: env.TRELLO_KEY,
    token: env.TRELLO_TOKEN,
    idList: env.TRELLO_LIST_PEDIDOS,
    name: order.titulo,
    desc: descLines.join('\n'),
  });
  const res = await fetch(`${TRELLO_CARDS_URL}?${params.toString()}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Trello HTTP ${res.status}`);
  const card = await res.json();
  return { id: card.id, url: card.shortUrl || card.url || null };
}

async function notifyDiscordPayment(env, order, ref, trelloCard) {
  if (!env?.DISCORD_WEBHOOK_PEDIDOS) return false;
  const isPedido = order && order.kind === 'pedido';
  const title = isPedido ? `🎬 Novo pedido pago: ${order.titulo}` : '💜 Novo Pix confirmado (LivePix)';
  const fields = [];
  if (order?.valor != null) fields.push({ name: 'Valor', value: fmtBRL(order.valor), inline: true });
  if (order?.nick || order?.nome) fields.push({ name: 'Quem', value: order.nick || order.nome, inline: true });
  if (order?.descricao) fields.push({ name: 'Detalhes', value: order.descricao });
  if (order?.mensagem) fields.push({ name: 'Mensagem', value: order.mensagem });
  if (trelloCard?.url) fields.push({ name: 'Cartão no Trello', value: trelloCard.url });
  fields.push({ name: 'Referência LivePix', value: `\`${ref}\``, inline: true });

  if (env?.MOCK_EXTERNAL === '1') return true;

  const res = await fetch(env.DISCORD_WEBHOOK_PEDIDOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title,
        color: isPedido ? 0xff68b4 : 0x9146ff,
        fields,
        timestamp: new Date().toISOString(),
      }],
    }),
  });
  return res.ok;
}

/* ---------- Roteador principal ---------- */
export async function handleRequest(request, env = {}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const siteUrl = (env.SITE_URL || 'https://cinebruh.github.io').replace(/\/+$/, '');

  if (request.method === 'GET' && path === '/health') {
    return json({
      ok: true,
      service: 'cinebruh-api',
      livepix: isLivePixReady(env),
      kv: Boolean(env?.PEDIDOS_KV),
      discord: Boolean(env?.DISCORD_WEBHOOK_PEDIDOS),
      trello: Boolean(env?.TRELLO_KEY && env?.TRELLO_TOKEN && env?.TRELLO_LIST_PEDIDOS),
      githubSync: Boolean(env?.GITHUB_TOKEN),
      mock: env?.MOCK_LIVEPIX === '1',
    }, 200, request, env);
  }

  if (request.method === 'POST' && path === '/api/pedido') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400, request, env); }
    const calc = calcularPedido(body);
    if (calc.error) return json({ error: calc.error }, 400, request, env);
    if (!isLivePixReady(env)) {
      return json({ error: 'Integração com a LivePix ainda não foi ativada.' }, 503, request, env);
    }
    try {
      const pay = await createLivePixPayment(env, {
        amountCents: calc.amountCents,
        redirectUrl: `${siteUrl}/#/patrocinar`,
      });
      await kvSaveOrder(env, pay.reference, {
        kind: 'pedido',
        titulo: calc.titulo,
        tipo: calc.tipo,
        dur: calc.dur,
        s: calc.s,
        de: calc.de,
        ate: calc.ate,
        nick: calc.nick,
        valor: calc.valor,
        descricao: calc.descricao,
      });
      return json({
        ok: true,
        valor: calc.valor,
        descricao: calc.descricao,
        reference: pay.reference,
        redirectUrl: pay.redirectUrl,
        mock: pay.mock,
      }, 201, request, env);
    } catch {
      return json({ error: 'Não consegui gerar o pagamento na LivePix agora.' }, 502, request, env);
    }
  }

  if (request.method === 'POST' && path === '/api/donate') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400, request, env); }
    const don = validarDonate(body);
    if (don.error) return json({ error: don.error }, 400, request, env);
    if (!isLivePixReady(env)) {
      return json({ error: 'Integração com a LivePix ainda não foi ativada.' }, 503, request, env);
    }
    try {
      const pay = await createLivePixPayment(env, {
        amountCents: don.amountCents,
        redirectUrl: `${siteUrl}/#/apoiar`,
      });
      await kvSaveOrder(env, pay.reference, {
        kind: 'donate',
        nome: don.nome,
        mensagem: don.mensagem,
        valor: don.valor,
      });
      return json({
        ok: true,
        valor: don.valor,
        nome: don.nome,
        mensagem: don.mensagem,
        reference: pay.reference,
        redirectUrl: pay.redirectUrl,
        mock: pay.mock,
      }, 201, request, env);
    } catch {
      return json({ error: 'Não consegui gerar o pagamento na LivePix agora.' }, 502, request, env);
    }
  }

  if (request.method === 'POST' && path === '/api/webhook/livepix') {
    if (env?.LIVEPIX_WEBHOOK_SECRET) {
      const got = request.headers.get('X-LivePix-Secret') || url.searchParams.get('secret') || '';
      if (got !== env.LIVEPIX_WEBHOOK_SECRET) {
        return json({ error: 'Unauthorized' }, 401, request, env);
      }
    }
    let payload = {};
    try { payload = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400, request, env); }

    const res = payload?.resource || payload?.data || payload || {};
    const ref = String(res.reference || res.id || payload.reference || '').trim();
    if (!ref) return json({ ok: true, ignored: true }, 200, request, env);

    if (await isDuplicate(env, ref)) {
      return json({ ok: true, duplicate: true, reference: ref }, 200, request, env);
    }

    const order = await kvGetOrder(env, ref);
    let trelloCard = null;
    let discordSent = false;
    try { trelloCard = await createTrelloOrderCard(env, order, ref); } catch {}
    try { discordSent = await notifyDiscordPayment(env, order, ref, trelloCard); } catch {}

    await markProcessed(env, ref);
    return json({
      ok: true,
      processed: true,
      reference: ref,
      foundOrder: Boolean(order),
      trello: Boolean(trelloCard),
      discord: discordSent,
    }, 200, request, env);
  }

  return json({ error: 'Rota não encontrada.' }, 404, request, env);
}

/* ---------- Cron Trigger: dispara o workflow sync-catalog.yml no GitHub ---------- */
export async function triggerCatalogSync(env = {}) {
  if (!env?.GITHUB_TOKEN) return { ok: false, skipped: true };
  const repo = env.GITHUB_REPO || 'CineBruh/cinebruh.github.io';
  const workflow = env.GITHUB_WORKFLOW || 'sync-catalog.yml';
  if (env?.MOCK_EXTERNAL === '1') {
    return { ok: true, mock: true, repo, workflow };
  }
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cinebruh-api-worker',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && env?.DISCORD_WEBHOOK_PEDIDOS) {
      await fetch(env.DISCORD_WEBHOOK_PEDIDOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🔑 GITHUB_TOKEN do Worker expirou ou perdeu permissão',
            description: `O Cron Trigger recebeu HTTP ${res.status} ao tentar disparar \`${workflow}\`. Gere um token novo e rode \`npx wrangler secret put GITHUB_TOKEN\`.`,
            color: 0xe63946,
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }
    throw new Error(`GitHub dispatch HTTP ${res.status}`);
  }
  return { ok: true, status: res.status };
}

export async function handleScheduled(event, env = {}, ctx) {
  const job = triggerCatalogSync(env).catch(() => ({ ok: false }));
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(job);
  return job;
}

export default { fetch: handleRequest, scheduled: handleScheduled };
