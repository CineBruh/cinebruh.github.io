# Cinebruh API · Cloudflare Worker (Fase 2 · Etapa 2A)

Intermediário leve na Cloudflare para guardar as chaves secretas da LivePix (e futuramente Trello/Discord) fora do repositório público.

> **Segurança:** nunca coloque `LIVEPIX_CLIENT_ID`, `LIVEPIX_CLIENT_SECRET` ou qualquer outra chave em `wrangler.toml` ou `src/index.js`. Cadastre tudo como **Secret** na Cloudflare.

## Rotas disponíveis
- `GET /health` — confirma que o Worker está no ar e se a LivePix está configurada (`{ ok: true, livepix: true|false }`).
- `POST /api/pedido` — recebe os dados da calculadora de `#/patrocinar`, recalcula o valor no servidor e cria a cobrança na LivePix.
- `POST /api/donate` — recebe `{ nome, valor, mensagem }` da aba `#/apoiar` e cria a cobrança na LivePix.
- `POST /api/webhook/livepix` — receptor pronto para a Etapa 2B (notificação no Discord / cartão no Trello após pagamento confirmado).

## Como testar localmente (sem precisar das chaves ainda)
Dentro da pasta `worker/`:

```powershell
npx wrangler dev --var MOCK_LIVEPIX:1
```

Isso sobe o Worker em `http://localhost:8787` em modo simulado.

## Como publicar na sua conta Cloudflare
1. Entre na conta:
   ```powershell
   npx wrangler login
   ```
2. Publique o Worker:
   ```powershell
   npx wrangler deploy
   ```
   A Cloudflare vai devolver uma URL no formato `https://cinebruh-api.<seu-subdominio>.workers.dev`.
3. Quando tiver as credenciais da LivePix da Bruna, cadastre os segredos:
   ```powershell
   npx wrangler secret put LIVEPIX_CLIENT_ID
   npx wrangler secret put LIVEPIX_CLIENT_SECRET
   ```
   *(Opcional para a Etapa 2B: `npx wrangler secret put LIVEPIX_WEBHOOK_SECRET`.)*
4. Ative no `site.json` da raiz do Cinebruh:
   ```json
   "api": {
     "url": "https://cinebruh-api.<seu-subdominio>.workers.dev",
     "livepix": true
   }
   ```
   Enquanto `"livepix": false` (ou `"url": null`), o site continua funcionando exatamente como na Fase 1, abrindo o link direto da LivePix.
