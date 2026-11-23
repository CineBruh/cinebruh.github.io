# Cronômetro da Subathon (Somente Leitura) — StreamElements

Versão segura para embutir na aba `#/subathon` do Cinebruh:
- **Lê** a chave `brunaSubathonTimer` do `SE_API.store` (gravada pela overlay original da live).
- **Ouve** `kvstore:update` (+ checagem a cada 15s) para refletir adições de tempo, pausa e retomada em tempo real.
- **Nunca grava** nada no `SE_API.store` e nunca soma subs/bits/donates.

## Como usar
1. No StreamElements, crie uma **nova overlay vazia** (ex.: `Site - Cronômetro Subathon (Leitura)`).
2. Adicione um **Custom Widget** e cole os arquivos `html.txt`, `css.txt`, `js.txt` e `fields.txt` desta pasta.
3. Copie a URL da overlay criada e cole em `site.json` → `subathon.overlayTimer`.
