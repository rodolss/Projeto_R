# Renda fixa automática Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tesouro Direto escolhido numa lista e CDB/LCI/LCA calculados pela taxa, com o valor do dia gravado como saldo.

**Architecture:** Tesouro reaproveita o papel automático (`compras`, `fonte: 'tesouro'`, preço do `dados-publicos/tesouro.json`
gerado por uma tarefa agendada). CDB/LCI/LCA são títulos calculados (`aplicacoes` + `rendaFixa`) com CDI do Banco Central.

**Tech Stack:** ES modules, `node --test`, GitHub Actions (Node 20), SGS do Banco Central.

**Spec:** `docs/superpowers/specs/2026-11-22-renda-fixa-automatica-design.md`

## Global Constraints

- Sem versão nova do dados.json; séries e preços só no aparelho ou no arquivo público; nada pessoal sai do aparelho.
- Repo público: nada de nomes nem valores reais; textos em português com acentos; secundário antes da confirmação.
- Arquivos em CRLF: Edit ou script que falha se não achar; desenhar no Edge antes de publicar.
- Versão 97; módulos novos na `CASCA`; `dados-publicos/` nunca no cache do service worker.

## Review Focus

- CDI sem os últimos dias (série atrasada) ou sem internet: valor do último dia conhecido, sem quebrar (Task 1, 3).
- Aplicação de hoje: fator 1 (vale o aplicado). Resgate maior que o saldo: nunca negativo (Task 1).
- Quantidade de títulos com vírgula ("0,47"): aceita e soma sem erro de arredondamento visível (Task 1, 3).
- `tesouro.json` ausente ou inválido: a busca do Tesouro avisa e o resto funciona (Task 2, 3).
- Título vencido some da lista do arquivo: o ativo fica com o último preço conhecido (Task 1).

### Task 1: núcleo

**Files:** Create `js/core/renda-fixa.js`; Modify `js/core/cotacoes.js`, `js/core/carteira.js`; Tests `tests/core/renda-fixa.test.js`, `tests/core/cotacoes.test.js`

**Interfaces (produz):**
- `renda-fixa.js`: `tituloCalculado(ativo)`, `fatorDoTitulo(rf, { de, ate, cdi, ipca }) -> number`, `valorBruto(estado, ativo, series, hoje)`,
  `liquidoEstimado(estado, ativo, series, hoje)`, `aplicadoDoTitulo(estado, ativo)`, `novoTituloCalculado(estado, {...})`,
  `registrarAplicacao(estado, id, { valor, data })`, `aplicarRendaFixa(estado, series, hoje)` (`series = { cdi: {AAAA-MM-DD: % ao dia}, ipca }`).
- `cotacoes.js`: `atualizaSozinho(ativo)`; `novoPapel` aceita `fonte` e quantidade decimal (arredonda a 8 casas).
- `carteira.js`: `posicoes` dá aplicado/ganho do título calculado.

- [ ] Testes (fator CDI 100%/110% com série inventada, prefixado e IPCA+, aplicação de hoje = 1, resgate, líquido com IR por
  prazo e LCI isenta, saldo do dia só quando muda, aporte do Dia de pagamento entra, quantidade 0,47 + 0,53 = 1) → FAIL → código → PASS → suíte → commit.

### Task 2: dados públicos e rede

**Files:** Create `scripts/tesouro.mjs` (+ `scripts/lib` se preciso), `.github/workflows/tesouro.yml`, `dados-publicos/tesouro.json`,
`js/dados/renda-fixa-remoto.js`; Tests `tests/scripts/tesouro.test.js`, `tests/dados/renda-fixa-remoto.test.js`

- `tesouro.mjs`: `titulosDoDia(csv) -> { data, titulos: [{ nome, tipo, vencimento, preco, taxa }] }` (último dia, nomes de Renda+/Educa+).
- Rede: `buscarTesouro({ fetch })` (lê `./dados-publicos/tesouro.json`, valida), `buscarCdi({ fetch, desde, guardada, agora })`, `precisaCdi`.

- [ ] Testes com CSV pequeno inventado e `fetch` falso → FAIL → código → PASS → gerar o `tesouro.json` real → commit.

### Task 3: telas, segundo plano, versão 97

**Files:** Modify `js/ui/carteira-ativos.js`, `js/ui/cotacoes-aparelho.js`, `js/ui/inicio.js`, `js/ui/mes.js`, `sw.js`, `js/versao.js`, `tests/dados/sw.test.js`, `README.md`

- [ ] Aba "Renda fixa e outros" com Tesouro / CDB, LCI ou LCA / Outro; folhas do Tesouro e do CDB; atualização em segundo
  plano (bolsa, Tesouro, CDI); `dados-publicos/` fora do cache do sw; Dia de pagamento e Atualizar saldos pulam os automáticos.
- [ ] `npm test`; desenhar as folhas no Edge; commit; PR; CI; mesclar e conferir o site (publicar sem perguntar).
