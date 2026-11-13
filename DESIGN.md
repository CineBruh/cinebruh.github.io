# Cinebruh · Design

Regras de layout do site. Os valores ficam em `css/base.css` (bloco **Escalas**); os outros CSS usam só os tokens.
Antes de mexer no visual, leia aqui. Na dúvida, siga o que os componentes parecidos já fazem.

## Identidade (não mudar)

- **Bordas grossas** de 3px na cor `--border` (2px em itens pequenos dentro de cards).
- **Sombras duras**, sem desfoque: `--shadow` (6px) em destaques e `--shadow-sm` (3px) no resto.
- **Hover** desloca o elemento pra cima e pra esquerda (`translate(-2px,-2px)`) e aumenta a sombra.
- **Inclinações** leves em selos (logo, kicker) e o **rosa** `#ff68b4` como cor de ação.
- Fontes: `--display` (Bahnschrift) pra títulos, botões e números; `--body` (Segoe UI) pra texto corrido.

## Espaço: escala de 8

| Token | Valor | Uso |
|---|---|---|
| `--s1` | 4px | ajuste fino: título ↔ legenda, selos |
| `--s2` | 8px | dentro de um grupo: ícone ↔ texto, entre pílulas |
| `--s3` | 12px | meio passo, com moderação: listas compactas |
| `--s4` | 16px | padding de card, espaço entre cards |
| `--s5` | 24px | entre blocos, padding de painel de destaque |
| `--s6` | 32px | entre seções no celular, topo de abas |
| `--s7` | 48px | entre seções no computador |
| `--s8` | 64px | áreas vazias grandes |

**Tokens por função**, que mudam sozinhos no celular:

| Token | Computador | Celular | Uso |
|---|---|---|---|
| `--pad-page` | 24px | 16px | lateral de todas as abas |
| `--sec` | 48px | 32px | entre seções |
| `--gap-grid` | 16px | 12px | entre cards de uma grade |
| `--pad-card` | 16px | 16px | padding de card comum |
| `--gap-in` / `--gap-group` | 8 / 24px | 8 / 24px | dentro de um grupo / entre grupos |

**Proximidade:** o que é relacionado fica mais perto. Dentro de um grupo < entre grupos < entre seções.
Exemplo: título → subtítulo 8px, subtítulo → conteúdo 24px, uma seção → a próxima 48px.

**Cards:** use 16px nos comuns e 24px nos painéis de destaque (Pix, calculadora, "hoje" do cronograma). No celular, os painéis caem pra 16px.

## Alturas de controle

| Token | Valor | Uso |
|---|---|---|
| `--h-ctl` | 40px | pílulas, botões de live/redes, tema, campos de texto, CTA dentro de caixas |
| `--h-ctl-lg` | 48px | CTA principal, voltar ao topo, botões da folha "Mais" |
| — | 36px | botões do player e episódios; chips da barra de filtros no celular |
| — | 44px | mínimo em tela de toque (`@media (hover:none)`) |

Botões lado a lado precisam ter a mesma altura. Use `min-height` + `padding:0 X` + `align-items:center`; não use padding vertical pra definir altura.

## Cantos

| Token | Valor | Uso |
|---|---|---|
| `--r-sm` | 8px | ícones pequenos, botões do player, chips |
| `--r-md` | 12px | botões, campos, caixas internas |
| `--r-lg` | 16px | cards, painéis, janelas |
| `--r-pill` | 999px | pílulas e botões arredondados |

Elementos dentro de um card usam um canto menor que o card.

## Fonte

| Token | Valor | Uso |
|---|---|---|
| `--fs-xs` | 12px | legendas, contadores, rótulos em caixa alta |
| `--fs-sm` | 14px | botões, texto secundário |
| `--fs-md` | 16px | texto principal, **todos os campos de digitação** |
| `--fs-lg` / `--fs-xl` / `--fs-2xl` | 18 / 20 / 24px | títulos de card, números |

- Títulos de seção e de página usam `clamp()` pra crescer com a tela.
- **Campos de texto sempre com 16px ou mais.** Com menos, o iPhone dá zoom na página quando a pessoa toca no campo.

## Exceções aceitas (fora da escala de propósito)

- **Selos dentro de capas** (9–11px, cantos de 6px): são miniaturas e ficam no tamanho da capa.
- **Início:** foto de 118px, os 6px entre nome e @ e a conta do banner (`calc(-39px - …)`).
  Elas decidem onde a borda do banner passa. Se mudar uma, mude as outras juntas.
- **Janela de detalhes da obra:** os valores `-90px` / `96px` do pôster sobre o banner formam uma conta casada.
- **Offline com celular deitado:** espaços menores porque a tela é baixa.
- Card de preço em destaque (levantado) e o selo "mais pedido" acima dele.

Ao abrir uma exceção nova, deixe um comentário no CSS dizendo por quê.

## Checklist antes de subir

1. Usei tokens (`var(--s4)`, `var(--r-lg)`…) em vez de números soltos?
2. Botões na mesma linha têm a mesma altura?
3. Os espaços seguem a proximidade (grupo < bloco < seção)?
4. Testei no computador, no celular em pé e nos dois temas?
5. Campos de texto estão com 16px?
6. Troquei a `VERSAO` no `sw.js`? Sem isso o app instalado continua com o CSS antigo.

**Testar no celular:**
- Rode `npx serve` e abra o endereço "On Your Network" no mesmo Wi-Fi.
- Para testar a parte de app (instalar e atualizar), conecte por cabo e use `chrome://inspect` → Port forwarding `3000` → `localhost:3000`.