# Visão única — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um menu único (Balanço · Contas · Cartão · Plano · Mais) para quem administra e tem o planejador; os outros, como hoje.

**Architecture:** Decisões puras em `js/ui/rotas.js` e `js/ui/mais.js`; `js/app.js` liga a classe `espaco-unico`, acende a aba e mostra o topo; terceiro `<nav>` no `index.html`.

**Tech Stack:** JavaScript puro, `node --test`, CSS.

**Spec:** `docs/superpowers/specs/2026-11-20-visao-unica-design.md`

## Global Constraints

- A outra pessoa, aparelho sem perfil e quem administra vendo outro perfil: nada muda.
- Nenhuma conta muda. Versão `projeto-r-v17` (sw.js, versao.js, teste do sw).

## Review Focus

1. Quem administra vendo o perfil da outra pessoa → menu da casa como o dela → teste na Tarefa 1 (`visaoUnica` com `visto` sem `admin`).
2. Quem administra sem planejador (sem estado) → como hoje → teste na Tarefa 1.
3. Rotas da aposentadoria abertas por lembrete (`#/mes`) acendem o Plano → teste na Tarefa 1.
4. CSS: com `espaco-casa` e `espaco-unico` juntos, só o menu único aparece; `sem-abas` esconde tudo (conferir nas capturas).
5. Telas que a outra pessoa usa (casa) não mudam de texto nem de comportamento, fora do botão "Ir para o planejador" escondido só na visão única.

---

### Task 1: Decisões da visão única (puras)

**Files:** Modify `js/ui/rotas.js`, `js/ui/mais.js`; Test `tests/ui/rotas.test.js`, `tests/ui/mais.test.js` (novo)

**Interfaces:**
- `visaoUnica({ visto, temEstado }) → boolean` — `Boolean(visto?.admin) && Boolean(temEstado)`.
- `abaDoMenu(rota, unica = false)` — sem `unica`, como hoje. Com `unica`: `casa-balanco`, `casa`, `casa-cartao` → elas mesmas; `inicio`, `mes` → `inicio`; `simular`, `mais`, `orcamento`, `historico`, `config`, `casa-ano`, `casa-ajustes` → `mais`.
- `itensDoMais(unica) → [{ href, titulo, frase }]` — sem `unica`, os de hoje; com `unica`: Simulador (`#/simular`), Ano da casa (`#/casa-ano`), Orçamento, Histórico, Ajustes da casa (`#/casa-ajustes`), Ajustes do planejador (`#/config`).

- [ ] **Step 1:** testes que falham (visão única para Ana admin com estado; não para Leo, Ana vendo Leo, sem perfil, sem estado; abas com e sem `unica`; itens do Mais com e sem `unica`).
- [ ] **Step 2:** `npm test` → FALHAM. **Step 3:** implementar. **Step 4:** `npm test` → PASSA. **Step 5:** commit `feat: decisões da visão única (menu e Mais)`.

### Task 2: O menu único na tela, versão 17

**Files:** Modify `index.html`, `css/app.css`, `js/app.js`, `js/ui/mais.js` (render), `js/ui/casa-ajustes.js`, `sw.js`, `js/versao.js`, `tests/dados/sw.test.js`

- [ ] **Step 1:** teste do sw na versão 17 (falha). **Step 2:** `<nav class="menu menu-unico">` com as 5 abas; CSS (`body.espaco-unico` mostra só ele, depois das regras da casa); `app.js`: `unica` no contexto, classe no body, `abaDoMenu(nome, unica)`, topo com `daCasa || unica`; Mais usa `itensDoMais(ctx.unica)`; Ajustes da casa esconde "Ir para o planejador" com `ctx.unica`. **Step 3:** `npm test` → PASSA. **Step 4:** conferência visual (capturas com `projetoR.perfilVisto`/perfil simulado não é possível sem conexão: conferir pelo menos o menu antigo intacto e, com uma página de teste, o menu único). **Step 5:** commit `feat: visão única para quem administra; versão 17`.
