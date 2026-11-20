# Compras do cartão no Mês da casa — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tocar numa conta ligada a cartão no Mês da casa abre, para todos os perfis, a folha com as compras da casa daquela fatura.

**Architecture:** `detalheDaContaNoMes` (núcleo, `js/core/perfis.js`) devolve tudo o que a folha mostra; `aoTocarConta` devolve `'parte'` para toda conta com cartão; `folhaParte` em `js/ui/casa.js` desenha a partir dela.

**Tech Stack:** JavaScript puro (módulos ES), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-20-detalhe-cartao-no-mes-design.md`

## Global Constraints

- Repositório público: exemplos inventados (Ana, Leo, Mãe).
- Nunca compras pessoais na folha, nem para a dona.
- Publicar: `js/versao.js`, `VERSAO` do `sw.js` e o teste de `tests/dados/sw.test.js` sobem para `projeto-r-v14`.
- `npm test` passa no fim de cada tarefa.

## Review Focus

1. Dona vendo a própria conta: a folha não pode trazer as compras dela para ela mesma nem para outras pessoas → teste na Tarefa 1 (só `para: 'casa'`).
2. Cartão sem os dias: sem período, sem quebrar → teste na Tarefa 1.
3. Mês de antes das compras com valor da planilha × mês sem nada × mês previsto → os três textos certos → teste na Tarefa 1.
4. Quem administra vendo como a outra pessoa: o botão segue o perfil visto → teste na Tarefa 1 (`visto` = dona → pode abrir).
5. "Abrir no Cartão" não deixa a folha presa no histórico → `location.replace` (conferir na revisão).

---

### Task 1: O detalhe da conta do cartão no Mês (núcleo)

**Files:**
- Modify: `js/core/perfis.js` (`aoTocarConta`; nova `detalheDaContaNoMes`)
- Test: `tests/core/perfis.test.js`

**Interfaces:**
- Produces:
  - `aoTocarConta(casa, contaId, visto) → 'parte' | 'folha'` — `'parte'` para toda conta ligada a um cartão.
  - `detalheDaContaNoMes(casa, contaId, mes, visto) → null | { cartaoId, dona: { id, nome } | null, podeAbrirCartao: boolean, periodo: { de, ate, vence } | null, compras, fixas, total, confirmado: boolean, semDetalhe: null | 'planilha' | 'previsao' | 'nenhuma', deOnde: string | null }` — `null` se a conta não tem cartão. `podeAbrirCartao` = `!donoDeOutroCartao(...)`. `periodo` só com `cartaoPronto`. Sem compras nem de todo mês da casa: `total`/`confirmado` vêm de `valorDaConta`; `semDetalhe`: `'previsao'` se a confirmar com `deOnde`; `'planilha'` se confirmado, valor ≠ 0 e `mes < primeiraFatura(...)`; senão `'nenhuma'`. Com itens: `semDetalhe: null`, `total` e `confirmado` = `parteDaCasaNoCartao` (`conferida`).

- [ ] **Step 1: Testes que falham:** ajustar `'revisão: o que cada perfil vê…'` (`aoTocarConta` → `'parte'` nos três casos com cartão) e criar `'detalhe da conta do cartão no Mês: a mesma parte da casa para todos; só quem vê o cartão abre o Cartão'` (Leo vendo c9 da Ana: `podeAbrirCartao` false, `dona.nome` 'Ana'; Ana vendo c9 e `visto` null: true; compras só da casa, período `{ de: '2026-10-24', ate: '2026-11-23', vence: '2026-12-01' }` para c9 em `2026-12`; conta sem cartão → null) e `'detalhe da conta do cartão no Mês: sem compras, planilha, previsão ou nenhuma; cartão sem os dias sem período'`.
- [ ] **Step 2:** `npm test` → FALHAM.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → PASSA.
- [ ] **Step 5: Commit** `feat(casa): detalhe da conta do cartão no Mês para todos os perfis (núcleo)`

### Task 2: A folha no Mês, versão 14

**Files:**
- Modify: `js/ui/casa.js` (`tocarConta`, `folhaParte`), `sw.js`, `js/versao.js`, `tests/dados/sw.test.js`

**Interfaces:**
- Consumes: Tarefa 1.

- [ ] **Step 1:** `folhaParte` desenha a partir de `detalheDaContaNoMes` com os textos do desenho (Q2/Q3); botão "Abrir no Cartão" (quando `podeAbrirCartao`) faz `location.replace('#/casa-cartao?cartao=<id>&fatura=<mes>')`; comentário de `tocarConta` atualizado. Versão 14 (sw.js, versao.js, teste do sw).
- [ ] **Step 2:** `npm test` → PASSA (o teste do sw falha antes de subir a versão: RED→GREEN).
- [ ] **Step 3: Conferência visual:** `capturar-telas` com `scripts/gerar-casa-exemplo.mjs` nas rotas `casa?folha=parte-cartao` e `casa?folha=parte-cartao-ana` → código 0; folha legível nos dois temas.
- [ ] **Step 4: Commit** `feat(casa): folha das compras da casa ao tocar na conta do cartão; versão 14`
