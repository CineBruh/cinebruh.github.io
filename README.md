# 🎬 Cinebruh

Catálogo de animes, filmes, séries, tokusatsu, animações e VODs do canal da Bruna Rodrigues.

O site se atualiza sozinho. Um robô lê a pasta do Google Drive, entende os nomes das pastas e gera o catálogo. **Para adicionar ou atualizar uma obra, basta mexer no Drive.** Não é necessário editar nada aqui.

## Como funciona

1. Basta organizar as pastas no Google Drive seguindo as regras abaixo.
2. A cada **hora**, o robô lê o Drive e atualiza o `data.json`.
3. O site é atualizado logo depois, com capas puxadas automaticamente do TMDB.

**Também pode atualizar manualmente** dando **Run workflow** no **Actions** de **Sincronizar catálogo (Drive → data.json)**.

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

- **Título**: tudo o que vem antes de `[DUB]` ou `[LEG]` é o nome da obra.
- **Idioma**: `[DUB]` (dublado) ou `[LEG]` (legendado).
- **Nota**: o número logo depois do idioma (opcional, até 2 dígitos).

> ⚠️ **A nota depende da tag de idioma.** O robô só lê a nota quando ela vem logo após `[DUB]`/`[LEG]`. Sem a tag, não há nota — e o número acaba virando parte do título (ex.: `Orange 10`, sem tag, exibe o título como "Orange 10"). Para ter nota, precisa sempre do `[DUB]` ou `[LEG]` antes dela.

### 3. Status: o símbolo no começo do nome

O símbolo precisa ser o **primeiro caractere** do nome da pasta.

| Símbolo | Significado |
| --- | --- |
| `✅` | Completo |
| `$` | Aceita patrocínio (no site aparece "💰 Patrocine") |
| `⌧` | Off Live (conteúdo que será gravado offline, fora da live) |
| `⚠` | Incompleto (aparece como "assistindo", com aviso de incompleto) |
| *(nenhum)* + pasta com vídeos | Assistindo. Em **Filmes** e **VODs**, conta como completo |
| *(nenhum)* + pasta vazia | Na fila |

### 4. Temporadas

São subpastas dentro da obra, como `Temporada 1`, `Temporada 2` etc.

- `Temporada 1 (✅)`: temporada completa (🟢 verde)
- Temporada com vídeos, sem ✅: em andamento (🟡 amarelo)
- Temporada vazia: ainda não começou (🔴 vermelho)

Subpastas sem número (por exemplo, `OVAs`) aparecem com o próprio nome.

### 5. Episódios

Os vídeos ficam com **`Ep` seguido do número**, colados, em qualquer parte do nome do arquivo:

- `Chainsaw Man Ep1.mp4`, `Chainsaw Man Ep2.mp4`…
- Também vale `Ep 1`, `ep.1` etc. **Não** vale `Episódio 1` (o número precisa vir logo após o "Ep").
- `(SEM REAÇÃO)` quando é apenas o episódio puro, sem a reação.

### 6. Pastas de agrupamento

Para agrupar várias obras (ex.: `Naruto`, `Studio Ghibli`), é feita uma pasta **sem** `[DUB]/[LEG]` com as mesmas dentro, cada uma com sua tag de idioma. No site aparecem separadas.

### 7. VODs do Canal

Os **arquivos de vídeo ficam direto na pasta** `VOD's do Canal`. O nome do arquivo vira o título (o "VOD " no começo é removido).

---

## Ajustes finos: `editorial.json`

Este arquivo é opcional e editado à mão. Pra quando algo sair errado no site:

| Campo | Para que serve | Exemplo |
| --- | --- | --- |
| `alias` | Mostrar no site um título diferente do nome da pasta | `"Cautious Hero (O Herói Cauteloso)": "Cautious Hero"` |
| `tmdb` | Corrigir uma capa errada, indicando a obra certa no TMDB | `"One Piece": "tv/37854"` |
| `img` | Usar uma imagem própria (salva em `images/`) no lugar da capa do TMDB | `"Gameoverse": "animacao-gameoverse.webp"` |
| `emoji` | Emoji reserva, mostrado quando a obra não tem capa | `"Orange": "🍊"` |
| `aka` | Outros nomes que a busca do site também deve achar (além do nome original e do inglês, que vêm do TMDB) | `"Frieren": ["Furiren"]` |

**A capa saiu errada?** Basta procurar a obra em [themoviedb.org](https://www.themoviedb.org). O endereço da página termina em algo como `/tv/12345` ou `/movie/12345`. Basta adicionar o valor em `tmdb`.

**Uma obra ficou sem capa?** O log da execução em **Actions** listará todas as obras sem capa no final.

> **Qual nome usar como chave?** No `alias`, a chave é o **nome da pasta** no Drive (é ela que aponta pro nome de exibição). Em `tmdb`, `img` e `emoji`, a chave é o **título exibido no site**, ou seja, já depois do `alias`.

---

## ⚠️ Não deve ser editado à mão

- `data.json`: o robô reescreve este arquivo a cada sincronização.
- `covers-cache.json`: guarda as capas já encontradas, para as execuções ficarem rápidas.

A ordem das obras no site é preservada. Obras novas entram no fim da categoria.

Além do que vem dos nomes das pastas, o robô também guarda no `data.json`: a data em que a pasta foi criada (`add`), a do vídeo mais novo (`upd`), a duração de cada vídeo (`d`, em segundos) e, pelo TMDB, o ano (`ano`) e os outros nomes da obra (`aka`). É isso que alimenta a ordenação por novidade/ano, o selo 🆕, o total de horas de react e a busca por nome original ou em inglês. Na primeira execução depois dessa mudança o robô demora um pouco mais, porque completa o `covers-cache.json` com essas informações.

---

## Para quem mantém o projeto

**Arquivos**
- `index.html`: a "moldura" do site (menu, abas e o conteúdo fixo de cada aba)
- `css/`: estilos, um arquivo por área (`base`, `layout`, `catalogo`, `patrocinar`, `paginas`)
- `js/`: código, um arquivo por área. São carregados nesta ordem: `core` (navegação entre abas e tema) → `player` → `catalogo` → `patrocinar` → `inicio` → `setup` → `midiakit` → `apoiar` → `comunidade` → `cronograma` → `offline` → `tierlist` → `continuar` → `pwa` → `app` (carrega os dados e abre a aba do endereço)
- `manifest.webmanifest` e `sw.js`: deixam o site instalável como app. **Num update grande de CSS/JS, troque a `VERSAO` no começo do `sw.js`** pra todo mundo receber a versão nova de uma vez (o catálogo e os outros `.json` sempre vêm da internet, sem precisar disso).
- `midiakit/`, `midiakit/en/`, `tierlist/`, `cronograma/`, `offline/`, `patrocinar/`, `comunidade/`: páginas curtinhas que só redirecionam pra aba. Servem pra cada link ter a própria prévia no Discord/WhatsApp/X (ex.: `cinebruh.github.io/midiakit/`).
- `images/og.png` (prévia do link) e `images/icon-*.png`, `images/apple-touch-icon.png` (ícones do app): gerados pela página `ferramentas/gerar-imagens.html`.
- `cronograma.json`: programação da aba Cronograma. Por enquanto é um exemplo editado à mão; depois vai ser gerado pelo robô a partir do Trello.
- `site.json`: informações do canal (textos, links, preços, doações, setup). Editável à mão.
- `scripts/sync-drive.mjs`: o robô (Node 20+, sem dependências)
- `.github/workflows/sync-catalog.yml`: roda o robô a cada hora e faz commit quando algo muda

**Endereços**: cada aba tem o seu (`/#/catalogo`, `/#/patrocinar`…), e cada obra também (`/#/catalogo/frieren` abre o player direto; `/#/catalogo/frieren/2` abre na 2ª temporada).

**Secrets do repositório** (Settings → Secrets and variables → Actions)
- `GDRIVE_API_KEY` (obrigatória): chave da API do Google Drive. A pasta do Drive precisa estar **pública** (leitura).
- `TMDB_API_KEY` (opcional): ativa as capas automáticas.

**Rodar localmente (PowerShell)**
```powershell
$env:GDRIVE_API_KEY = "sua-chave"; $env:TMDB_API_KEY = "sua-chave-tmdb"; npm run sync
```

Para usar outra pasta raiz do Drive, é necessário definir `CINEBRUH_ROOT_ID`.