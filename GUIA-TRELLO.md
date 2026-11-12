# 🦩 Guia do Trello · Cinebruh

O site lê o quadro [REACTS - CINEBRUH](https://trello.com/b/b3LlCpc8/reacts-cinebruh) sozinho, de hora em hora. Este guia mostra **onde marcar cada coisa** pra ele entender certinho.

> **A regra de ouro:** cada informação fica em **um lugar só**. O robô cuida do resto.
> E nada precisa mudar de uma vez: o jeito antigo continua funcionando enquanto os cartões vão sendo ajustados.

---

## 1. Onde fica cada coisa

| Informação | Onde marcar | Exemplo |
| --- | --- | --- |
| **Nome da obra** | Título do cartão (só o nome, sem datas ou anotações) | `Haikyu!!` |
| **Status** | A **lista** em que o cartão está | Fila, Em aberto, Fixos, Finalizados |
| **Categoria** | Etiqueta (uma só) | `Anime` |
| **Áudio** | Etiqueta | `Dublado` ou `Legendado` |
| **Nota** | Etiqueta | `★ 9` |
| **Episódios pagos** | Item na checklist | `Episódio 5 (Austeroz)` |
| **Episódios assistidos** | Marcar o item da checklist ✅ | ☑ `Episódio 5 (Austeroz)` |
| **Quem patrocinou** | O nick entre parênteses no item | `(Austeroz)` |
| **Quem patrocinou** (filme ou obra inteira) | Linha `Patrocinado por:` na descrição | `Patrocinado por: Austeroz, God` |
| **Dia fixo na semana** | Linha `Dia:` na descrição | `Dia: quarta` |
| **Ordem da fila** | A posição do cartão na lista (mais pra cima = antes) | |
| **Review** | Linha `Review:` na descrição e/ou link anexado | |
| **Capa certa** | Linha `TMDB:` na descrição | `TMDB: https://www.themoviedb.org/tv/37854` |
| **Nome no Drive** (se for diferente) | Linha `Drive:` na descrição | `Drive: Cautious Hero (O Herói Cauteloso)` |
| **Off Live** | Etiqueta `Off Live` | |

O que **não precisa mais** marcar: etiquetas de patrocinador (amarelas), "EP 5", "10 Eps" e "Temporada 2", e datas, quantidade de episódios ou dia da semana no título.
No Drive, as pastas passam a guardar **só os vídeos**: o status, o áudio e a nota vêm do Trello.

### 🗂️ Drive x Trello
- **A pasta da obra no Drive tem o mesmo nome do cartão** (sem ✅, $, ⌧, [DUB] ou nota). Maiúsculas, acentos e pontuação não importam.
- Nome diferente? Coloque `Drive: nome da pasta` na descrição do cartão.
- **Agrupamentos** (Naruto, Studio Ghibli, Mobile Suit Gundam…): a pasta de fora pode ter qualquer nome. Cada obra de dentro com cartão próprio usa o cartão dela. As que não têm cartão (ex.: os 3 filmes de `O Senhor dos Anéis (Trilogia)`) usam o cartão da pasta de fora.
- Pasta **sem cartão** continua funcionando do jeito antigo (símbolo e `[DUB]`/`[LEG]` no nome). Ex.: `⌧ Obsessão [DUB]` aparece como "em breve".
- Pasta com **⚠ no começo do nome** é **ignorada** pelo site: serve pra adiantar vídeos que ainda esperam patrocínio. Quando for patrocinada, crie o cartão e tire o ⚠.
- Cartão **sem pasta** aparece no site sem vídeo (normal pra obra na fila).
- A **categoria** que vale é a etiqueta do Trello, mesmo que a pasta esteja em outra categoria no Drive.
- O robô lista no fim de cada execução (em **Actions**) tudo o que não bateu: pasta sem cartão, cartão sem pasta, categoria diferente, pasta repetida.

---

## 2. 🃏 O cartão modelo

Crie este cartão uma vez, na lista INFOS, e marque como **modelo**: abra o cartão → `⋯` → *Transformar em modelo*.
Pra cada obra nova: botão **"+ Adicionar um cartão" → ícone de modelo → "MODELO"**, e é só preencher.

**Título:** `Nome da obra`

**Etiquetas:** categoria + áudio (+ nota, depois do react)

**Descrição:**
```
TMDB:
Drive:
Dia:
Patrocinado por:
Review:
Obs:
```
*(Deixe em branco o que não usar. O robô ignora linhas vazias.)*

**Checklist:** `Temporada 1`
```
☐ Episódio 1 ()
☐ Episódio 2 ()
☐ Episódio 3 ()
```

---

## 3. A checklist (o coração do sistema)

- **Uma checklist por temporada:** `Temporada 1`, `Temporada 2`...
  Partes que não são temporadas usam o próprio nome: `OVAs`, `Filme`, `Bridon Arc`.
- **Um item por episódio:** `Episódio 7`. O robô lê o número, então `Ep 7` também serve.
- **Item existe = episódio pago ou confirmado. Item marcado ✅ = assistido.**
- **Patrocinador entre parênteses:** `Episódio 7 (Austeroz)`.
  - Mais de um: `Episódio 7 (Austeroz, Fulana)`.
  - Temporada inteira paga pela mesma pessoa: o nick pode ir no nome da checklist → `Temporada 2 (Austeroz)`.
  - Escolha do chat: `Episódio 7 (Chat)`. Escolha da Bruna, sem patrocínio: deixe sem parênteses → `Episódio 7`.
- **Filme:** não precisa de checklist. Use a linha `Patrocinado por: Austeroz` na descrição.
- **Já pago inteiro?** Se a descrição tem `Patrocinado por:`, ou se **toda** temporada/episódio tem nick, o site entende que não falta nada pra pagar e tira o botão "Peça esse react". Faltou nick em algum episódio = o botão continua.
- **Fixo que ainda não começou** (nenhum episódio ✅) aparece como "Na fila" no site até o primeiro react.

> 💡 O Trello guarda **quando** cada item foi marcado. Por isso, o site mostra "Assistido em 12/10" sem ninguém anotar a data.

---

## 4. Exemplos

**Anime com patrocínio, em andamento**
- Lista: `Em aberto / incompletos - Anime`
- Etiquetas: `Anime` · `Legendado`
- Checklist `Temporada 1`:
  ☑ `Episódio 1 (Austeroz)` · ☑ `Episódio 2 (Austeroz)` · ☐ `Episódio 3 (Fulana)`
- No site: T1 em andamento, 2 eps assistidos, ep 3 pago pela Fulana e na fila.

**Filme finalizado, com nota e review**
- Lista: `Finalizados - Filmes`
- Etiquetas: `Filme` · `Dublado` · `★ 10`
- Descrição: `Review: Chorei do começo ao fim, obra-prima.` e `Patrocinado por: Ciclano`

**Mesma obra, partes diferentes** (ex.: Link Click)
- **Um cartão só**, com várias checklists: `Temporada 1` ✅, `Temporada 2` ✅, `Bridon Arc`, `Temporada 3`.
- O cartão fica na lista do que **falta**: se ainda tem parte por assistir, fica em Fila ou Em aberto.

---

## 5. Etiquetas

| Grupo | Etiqueta | Cor no Trello |
| --- | --- | --- |
| Categoria | Anime | rosa |
| | Filme | vermelho |
| | Série | azul |
| | Animação | verde |
| | Tokusatsu | laranja |
| Áudio | Dublado · Legendado | céu (claro) · lima (claro) |
| Nota | ★ 1 … ★ 10 | amarelo (claro), todas iguais |
| Destaques | Próximo · Meta Incentive · Escolha do Chat | roxo (forte · normal · claro) |
| Off Live | Off Live | preto |
| Avisos da obra | Stand-by | cinza (preto claro) |
| Avisos do cronograma | Folga · Adiado · Cancelado | cinza · laranja (claro) · vermelho (forte) |

As cores de categoria são as mesmas das prateleiras do site. Escreva os nomes exatamente assim: o robô lê pelo **nome**, a cor é só pra ajudar a bater o olho.

---

## 6. 📅 Cronograma

Fica na lista **CRONOGRAMA**, com **um cartão por dia**:

- **Título:** o dia e a data → `Seg 02/11`
- **Checklist `Programação`**, um item por coisa da live:
  ```
  ☐ Mob Psycho 100 · T2 Ep 7
  ☐ Invencível · Eps 6 e 7
  ☐ Just chatting
  ```
- Comece o item com o **nome da obra** (igual ao cartão dela). O site liga uma coisa à outra e mostra o nick de quem patrocinou sozinho, sem precisar repetir.
- **O site mostra só hoje e os próximos dias.** Os dias que passaram somem sozinhos. Arquive os cartões velhos de vez em quando.
- O cronograma é **plano**, não registro. **O que foi assistido de verdade vem sempre da checklist da obra.** Se o dia não sair como planejado, o site não marca nada como assistido por engano.
- **Fixos:** com `Dia: quarta` no cartão da obra, o site já mostra "toda quarta". Não precisa escrever o fixo toda semana, mas pode, se quiser deixar claro.

### ⏰ Horário
- **Sem horário no título, vale o de sempre: 23h.**
- **Horário diferente:** coloque no fim do título → `Sexta 30/10 · 21h` ou `Sexta 30/10 · 21h30`. Também vale `21:30`.
- **Sempre no horário de Brasília.** O site converte sozinho pra quem assiste de fora.
- **Live que passa da meia-noite** fica no cartão do dia em que **começa**. A live de segunda às 23h é `Segunda 02/11`, mesmo terminando na terça.

### 🎬 Off Live (React Offline)
Ganha um **cartão só dela**, separado da live da Twitch, mesmo que seja no mesmo dia:

- **Título:** dia, data e horário → `Sábado 31/10 · 15h`
- **Etiqueta:** `Off Live`
- **Checklist `Programação`:** a obra, igual nos outros dias → `Obsessão`
- **Descrição** (opcional):
  ```
  Classificação: 18
  Aviso: Contém nudez e temas pesados.
  ```
  Com `Classificação: 18`, o site pede pra pessoa confirmar a idade antes de mostrar a transmissão.

No site, o cartão vira a **"Próxima sessão"** da aba Reacts Offline, com contagem regressiva e botão de lembrete na agenda. Ele também aparece no cronograma, marcado como Off Live.

**Exemplo de um sábado com as duas coisas:**
| Cartão | Etiqueta | Programação |
| --- | --- | --- |
| `Sábado 31/10 · 15h` | Off Live | `Obsessão` |
| `Sábado 31/10` | — | `Haikyu!! · T2 Eps 3 e 4` (na Twitch, às 23h) |

### Quando o planejado muda
| Situação | O que fazer | O que o site mostra |
| --- | --- | --- |
| Não deu pra assistir tudo | Marque na checklist da obra só o que foi assistido | O resto continua "na fila" |
| Mudou de dia | Arraste o item pro cartão do outro dia | O novo dia |
| Dia sem live | Etiqueta `Folga` (ou `Cancelado`, se foi de última hora) no cartão do dia | "Sem live neste dia" |
| Adiou sem data nova | Etiqueta `Adiado` no cartão do dia | "Adiado" no dia |
| Obra pausada por tempo indeterminado | Etiqueta `Stand-by` no **cartão da obra** | Selo "Em pausa" na obra |
| Sessão de React Offline | Cartão próprio no dia, com etiqueta `Off Live` e horário no título (ver acima) | "Próxima sessão" na aba Reacts Offline |
| Mudou o horário | Troque o horário no título do cartão do dia | O novo horário e a contagem certa |

---

## 7. Rotina rápida

**Chegou um patrocínio**
1. A obra já tem cartão? Adicione o item `Episódio N (nick)` na checklist da temporada.
2. Não tem? Crie pelo modelo, preencha a categoria e o áudio, coloque na Fila e adicione o item.

**Depois do react**
1. Marque ✅ os episódios assistidos.
2. Se acabou a obra (ou a parte), mova o cartão pra Finalizados e coloque a nota (`★`).

**Subiu o vídeo no Drive**
- Nada a fazer no Trello. O site liga o vídeo ao episódio sozinho.

---

## 8. ❓ Dúvidas comuns

- **Esqueci de marcar algo, e agora?** Marque quando lembrar. O site se atualiza na próxima leitura (até 1h, ou na hora pelo *Run workflow*).
- **O nome no Trello é diferente do nome da pasta no Drive.** Use a linha `Drive:` na descrição.
- **A capa saiu errada.** Use a linha `TMDB:` na descrição, com o link da obra no themoviedb.org.
- **Cartão antigo, sem checklist.** Continua funcionando do jeito de antes. Ajuste quando der.
