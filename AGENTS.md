# Instruções para o agente — Cinebruh

Site: https://cinebruh.github.io (GitHub Pages, repo CineBruh/cinebruh.github.io, branch main = produção).
Catálogo de reacts da Bruna "Bruh" Rodrigues. Responda em português do Brasil.

## Antes de mexer
- Leia `README.md` (arquitetura, Trello/Drive, arquivos) e `DESIGN.md` (regras de layout). Siga o DESIGN.md em qualquer mudança de CSS.
- Contexto, decisões e pedidos (privados, fora do Git): `.agent/CONTEXTO.md`, `.agent/PEDIDOS-BRUNA.md`, `.agent/ROADMAP.md`. Leia o CONTEXTO antes de qualquer tarefa.
- Rode `git pull` antes de começar: um robô faz commit toda hora (aos :17).

## Nunca
- Editar à mão `data.json`, `cronograma.json`, `covers-cache.json`, `sync-avisos.json` (o robô reescreve).
- Colocar chaves, tokens ou webhooks em qualquer arquivo — o repositório é PÚBLICO. Elas ficam só nos Secrets do GitHub.
- Fazer `git push` sem eu aprovar. Nunca `git push --force`.

## Ao mudar CSS/JS
- Troque a `VERSAO` no começo do `sw.js` (senão os visitantes continuam com a versão antiga em cache).
- Respeite a ordem de carregamento dos JS descrita no README.

## Testar antes de dizer que terminou
1. `C:\Python314\python.exe -m http.server 8080` na raiz e abra http://localhost:8080.
2. Navegue pelas abas afetadas e por um player (`/#/catalogo/<obra>`), em desktop e em largura de celular (390 px).
3. Confira o console do navegador: zero erros novos.
4. Me mostre prints do antes/depois e um resumo do que mudou. Commits pequenos, mensagem em português.

## Dúvidas
- Mudança grande de layout ou de comportamento: proponha o plano e espere eu aprovar antes de editar.