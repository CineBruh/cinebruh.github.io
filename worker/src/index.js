/**
 * Cinebruh API · Cloudflare Worker (Etapa 2A: LivePix)
 *
 * Rotas:
 *   GET  /health               -> status do Worker e se a LivePix está configurada
 *   POST /api/pedido           -> recalcula o pedido no servidor e cria pagamento na LivePix
 *   POST /api/donate           -> valida valor/mensagem e cria pagamento na LivePix
 *   POST /api/webhook/livepix  -> receptor de webhooks (base pronta para a Etapa 2B)
 *
 * Segredos (definidos no painel da Cloudflare ou via `wrangler secret put`):
 *   LIVEPIX_CLIENT_ID
 *   LIVEPIX_CLIENT_SECRET
 *   LIVEPIX_WEBHOOK_SECRET     (opcional na 2A; usado na 2B)
 */

const LIVEPIX_OAUTH_URL = 'https://oauth.livepix.gg/oauth2/token';
const LIVEPIX_PAYMENTS_URL = 'https://api.livepix.gg/v2/payments';

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
  if (!res.ok) {
    throw new Error(`LivePix OAuth HTTP ${res.status}`);
  }
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
  if (!res.ok) {
    throw new Error(`LivePix Payment HTTP ${res.status}`);
  }
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
      return json({
        ok: true,
        valor: calc.valor,
        descricao: calc.descricao,
        reference: pay.reference,
        redirectUrl: pay.redirectUrl,
        mock: pay.mock,
      }, 201, request, env);
    } catch (err) {
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
      return json({
        ok: true,
        valor: don.valor,
        nome: don.nome,
        mensagem: don.mensagem,
        reference: pay.reference,
        redirectUrl: pay.redirectUrl,
        mock: pay.mock,
      }, 201, request, env);
    } catch (err) {
      return json({ error: 'Não consegui gerar o pagamento na LivePix agora.' }, 502, request, env);
    }
  }

  if (request.method === 'POST' && path === '/api/webhook/livepix') {
    // Base preparada para a Etapa 2B (confirmação -> aviso no Discord / cartão no Trello).
    if (env?.LIVEPIX_WEBHOOK_SECRET) {
      const got = request.headers.get('X-LivePix-Secret') || '';
      if (got !== env.LIVEPIX_WEBHOOK_SECRET) {
        return json({ error: 'Unauthorized' }, 401, request, env);
      }
    }
    return json({ ok: true, received: true }, 200, request, env);
  }

  return json({ error: 'Rota não encontrada.' }, 404, request, env);
}

export default { fetch: handleRequest };
