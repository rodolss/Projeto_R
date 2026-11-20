# Balanço do mês — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aba "Balanço" nas contas da casa: o que entrou e o que saiu no mês para uma pessoa (salário, parte das contas, o que é dela no cartão) e a sobra.

**Architecture:** Núcleo puro `balancoDoMes` em `js/core/balanco.js` sobre `resumoDoMes` e `faturaDoCartao`; tela `js/ui/casa-balanco.js`; rota `casa-balanco` e botão no menu da casa.

**Tech Stack:** JavaScript puro (módulos ES), `node --test`, CSS próprio.

**Spec:** `docs/superpowers/specs/2026-11-20-balanco-do-mes-design.md`

## Global Constraints

- Repositório público: exemplos inventados (Ana, Leo, Mãe).
- O balanço de uma pessoa nunca mostra o cartão de outra pessoa (nem a parte "para ela" no cartão alheio).
- A parte da casa dos cartões só entra pela parte das contas da casa (nunca duas vezes).
- Publicar: `js/versao.js`, `VERSAO` do `sw.js` e o teste do sw → `projeto-r-v15`; módulos novos na `CASCA`.
- `npm test` passa no fim de cada tarefa.

## Review Focus

1. Parte da casa do cartão contada duas vezes (nas contas e no cartão) → teste na Tarefa 1 (saiu = parte das contas + só o "seu" do cartão).
2. Compras para a outra pessoa da casa no cartão (ex.: presente) → ficam em "outras pessoas", fora da sobra → teste na Tarefa 1.
3. Salários vazios (sem divisão) → sem quebrar, contas `null` → teste na Tarefa 1.
4. Perfil que não divide a casa → só os cartões → teste na Tarefa 1.
5. Fatura ainda aberta → previsão → teste na Tarefa 1.

---

### Task 1: O balanço no núcleo

**Files:**
- Create: `js/core/balanco.js`
- Test: `tests/core/balanco.test.js`

**Interfaces:**
- Produces: `balancoDoMes(casa, mes, pessoaId, hoje) → { mes, pessoaId, salario: null | { valor, situacao: 'confirmado'|'a-confirmar'|'vazio', deOnde }, contas: null | { valor: number|null, total, fatia: number|null, aConfirmar: boolean }, cartoes: [{ cartaoId, nome, seu, daCasa, outras: { valor, jaTenho, falta }, aberta: boolean, conferida: boolean }], entrou, saiu, sobra, previsao: boolean }`
  - `salario`/`contas` `null` para quem não é pessoa da casa; `contas.valor` `null` sem divisão; `fatia` = parte da renda que vai para as contas.
  - `cartoes`: os cartões com `donaId === pessoaId`; `nome` = nome da conta do cartão; `seu` = itens `para === pessoaId`; `daCasa` = itens da Casa; `outras` = o resto (soma, já tenho, falta); `aberta` = `hoje <= periodo.ate` (cartão com os dias).
  - `entrou` = salário (0 se vazio ou `null`); `saiu` = `contas.valor ?? 0` + Σ `seu`; `sobra` = entrou − saiu (centavos). `previsao` = salário não confirmado, alguma conta a confirmar, ou fatura aberta.

- [ ] **Step 1: Testes que falham** (`tests/core/balanco.test.js`): `'balanço: entrou o salário; saiu a parte das contas e o que é seu no cartão; outras pessoas à parte'` (Leo: 4000 − 120 − 170 = 3710; outras 80, já tenho 30, falta 50; Ana sem cartão: 6000 − 180; com a fatura conferida e `hoje` 2026-12-20 sem previsão; com `hoje` 2026-11-25, fatura aberta e previsão) e `'balanço: salário a confirmar, sem divisão e perfil que não divide a casa'`.
- [ ] **Step 2:** `npm test` → FALHAM.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → PASSA.
- [ ] **Step 5: Commit** `feat(casa): balanço do mês por pessoa (núcleo)`

### Task 2: A aba Balanço

**Files:**
- Create: `js/ui/casa-balanco.js`
- Modify: `js/ui/rotas.js` (`TELAS`, `ABAS`), `index.html` (botão do menu), `css/app.css`, `sw.js`, `js/versao.js`
- Test: `tests/ui/rotas.test.js`, `tests/ui/casa-balanco.test.js`, `tests/dados/sw.test.js`

**Interfaces:**
- Consumes: Tarefa 1.
- Produces: `pessoaDoBalanco({ hash, casa, visto }) → string|null` — `visto.id` com perfil; sem perfil, `pessoa` do endereço se for pessoa da casa, senão a primeira.

- [ ] **Step 1: Testes que falham:** rotas (`TELAS` com `'casa-balanco'` depois de `'casa'`; `abaDoMenu('casa-balanco') === 'casa-balanco'`; `resolverRota('#/casa-balanco', false) === 'casa-balanco'`), `pessoaDoBalanco` e sw na versão 15.
- [ ] **Step 2:** `npm test` → FALHAM.
- [ ] **Step 3: Implementar:** tela com setas de mês (como o Mês), botões de pessoa sem perfis, cartão da sobra, "Entrou", "Saiu", "Para outras pessoas"; linhas levam ao Mês / à fatura no Cartão; menu de 5 botões; CSS; versão 15 e `CASCA`.
- [ ] **Step 4:** `npm test` → PASSA.
- [ ] **Step 5: Conferência visual:** `capturar-telas` com `gerar-casa-exemplo.mjs` em `casa-balanco` e `casa-balanco?pessoa=p2` → código 0; claro e escuro legíveis, menu com 5 botões.
- [ ] **Step 6: Commit** `feat(casa): aba Balanço do mês; versão 15`
