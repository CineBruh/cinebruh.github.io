# Cinebruh API · Cloudflare Worker (Fase 2 · Etapas 2A + 2B)

Intermediário leve na Cloudflare para guardar as chaves secretas da LivePix, Discord e Trello fora do repositório público.

> **Segurança:** nunca coloque chaves, tokens ou webhooks em `wrangler.toml` ou `src/index.js`. Cadastre tudo como **Secret** na Cloudflare.

## Rotas disponíveis
- `GET /health` — confirma que o Worker está no ar e mostra (como `true`/`false`) quais integrações estão configuradas (`livepix`, `kv`, `discord`, `trello`).
- `POST /api/pedido` — recebe os dados da calculadora de `#/patrocinar`, recalcula o valor no servidor, cria a cobrança na LivePix e salva o resumo do pedido no `PEDIDOS_KV` (se configurado).
- `POST /api/donate` — recebe `{ nome, valor, mensagem }` da aba `#/apoiar`, cria a cobrança na LivePix e salva no `PEDIDOS_KV`.
- `POST /api/webhook/livepix` — recebe a confirmação da LivePix, evita duplicidade (idempotência via `PEDIDOS_KV`), cria um cartão na lista `NOVOS PEDIDOS (CONFERIR)` no Trello (se configurado) e manda um aviso formatado no canal privado do Discord (se configurado).

## Como testar localmente (sem precisar das chaves ainda)
Dentro da pasta `worker/`:

```powershell
npx wrangler dev --var MOCK_LIVEPIX:1 --var MOCK_EXTERNAL:1
```

Isso sobe o Worker em `http://localhost:8787` em modo simulado.

## Como publicar na sua conta Cloudflare
1. Entre na conta:
   ```powershell
   npx wrangler login
   ```
2. *(Opcional — recomendado para a Etapa 2B)* Crie o KV para guardar os pedidos pendentes e evitar duplicidade de webhooks:
   ```powershell
   npx wrangler kv namespace create PEDIDOS_KV
   ```
   Cole o `id` gerado no bloco `[[kv_namespaces]]` do `wrangler.toml`.
3. Publique o Worker:
   ```powershell
   npx wrangler deploy
   ```
   A Cloudflare vai devolver uma URL no formato `https://cinebruh-api.<seu-subdominio>.workers.dev`.
4. Cadastre os segredos que quiser ativar:
   ```powershell
   # Etapa 2A (LivePix)
   npx wrangler secret put LIVEPIX_CLIENT_ID
   npx wrangler secret put LIVEPIX_CLIENT_SECRET

   # Etapa 2B (Webhook + Discord + Trello — todos opcionais)
   npx wrangler secret put LIVEPIX_WEBHOOK_SECRET
   npx wrangler secret put DISCORD_WEBHOOK_PEDIDOS
   npx wrangler secret put TRELLO_KEY
   npx wrangler secret put TRELLO_TOKEN
   npx wrangler secret put TRELLO_LIST_PEDIDOS

   # Cron Trigger de hora em hora (dispara o sync-catalog.yml sem depender do cron do GitHub)
   npx wrangler secret put GITHUB_TOKEN
   ```
   *(Para o `GITHUB_TOKEN`, crie um Fine-grained Personal Access Token no GitHub restrito ao repositório `CineBruh/cinebruh.github.io` com permissão **Actions: Read and write**.)*
5. Ative no `site.json` da raiz do Cinebruh:
   ```json
   "api": {
     "url": "https://cinebruh-api.<seu-subdominio>.workers.dev",
     "livepix": true
   }
   ```
   Enquanto `"livepix": false` (ou `"url": null`), o site continua funcionando exatamente como na Fase 1, abrindo o link direto da LivePix.
