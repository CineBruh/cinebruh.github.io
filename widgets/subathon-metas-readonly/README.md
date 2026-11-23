# Overlay de Metas (Somente Leitura) — StreamElements

Versão segura para embutir na aba `#/subathon` do Cinebruh:
- **Lê** a chave `brunaSubathonGoals` do `SE_API.store` (a mesma gravada pela overlay original da live).
- **Ouve** `kvstore:update` (+ checagem a cada 15s) para atualizar ao vivo para todo mundo no site.
- **Nunca grava** nada no `SE_API.store`, nunca soma donates e nunca manda horas pro cronômetro.

## Como usar
1. No StreamElements, crie uma **nova overlay vazia** (ex.: `Site - Metas Subathon (Leitura)`).
2. Adicione um **Custom Widget** e cole os arquivos `html.txt`, `css.txt`, `js.txt` e `fields.txt` desta pasta.
3. Mantenha os mesmos valores/nomes das metas da overlay principal da live.
4. Copie a URL da overlay criada e cole em `site.json` → `subathon.overlayMetas`.
