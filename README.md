# 🎬 Cinebruh

Catálogo de animes, filmes, séries, tokusatsu, animações e VODs do canal da Bruna Rodrigues.

O site se atualiza sozinho. Um robô lê o **quadro do Trello** e a **pasta do Google Drive** e gera o catálogo e o cronograma. **Para adicionar ou atualizar uma obra, basta mexer no Trello e no Drive.** Não é necessário editar nada aqui.

## Como funciona

1. A Bruna organiza o quadro [REACTS - CINEBRUH](https://trello.com/b/b3LlCpc8/reacts-cinebruh) e sobe os vídeos no Drive.
2. A cada **hora** (aos :17), o robô lê os dois e atualiza o `data.json` e o `cronograma.json`.
3. O site é atualizado logo depois, com capas puxadas automaticamente do TMDB.
4. Se algo mudou, o robô **avisa no Discord** (ver abaixo).

**Também pode atualizar manualmente** dando **Run workflow** no **Actions** de **Sincronizar catálogo (Trello + Drive → data.json)**.

### Quem manda em quê

| Informação | Vem de |
| --- | --- |
| Status (fila, em aberto, fixo, finalizado), categoria, áudio, nota | **Trello** (lista e etiquetas do cartão) |
| Patrocinadores, episódios pagos, episódios assistidos | **Trello** (checklists e descrição) |
| Cronograma, fila de patrocinados, próxima sessão do Off Live | **Trello** (lista `CRONOGRAMA`) |
| Review, dia fixo, capa certa (`TMDB:`), nome da pasta (`Drive:`) | **Trello** (linhas da descrição) |
| Vídeos: temporadas, episódios, duração, link pra assistir | **Drive** |

- Cartão sem pasta no Drive aparece no site como "Na fila" (ou "React em breve", se já tiver episódios pagos).
- Pasta no Drive sem cartão no Trello continua funcionando só pelas regras do Drive, abaixo.
- **"Ver reações" só aparece quando existe vídeo com react gravado.** Pasta vazia ou só com o original "(SEM REAÇÃO)" não conta.

## Como é organizado o Trello

O passo a passo de onde marcar cada coisa está no **[GUIA-TRELLO.md](GUIA-TRELLO.md)**. O resumo:

- **Status** = a lista do cartão, pela primeira palavra do nome: `FILA`, `EM ABERTO`, `FIXOS`, `FINALIZADOS`, `CRONOGRAMA` (`INFOS` e outras são ignoradas).
- **Etiquetas:** categoria (`Anime`, `Filme`, `Série`, `Animação`, `Tokusatsu`; **cartão sem categoria é ignorado**), áudio (`Dublado`/`Legendado`), nota (`★ 9`) e avisos (`Off Live`, `Stand-by`, `Próximo`, `Meta Incentive`, `Escolha do Chat`).
- **Checklist por temporada:** `Temporada 2`, ou o nome da parte (`OVAs`, `Saga East Blue`). Um item por episódio: `Episódio 7 (Nick)`.
  - Nick no nome da checklist (`Temporada 2 (Nick)`) vale pra temporada inteira. Nick no item tem prioridade.
  - `(Chat)` = escolha do chat. `()` vazio = sem patrocinador.
  - Item **marcado** = já assistido. Episódios especiais podem ter decimal: `Episódio 5.5`.
- **Descrição:** linhas `Patrocinado por:`, `Review:`, `Dia:`, `TMDB:`, `Drive:`, `Obs:` e, no cronograma, `Classificação:` e `Aviso:`.
- **Cronograma:** um cartão por dia na lista `CRONOGRAMA`, com a data no título (`Seg 02/11 · 21h`) e a checklist `Programação` (`Mob Psycho 100 · T2 Ep 7`). O nick do patrocinador vem sozinho do cartão da obra. Etiquetas `Folga`, `Adiado`, `Cancelado` e `Off Live` (sessão offline).

O que o site faz com isso:
- Episódio sem nick numa obra com nicks por episódio **não** herda o patrocinador da obra (ex.: Frieren T1 = escolha do chat, T2 = paga).
- O "Peça esse react" sugere o próximo episódio **depois do último já pago**, mesmo que ainda não tenha vídeo (ex.: Beck pago até o 10 e a Bruh no 3 → sugere o 11).
- Obra com todos os episódios pagos (ou `Patrocinado por:` na descrição) sai da lista de patrocínio.

## Como é organizado o Drive

### 1. Categoria: a pasta principal

Cada obra fica dentro de uma destas pastas, na raiz do Drive:

`Animes` · `Filmes` · `Séries` · `Tokusatsu` · `Animações` · `VOD's do Canal`

O robô ignora pastas com outros nomes (e avisa no log).

### 2. Nome da obra

```
[símbolo] Título [DUB ou LEG] nota
```

Exemplo: `✅ Orange [DUB] 10`

- **Título**: tudo o que vem antes de `[DUB]` ou `[LEG]` é o nome da obra. **Precisa bater com o título do cartão no Trello** (maiúscula, acento e pontuação não importam). Se for diferente, use a linha `Drive:` no cartão.
- **Idioma**: `[DUB]` (dublado) ou `[LEG]` (legendado).
- **Nota**: o número logo depois do idioma (opcional, até 2 dígitos).

> ⚠️ **A nota depende da tag de idioma.** O robô só lê a nota quando ela vem logo após `[DUB]`/`[LEG]`. Sem a tag, o número vira parte do título (ex.: `Orange 10`). Quando a obra tem cartão no Trello, a nota e o idioma das etiquetas têm prioridade.

### 3. Status: o símbolo no começo do nome

> Só vale para obras **sem cartão no Trello**. Com cartão, o status vem da lista.

| Símbolo | Significado |
| --- | --- |
| `✅` | Completo |
| `$` | Aceita patrocínio |
| `⌧` | Off Live (gravado offline, fora da live) |
| `⚠` | Incompleto |
| *(nenhum)* + pasta com vídeos | Assistindo. Em **Filmes** e **VODs**, conta como completo |
| *(nenhum)* + pasta vazia | Na fila |

### 4. Temporadas

Subpastas dentro da obra: `Temporada 1`, `Temporada 2` etc. Subpastas sem número (`OVAs`, `Especiais`) aparecem com o próprio nome. Com cartão no Trello, a cor de cada temporada (🟢 completa, 🟡 em andamento, 🔴 não começou) vem da checklist dela.

### 5. Episódios

Os vídeos ficam com **`Ep` seguido do número** em qualquer parte do nome do arquivo:

- `Chainsaw Man Ep1.mp4`, `Ep 2`, `ep.3`… e especiais com decimal: `Ep 5.5`. **Não** vale `Episódio 1`.
- `Ep 0`, `Especial` e `OVA` aparecem como extras da temporada.
- `(SEM REAÇÃO)` quando é apenas o episódio puro, sem a reação.

### 6. Pastas de agrupamento

Para agrupar várias obras (ex.: `Naruto`, `Studio Ghibli`), é feita uma pasta **sem** `[DUB]/[LEG]` com as mesmas dentro, cada uma com sua tag de idioma. No site aparecem separadas.

### 7. VODs do Canal

Os **arquivos de vídeo ficam direto na pasta** `VOD's do Canal`. O nome do arquivo vira o título (o "VOD " no começo é removido).

---

## Avisos no Discord

Depois de cada sincronização que muda algo, o `scripts/notify-discord.mjs` compara o catálogo antigo com o novo:

- **Canal de novidades** (`DISCORD_WEBHOOK_NOVIDADES`): obras e temporadas concluídas, reacts novos (agrupados: "eps 7 a 10", extras pelo nome), filmes no ar, obras novas no catálogo e na fila, e VODs novos. Se a temporada foi concluída no Trello mas os vídeos ainda não subiram, o aviso diz "N eps em breve no Drive".
- **Canal de alertas** (`DISCORD_WEBHOOK_ALERTAS`, privado): obras que ficaram sem capa, obras que sumiram do catálogo (cartão ou pasta renomeada/apagada), avisos novos do robô (cartão sem pasta, pasta sem cartão, cartão sem categoria, duplicados…) e **falha na sincronização** (com link pro log).
- **Anti-spam:** se mais de 15 obras "aparecerem" ou "sumirem" de uma vez (primeiro upload ou mudança de formato), não manda novidade pública, só um alerta privado.

> Para testar sem mandar aviso: rode o workflow com tudo igual. Sem mudança no `data.json`, nada é enviado.

---

## Ajustes finos: `editorial.json`

Opcional e editado à mão, pra quando algo sair errado no site. **Com o Trello, prefira as linhas `TMDB:` e `Drive:` no cartão.**

| Campo | Para que serve | Exemplo |
| --- | --- | --- |
| `alias` | Mostrar no site um título diferente do nome da pasta | `"Cautious Hero (O Herói Cauteloso)": "Cautious Hero"` |
| `tmdb` | Corrigir uma capa errada, indicando a obra certa no TMDB | `"One Piece": "tv/37854"` |
| `img` | Usar uma imagem própria (salva em `images/`) no lugar da capa do TMDB | `"Gameoverse": "animacao-gameoverse.webp"` |
| `emoji` | Emoji reserva, mostrado quando a obra não tem capa | `"Orange": "🍊"` |
| `aka` | Outros nomes que a busca deve achar (além do original e do inglês, que vêm do TMDB) | `"Frieren": ["Furiren"]` |

**A capa saiu errada?** Procure a obra em [themoviedb.org](https://www.themoviedb.org). O endereço termina em algo como `/tv/12345` ou `/movie/12345`. Coloque `TMDB: tv/12345` na descrição do cartão.

> **Qual nome usar como chave?** No `alias`, a chave é o **nome da pasta** no Drive. Em `tmdb`, `img` e `emoji`, é o **título exibido no site** (já depois do `alias`).

---

## ⚠️ Não deve ser editado à mão

O robô reescreve estes arquivos a cada sincronização:

- `data.json`: o catálogo.
- `cronograma.json`: a aba Cronograma, a fila de patrocinados e a próxima sessão do Off Live.
- `covers-cache.json`: capas e dados do TMDB já encontrados, pras execuções ficarem rápidas.
- `sync-avisos.json`: os alertas da última rodada (o Discord compara com a anterior pra não repetir).

A ordem das obras segue a ordem do quadro do Trello.

**O que o robô grava no `data.json`, além do básico:** data de criação (`add`) e do vídeo mais novo (`upd`), duração de cada vídeo (`d`), ano e outros nomes pelo TMDB (`ano`, `aka`), patrocinadores da obra (`pat`) e de cada episódio (`por`), escolha do chat (`chat`), obra já paga (`pago`), **até qual episódio a temporada já está paga** (`pg`) e **quantos episódios assistidos ainda não estão no Drive** (`fd`).

> **Precisa reenviar um aviso do Discord?** Suba o `data.json` antigo (do histórico do GitHub) e rode o workflow: o robô vê a diferença de novo e manda o aviso.

---

## Para quem mantém o projeto

**Arquivos**
- `index.html`: a "moldura" do site (menu, abas, vinheta de entrada e o conteúdo fixo de cada aba)
- `css/`: estilos, um arquivo por área (`base`, `layout`, `catalogo`, `patrocinar`, `paginas`, `intro`)
- `js/`: código, um arquivo por área. Ordem de carregamento: `core` (navegação e tema) → `player` → `catalogo` → `patrocinar` → `inicio` → `setup` → `midiakit` → `apoiar` → `comunidade` → `cronograma` → `offline` → `tierlist` → `continuar` → `pwa` → `intro` → `app` (carrega os dados e abre a aba do endereço)
- `manifest.webmanifest` e `sw.js`: deixam o site instalável como app. **Num update de CSS/JS, troque a `VERSAO` no começo do `sw.js`** pra todo mundo receber a versão nova de uma vez (os `.json` sempre vêm da internet).
- `site.json`: informações do canal, editáveis à mão: textos, redes, links, preços em bits, doações, comandos, setup, banner da Início, canal do player do Off Live e todo o **mídia kit** (números das redes, público, marcas).
- `midiakit/`, `midiakit/en/`, `tierlist/`, `cronograma/`, `offline/`, `patrocinar/`, `comunidade/`: páginas curtinhas que só redirecionam pra aba. Servem pra cada link ter a própria prévia no Discord/WhatsApp/X.
- `images/`: `og.png` (prévia do link), `icon-*.png` e `apple-touch-icon.png` (ícones do app), `banner.png` (banner da Início) e `marcas/*.jpg` (logos do mídia kit).
- `DESIGN.md`: regras de layout (espaços, alturas, cantos, fontes) e exceções. Leia antes de mexer no CSS.
- `scripts/sync-drive.mjs`: o robô (Node 20+, sem dependências). Lê o Drive e junta com o Trello.
- `scripts/trello.mjs`: leitura do quadro do Trello e montagem do cronograma.
- `scripts/notify-discord.mjs`: avisos no Discord.
- `.github/workflows/sync-catalog.yml`: roda o robô a cada hora, commita o que mudou e avisa no Discord. **Fica numa pasta oculta no Windows** (ative "Itens ocultos" no Explorer) e o upload arrastando pasta no GitHub costuma ignorá-la: confira se subiu.

**Endereços**: cada aba tem o seu (`/#/catalogo`, `/#/patrocinar`, `/#/midiakit/en`…), e cada obra também: `/#/catalogo/frieren` abre o player, `/#/catalogo/frieren/2` abre na 2ª temporada e `/#/catalogo/frieren/2/5` abre direto no ep 5. O botão **Compartilhar** do player copia esse link.

**Chaves do TMDB**
- A do **robô** fica só no secret `TMDB_API_KEY`. Nunca no código.
- O **site** usa uma chave pública própria (em `js/patrocinar.js`), só pra busca do "Monte seu pedido".

**Secrets do repositório** (Settings → Secrets and variables → Actions)
- `GDRIVE_API_KEY` (obrigatória): chave da API do Google Drive. A pasta do Drive precisa estar **pública** (leitura).
- `TMDB_API_KEY` (opcional): ativa as capas automáticas.
- `DISCORD_WEBHOOK_NOVIDADES` e `DISCORD_WEBHOOK_ALERTAS` (opcionais): sem eles, o robô só não avisa.
- O quadro do Trello é **público** e não precisa de chave. Se um dia ficar privado, crie `TRELLO_KEY` e `TRELLO_TOKEN` e passe os dois no passo "Ler o Trello e o Drive" do workflow.

> Em prints, esconda os webhooks e as chaves: quem tiver o link do webhook consegue postar no Discord como o robô.

**Rodar localmente (PowerShell)**
```powershell
$env:GDRIVE_API_KEY = "sua-chave"; $env:TMDB_API_KEY = "sua-chave-tmdb"; npm run sync
```

Para usar outra pasta raiz do Drive, defina `CINEBRUH_ROOT_ID`. Para outro quadro do Trello, `TRELLO_BOARD`.
