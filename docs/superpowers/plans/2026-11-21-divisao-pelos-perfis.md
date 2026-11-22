# Quem divide as contas vem dos perfis — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** quem administra marca, entre os perfis, quem divide as contas da casa (duas pessoas ou mais), valendo do mês em foco em diante.

**Architecture:** `casa.pessoas` continua sendo quem divide; cada pessoa ganha `dentro` (períodos `{ de?, ate? }`, `ate` exclusivo; sem `dentro` = sempre). O núcleo filtra por mês; as telas só leem o resultado.

**Tech Stack:** JavaScript puro (módulos ES), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-21-divisao-pelos-perfis-design.md`

## Global Constraints

- Sem versão nova do arquivo (SCHEMA_CASA continua 4); casas sem `dentro` funcionam como antes.
- Pelo menos duas pessoas dividindo em qualquer mês do mês em foco em diante.
- Textos em português, com acentos; botão de confirmar à direita.
- Versão do app 80 → 81 (`js/versao.js`, `sw.js`, `tests/dados/sw.test.js`).

## Review Focus

- Perfil que entra em dezembro não aparece em novembro (nem com "R$ 0,00" nem com "Falta preencher").
- Sair e voltar no mesmo mês desfaz (sem período vazio sobrando no arquivo).
- Resumo do ano com uma pessoa que entrou no meio do ano: as somas de cada um não se trocam (ids, não posição).
- Terceiro card no Mês: ocupa a linha inteira e tem cor própria.
- Quem não administra não vê perfis fora da divisão nem a escolha.

---

### Task 1: núcleo — quem divide em cada mês

**Files:** Modify `js/core/casa.js`, `js/core/perfis.js`, `js/core/casa-ano.js`; Test `tests/core/casa.test.js`, `tests/core/perfis.test.js`, `tests/core/casa-ano.test.js`

**Interfaces — Produces:**
- `divideNoMes(pessoa, mes): boolean` e `pessoasNoMes(casa, mes): Pessoa[]` (casa.js)
- `resumoDoMes` usa `pessoasNoMes`
- `entrarNaDivisao(casa, perfilId, mes): casa` — perfil fora de `pessoas` entra com `dentro: [{ de: mes }]`; pessoa com período fechado em `mes` reabre (tira `ate`); fechado antes, ganha `{ de: mes }`.
- `sairDaDivisao(casa, pessoaId, mes): casa` — período aberto que começou em `mes` some (sem períodos, a pessoa sai de `pessoas`); senão o período aberto ganha `ate: mes` (sem `dentro`: `[{ ate: mes }]`). Devolve a mesma casa se ficariam menos de duas.
- `podeSairDaDivisao(casa, pessoaId, mes): boolean`
- `quemDivideNosAjustes(casa, mes, { administra }): { pessoa, divide }[]` — quem divide no mês; quem administra vê também os perfis fora (divide: false), depois.

- [ ] Testes: `pessoasNoMes` com `dentro`; `resumoDoMes` com três pessoas e com pessoa que entrou depois; `entrar`/`sair` (entrar de novo, desfazer no mesmo mês, voltar mais tarde, bloqueio com duas); `quemDivideNosAjustes`; `resumoDoAno` com quem entrou no meio do ano.
- [ ] Rodar: falham.
- [ ] Implementar; `resumoDoAno` junta por id e lista quem dividiu em algum mês do ano.
- [ ] `npm test`: passa. Commit.

### Task 2: telas

**Files:** Modify `js/ui/casa-ajustes.js`, `js/ui/casa.js`, `js/ui/casa-ano.js`, `js/ui/casa-balanco.js`, `css/app.css`, comentários em `js/core/cartao.js`, `js/ui/casa-cartao.js`, `js/core/balanco.js`; versão 81.

- [ ] Ajustes › Casa: lista de `quemDivideNosAjustes` (mês em foco = `mesPadraoDaCasa(ctx)`); folha com nome e, para quem administra, "Divide as contas" / "Não divide" em botões com exemplo e o mês em que vale; "Não divide" travado com aviso quando restariam menos de duas. Resumo da gaveta com os nomes juntos ("A, B e C"). Texto do "Novo perfil" aponta para Casa.
- [ ] Mês: cor `cor-${k % 3}` (terceira cor), último card de número ímpar ocupa a linha.
- [ ] Ano: "da renda de vocês"; Balanço sem perfis: chips de `pessoasNoMes`.
- [ ] `npm test` e conferir no navegador (claro e escuro, dados inventados, três pessoas). Commit, PR.
