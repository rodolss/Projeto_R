# Onde investir agendado — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a análise `/onde-investir` roda sozinha na nuvem todo dia 26 e só recomenda ativos que o usuário consegue comprar.

**Architecture:** trava de elegibilidade e regra do mês em `js/core/recomendacao.js` (testadas); o script usa a regra e
descobre o dono pelo remoto do git (na nuvem, `gh api user` não passa pelo proxy); a skill ganha o modo automático; a
rotina é criada pelo RemoteTrigger depois do merge.

**Tech Stack:** JS (ES modules), `node --test`, `gh`, rotina do Claude Code.

**Spec:** `docs/superpowers/specs/2026-11-22-onde-investir-agendado-design.md`

## Global Constraints
- Liquidez mínima: `{ fiis: 1_000_000, acoes: 5_000_000 }` (R$/dia); conferência vale 120 dias antes de `geradaEm`.
- Texto padrão sem ordens: "Este mês o dinheiro vai para a reserva de emergência."
- Cron `0 22 26 * *` (19h de Brasília). Nada de dados pessoais no repositório público. Versão 90.

## Review Focus
- A lista já enviada não tem `conferido`: a primeira rodada automática tem de conferir todos (o validador recusa sem).
- `conferido.em` depois de `geradaEm` (data no futuro) é recusado.
- Liquidez igual ao mínimo é aceita.
- `mesDasOrdens` com a última análise num mês já registrado ou anterior volta à regra do próximo Dia de pagamento.
- Remoto do git em formato de proxy (`http://…@127.0.0.1:1234/git/dono/Projeto_R`) também dá o dono.

---

### Task 1: elegibilidade, mês das ordens e motivo sem ordens (`js/core/recomendacao.js`)
**Test:** `tests/core/recomendacao.test.js` (o `recomendacao()` de teste ganha `conferido` válido em cada item).
- [ ] Testes que falham: `validarRecomendacao` recusa item sem `conferido`, com `publicoGeral !== true`, liquidez abaixo
  do mínimo da classe, `em` com mais de 120 dias ou depois de `geradaEm`; aceita liquidez igual ao mínimo;
  `semOrdens` precisa ser texto não vazio quando existe. `mesDasOrdens(estado, hoje)`: `{meses: [], recomendacao: {mes:
  '2026-12'}}` em `2026-11-26` → `'2026-12'`; sem recomendação → `'2026-11'`; recomendação de `2026-12` com dezembro
  registrado em `2027-01-26` → `'2027-01'`. `motivoSemOrdens({})` → texto padrão; `{ semOrdens: 'X' }` → `'X'`.
- [ ] Rodar: falham. Implementar `LIQUIDEZ_MINIMA`, `mesDasOrdens`, `motivoSemOrdens`. Rodar: passam. Commit.

### Task 2: script e skill
**Files:** `scripts/github-dono.mjs` (novo, `donoDaUrl(url) -> string|null`), `scripts/onde-investir.mjs`,
`.claude/skills/onde-investir/SKILL.md`. **Test:** `tests/scripts/github-dono.test.js`.
- [ ] Teste que falha: `donoDaUrl` para `https://github.com/dono/Projeto_R.git`, `git@github.com:dono/Projeto_R.git`,
  `http://local_proxy@127.0.0.1:1234/git/dono/Projeto_R` → `'dono'`; URL sem `Projeto_R` → `null`.
- [ ] Implementar; `dono()` = `--dono` ?? remoto do git ?? `gh api user`. `contexto` usa `mesDasOrdens`.
- [ ] Skill: regras de elegibilidade + `conferido`, avisos práticos, `semOrdens`, modo automático (sem perguntas, até 3
  tentativas no conflito, pasta `/tmp/onde-investir` na nuvem, nada no repositório público). Commit.

### Task 3: app (`js/ui/inicio.js`) e versão
- [ ] Cartão: textos "a análise sai sozinha todo dia 26" (o pedido manual continua citado); sem ordens usa
  `motivoSemOrdens(rec)`. Versão 90 em `js/versao.js`, `sw.js`, `tests/dados/sw.test.js` (teste primeiro). Suite verde.
  Commit.

### Task 4: fechar
- [ ] Revisão do ramo inteiro, correções, PR, merge, Pages na v90. Rotina criada (depois do "pronto" do usuário) e uma
  execução de teste.
