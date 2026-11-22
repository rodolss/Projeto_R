# Contas pessoais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** contas que se repetem todo mês, só de uma pessoa (fora da divisão da casa), na aba Contas, no Balanço e no "Tudo pago".

**Architecture:** lista nova `casa.contasPessoais` com os valores em `meses[].valores` (o mesmo lugar das contas da casa).
Núcleo puro em `js/core/contas-pessoais.js`; Balanço, custo de vida, pagamentos e perfis passam a consultá-lo; as telas
Contas e Ajustes ganham a lista e as folhas, com o formulário comum em `js/ui/conta-pessoal.js`.

**Tech Stack:** JavaScript ES modules sem dependências, `node --test`, DOM próprio (`js/ui/dom.js`).

**Spec:** `docs/superpowers/specs/2026-11-22-contas-pessoais-design.md`

## Global Constraints

- Sem versão nova do casa.json (`SCHEMA_CASA` continua 4); nada de `casa.contas` muda.
- Repo público: nenhum nome real nem valor real em código, testes ou documentos.
- Textos em português do Brasil, com acentos; nada de jargão ("Contas pessoais", "Todo mês, sem fim", "Tem fim").
- Par de botões: secundário (Cancelar/Fechar) antes, confirmação depois.
- Arquivos em CRLF: editar com a ferramenta Edit; desenhar as telas no Edge headless antes de publicar.
- Versão 92: `sw.js` e `js/versao.js` juntos; módulos novos na `CASCA` do sw.js; `tests/dados/sw.test.js` na versão 92.

## Review Focus

- Conta com fim vista num mês depois da última parcela: some da lista e não é prevista (testado na Task 1).
- Conta criada em dezembro, vista em novembro: não aparece nem é prevista (Task 1).
- Mês travado (passado ou tudo pago): as folhas pessoais não abrem e "Adicionar conta pessoal" avisa (Task 4, desenho no Edge).
- Outro perfil (ou aparelho sem perfil) nunca vê as contas pessoais de alguém (Task 1 `contasPessoaisDe`; Task 4 só com `visto`).
- "Pago" numa conta "a confirmar" grava a previsão e marca; desfazer tira só a marca (Task 1 `confirmarPrevisao`; Task 4).

---

### Task 1: núcleo das contas pessoais

**Files:**
- Create: `js/core/contas-pessoais.js`
- Test: `tests/core/contas-pessoais.test.js`

**Interfaces:**
- Consumes: `centavos`, `salvarValor` de `js/core/casa.js`; `somarMeses`, `diffMeses` de `js/core/meses.js`.
- Produces:
  - `contasPessoaisDe(casa, pessoaId, { arquivadas = false } = {}) -> conta[]` (na ordem da lista; só as do dono)
  - `valorDaContaPessoal(casa, mes, conta) -> { valor, situacao: 'confirmado'|'a-confirmar'|'vazio', deOnde }`
  - `faltamParcelas(conta, mes) -> number|null` (`ultimoMes` − `mes` + 1; null sem fim)
  - `contasPessoaisDoMes(casa, mes, pessoaId) -> { contas: [{ conta, valor, situacao, deOnde, faltam }], semValor: conta[], total, aConfirmar }`
  - `ultimoMesDasParcelas(mes, parcelas) -> 'AAAA-MM'|null`
  - `adicionarContaPessoal(casa, { nome, donoId, mes, valor = null, parcelas = null, novoId }) -> casa`
  - `editarContaPessoal(casa, id, { nome, arquivada, desde, ultimoMes }) -> casa` (`ultimoMes: null` tira o fim)
  - `moverContaPessoal(casa, id, delta) -> casa` (troca com a vizinha ativa do mesmo dono)
  - `confirmarPrevisao(casa, { mes, conta }) -> casa` (grava o valor previsto como confirmado; já confirmado ou vazio: igual)

- [ ] **Step 1: testes que falham** em `tests/core/contas-pessoais.test.js` (casa mínima `{ pessoas, contas: [], meses: [], contasPessoais: [...] }`):
  - `contasPessoaisDe` devolve só as do dono, sem arquivadas; com `{ arquivadas: true }`, só as arquivadas.
  - valor digitado em 2026-12 → `confirmado`; em 2027-01 sem valor → `a-confirmar`, `deOnde: '2026-12'`.
  - `desde: '2026-12'`: em 2026-11 → `vazio` e fora de `semValor`.
  - `ultimoMes: '2027-02'`: 2027-02 → `faltam 1`; 2027-03 → `vazio`, fora de `contas` e de `semValor`; 2026-12 → `faltam 3`.
  - arquivada: só o confirmado aparece; sem confirmado, nada (nem em `semValor`).
  - `contasPessoaisDoMes`: `total` soma as com valor; `aConfirmar` conta as previstas; ativa sem valor vai para `semValor`.
  - `adicionarContaPessoal` com `valor: 350, parcelas: 18, mes: '2026-12'` → conta `{ nome, donoId, arquivada: false, desde: '2026-12', ultimoMes: '2028-05' }` e `meses` com o valor em 2026-12; sem parcelas → sem `ultimoMes`; sem valor → `meses` igual.
  - `ultimoMesDasParcelas('2026-12', 1) === '2026-12'`; `(…, null) === null`.
  - `editarContaPessoal(…, { ultimoMes: null })` tira o campo; `{ nome: ' Academia ' }` grava `'Academia'`.
  - `moverContaPessoal` pula as de outro dono e as arquivadas; na ponta, igual.
  - `confirmarPrevisao` numa prevista grava o valor no mês; numa confirmada, mesma casa.

- [ ] **Step 2:** `node --test tests/core/contas-pessoais.test.js` → FAIL (módulo não existe).
- [ ] **Step 3:** implementar em `js/core/contas-pessoais.js` (previsão: o último mês antes de `mes`, em `casa.meses` ordenado, com valor confirmado da conta; `confirmado` vale mesmo fora de `desde`/`ultimoMes`; `desde` e `ultimoMes` só cortam previsão e a linha "sem valor").
- [ ] **Step 4:** `node --test tests/core/contas-pessoais.test.js` → PASS.
- [ ] **Step 5:** commit `feat: núcleo das contas pessoais`.

### Task 2: Balanço, custo de vida, "Tudo pago" e perfis

**Files:**
- Modify: `js/core/balanco.js` (`balancoDoMes`), `js/core/custo-de-vida.js` (`custoDeVidaReal`), `js/core/pagamentos.js` (`tudoPago`), `js/core/perfis.js` (`podeApagarPerfil`)
- Test: `tests/core/balanco.test.js`, `tests/core/custo-de-vida.test.js`, `tests/core/pagamentos.test.js`, `tests/core/perfis.test.js`, `tests/dados/mesclar-casa.test.js`

**Interfaces:**
- Consumes: Task 1 `contasPessoaisDoMes`.
- Produces: `balancoDoMes(...).pessoais = { valor, aConfirmar: boolean, contas }` (sempre presente; `valor` 0 sem contas);
  `custoDeVidaReal(...)` com `pessoais` em cada mês e na média (só contas sem `ultimoMes`).

- [ ] **Step 1: testes que falham:**
  - balanço: conta pessoal de 300 confirmada → `saiu` cresce 300, `sobra` cai 300, `pessoais.valor === 300`; prevista → `previsao: true`; conta pessoal de outra pessoa não entra.
  - custo de vida: mês fechado com conta sem fim de 100 e com fim de 300 → `pessoais` 100 e `valor` = contas + cartão + 100.
  - pagamentos: com conta pessoal sem "Pago", `tudoPago` falso; marcada, verdadeiro; `contasPagas` não muda com ela.
  - perfis: perfil dono de conta pessoal → `podeApagarPerfil` falso.
  - mescla: conta pessoal criada num celular e valor de conta da casa no outro → as duas sobrevivem.
- [ ] **Step 2:** `npm test` → os novos FAIL.
- [ ] **Step 3:** implementar (no `tudoPago`, as marcas são os ids das contas pessoais em `contasPessoaisDoMes(...).contas` com `valor !== 0`).
- [ ] **Step 4:** `npm test` → PASS (todos).
- [ ] **Step 5:** commit `feat: contas pessoais no Balanço, no custo de vida e no "Tudo pago"`.

### Task 3: formulário da conta pessoal e Ajustes

**Files:**
- Create: `js/ui/conta-pessoal.js`
- Modify: `js/ui/casa-ajustes.js` (seção "Contas pessoais", folhas `pessoal-<id>` e `nova-pessoal`)
- Test: `tests/ui/conta-pessoal.test.js` (só as funções puras)

**Interfaces:**
- Consumes: Task 1 (`contasPessoaisDe`, `adicionarContaPessoal`, `editarContaPessoal`, `moverContaPessoal`, `ultimoMesDasParcelas`, `faltamParcelas`).
- Produces (`js/ui/conta-pessoal.js`):
  - `textoDoFim(conta, mes) -> string` — "todo mês" | "até <mês> de <ano>" | "terminou em <mês> de <ano>"
  - `textoDasParcelas(n) -> string` — "última parcela" (1) | "faltam N parcelas"
  - `campoDoFim({ parcelas, mes, aoMudar }) -> Element` — dois botões grandes ("Todo mês, sem fim" · "Ex.: academia,
    celular" / "Tem fim" · "Ex.: empréstimo, financiamento") e, com fim, o contador "Faltam N parcelas, contando a de
    <mês>" com "A última é em <mês> de <ano>."; `aoMudar(parcelas|null)`.

- [ ] **Step 1:** testes de `textoDoFim` e `textoDasParcelas` → FAIL.
- [ ] **Step 2:** implementar o módulo; testes PASS.
- [ ] **Step 3:** Ajustes: seção depois de "Contas", só com perfil visto; folha de edição (nome, `campoDoFim` a partir do mês em
  foco, posição, Cancelar/Salvar, "Parar de usar esta conta" em dois toques); folha nova (nome, `campoDoFim`); `details`
  "Contas pessoais que não usa mais (N)" com "Voltar a usar" (`arquivada: false, desde: <mês atual>`).
- [ ] **Step 4:** `npm test` → PASS (inclui `tests/ui/modulos.test.js`).
- [ ] **Step 5:** commit `feat: contas pessoais nos Ajustes`.

### Task 4: aba Contas, Balanço, Orçamento e versão 92

**Files:**
- Modify: `js/ui/casa.js` (lista e folhas), `js/ui/casa-balanco.js` (linha em "Saiu"), `js/ui/orcamento.js` (parte "Contas pessoais"),
  `sw.js`, `js/versao.js`, `tests/dados/sw.test.js`, `README.md`

**Interfaces:**
- Consumes: Tasks 1–3.

- [ ] **Step 1:** aba Contas: seção "Contas pessoais" (título com o total), linhas como as da casa (Pago ✓, a confirmar, `textoDasParcelas`),
  ativas sem valor como "sem valor neste mês", linha "+ Adicionar conta pessoal"; folha `pessoal-<id>` = `folhaValor` + o
  "Pago" que, numa prevista, grava `confirmarPrevisao` antes de marcar; folha `nova-pessoal` (nome, valor do mês opcional,
  `campoDoFim`); mês travado: aviso, sem folha.
- [ ] **Step 2:** Balanço: linha "Contas pessoais" (selo Pago se todas pagas, "a confirmar", nomes das contas) depois de "Contas da casa"; leva à aba Contas.
- [ ] **Step 3:** Orçamento › Custo de vida: linha "Contas pessoais" quando a média > 0; "· pessoais R$ X" no mês a mês; nota diz que conta com fim não entra.
- [ ] **Step 4:** versão 92, módulos novos na `CASCA`, `sw.test.js` na 92, uma linha no README.
- [ ] **Step 5:** `npm test` → PASS; desenhar Contas, Ajustes e Balanço no Edge headless com uma casa inventada (conta com fim, sem fim, prevista, paga) e conferir.
- [ ] **Step 6:** commit `feat: contas pessoais na aba Contas e no Balanço; versão 92`.
