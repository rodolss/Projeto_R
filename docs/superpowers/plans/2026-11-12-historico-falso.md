# Histórico falso para validação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar um arquivo de backup com 3 anos de uso inventado do Projeto R (nov/2023 a out/2026), para o usuário importar no computador e validar o app "a longo prazo".

**Architecture:** Uma função pura `gerarHistoricoFalso` simula o mercado mês a mês (com semente fixa) e registra cada mês com as próprias regras do app (`calcularMes` + `registrarAplicacao` + saldos), como faria uma pessoa usando a tela do Mês. Um script de linha de comando busca o IPCA real no Banco Central e grava o JSON.

**Tech Stack:** Node (ESM), `node:test`, módulos de `js/core`.

**Spec:** decisões da conversa de 2026-11-12 (sem documento separado; o usuário delegou os detalhes). Resumo nas Global Constraints.

## Global Constraints

- Substitui os dados reais por um tempo, via **Ajustes › Importar backup** no computador (o usuário exporta o backup real antes). Nenhuma mudança no site nem no app Android.
- Histórico: **36 meses registrados, 2023-11 a 2026-10**. **2026-11 fica sem registro.** `config.mesInicio = '2023-11'`, `plano = { p0: 0, mesP0: '2023-11' }` (parte do zero).
- Números inventados e redondos. Salário líquido R$ 8.000 (2023-11), R$ 8.600 (aumento em 2025-03), R$ 9.200 (aumento em 2026-03). `recebe13` e `recebeFerias` ligados.
- Orçamento com as categorias sugeridas pelo app (`CATEGORIAS_SUGERIDAS`): 9 mensais + IPVA, IPTU e Viagem como anuais; custo total perto de R$ 5.000/mês. Revisões a cada 6 meses (2024-05, 2024-11, 2025-05, 2025-11, 2026-05), corrigindo pela inflação.
- "Vida real": 13º em todo dezembro; férias (mês com salário + férias, mês seguinte recebe 0); uma PLR; proventos de FIIs (todo mês), DIVO11 (trimestral) e cupom do Tesouro IPCA+ (maio e novembro); quedas na bolsa em 2024-11/12 (Brasil) e 2025-03/04 (exterior); saldos atualizados na maioria dos meses, não em todos.
- Carteira padrão do app (`CARTEIRA_PADRAO`). A pessoa aplica o que o app sugere.
- `marcos = {}`: a reserva fica **sem comemorar**, para a festa aparecer ao abrir.
- O gerador fica no repositório (público): só números inventados, nenhum dado do usuário.

## Review Focus

- IPCA "do futuro" vazando para meses passados: ao registrar o mês M, a série do IPCA deve ir só até M−2 (como estaria no dia); senão os valores sugeridos saem inflados. Teste: o valor aplicado em 2023-11 fica perto do excedente nominal (salário − custo mensal).
- Importação rejeitada: o arquivo tem que passar por `migrar` e por `JSON.parse(JSON.stringify(...))` sem mudar.
- Novembro/2026 precisa poder ser registrado depois da importação: `calcularMes` em 2026-11-12 sugere um valor positivo.
- Lembretes: com 2026-11 em aberto, `montarLembretes` volta a mostrar novembro.
- Sem internet no Banco Central, o script não pode falhar: usa uma série de IPCA inventada (0,4% ao mês) e avisa.

---

### Task 1: Gerador do histórico falso

**Files:**
- Create: `scripts/historico-falso.mjs`
- Test: `tests/scripts/historico-falso.test.js`

**Interfaces:**
- Consumes: `calcularMes`, `registrarAplicacao`, `registrarSaldos`, `calcularPainel` (`js/core/motor.js`); `criarEstadoInicial` (`js/core/esquema.js`); `CATEGORIAS_SUGERIDAS` (`js/core/metas.js`); `quintoDiaUtil` (`js/core/lembretes.js`); `somarMeses` (`js/core/meses.js`).
- Produces: `gerarHistoricoFalso({ serieIpca: Record<'AAAA-MM', number>, semente?: number, agoraISO?: string }) → estado v2`; `serieIpcaInventada(desde: 'AAAA-MM', ate: 'AAAA-MM') → Record<'AAAA-MM', number>` (0,004 ao mês).

- [ ] **Step 1: Escrever os testes** (falham: módulo não existe)
  - `36 meses, de 2023-11 a 2026-10, sem 2026-11`
  - `é um backup válido` (`migrar` não lança; `JSON.parse(JSON.stringify(e))` deep-equal a `e`; `schemaVersion === 2`)
  - `vida real`: todo dezembro com `tipoExtra === 'decimo-terceiro'`; pelo menos um mês `ferias` seguido de um mês com `recebido === 0`; um mês `plr`; algum mês com `proventos > 0`; `config.salario === 9200` e `config.mesSalario === '2026-03'`
  - `reserva alcançada e ainda sem comemorar`: `calcularPainel({ estado, hoje: '2026-11-12' }).marcos.aComemorar` inclui `'reserva'`; independência não atingida
  - `sem IPCA do futuro`: soma do `aplicado` positivo de 2023-11 entre 0,9× e 1,1× de (8000 − custo mensal nominal)
  - `novembro/2026 pode ser registrado`: `calcularMes({ estado, recebido: 9200, hoje: '2026-11-12' }).excedente > 0`
  - `lembretes voltam para novembro`: `montarLembretes({ config: { ligado: true, tipo: 'fixo', dia: 13, hora: '09:00' }, agora: '2026-11-12T08:00', mesesRegistrados })[0].quando` começa com `'2026-11-13'`

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/scripts/historico-falso.test.js` → FAIL (módulo não encontrado)

- [ ] **Step 3: Implementar `scripts/historico-falso.mjs`**
  - PRNG com semente (mulberry32) e ruído normal (Box-Muller); semente padrão 2023.
  - Para cada mês M de 2023-11 a 2026-10: `hoje = quintoDiaUtil(M)`; série do IPCA cortada até M−2; aplicar aumento/revisão do orçamento se for o mês; montar `recebido`/`tipoExtra` da agenda da "vida real"; proventos = os pagos no mês anterior; saldos atualizados (todos os ativos com valor simulado, cotas = valor/preço arredondado) exceto nos meses pulados; `calcularMes` → `registrarAplicacao` com `aplicado` igual ao da tela (sugestões por classe, reserva, caixa) e `transferidoDaCaixa = daCaixaParaCarteira`; somar os aportes às posições simuladas; avançar o mercado um mês.
  - Mercado (mensal, nominal): Tesouro Selic 0,9%; Tesouro IPCA+ = IPCA + 0,5% ± 1,2%; XFIX11 −0,1% ± 3% (+0,9% em proventos); DIVO11 +0,6% ± 4,5% (+1,2% a cada trimestre); IVVB11 +1,1% ± 4%; choques fixos nas quedas.
  - No fim: `ipca = { serie: serieIpca completa, atualizadoEm: agoraISO }`, `marcos = {}`.

- [ ] **Step 4: Rodar e ver passar** — `node --test tests/scripts/historico-falso.test.js` → PASS; `npm test` → todos passam

- [ ] **Step 5: Commit** — `feat(scripts): gerador de histórico falso para validar o app`

### Task 2: Script de linha de comando e arquivo para importar

**Files:**
- Create: `scripts/gerar-historico-falso.mjs`

- [ ] **Step 1: Implementar** `node scripts/gerar-historico-falso.mjs <saida.json>`: busca o IPCA (`buscarSerieIpca` desde 2023-10, `fetch` do Node); se falhar, usa `serieIpcaInventada` e avisa; grava o JSON (2 espaços) e imprime um resumo (meses, patrimônio, reserva).
- [ ] **Step 2: Gerar o arquivo** em `C:\Users\liks_\Downloads\projeto-r-backup-falso.json` e conferir o resumo.
- [ ] **Step 3: Conferência visual**: abrir o site local (`npm run servir`) com o estado gerado no `localStorage` (Edge headless, como `scripts/capturar-telas.mjs`) e olhar Início, Mês, Simular e Histórico.
- [ ] **Step 4: Commit** — `feat(scripts): comando que gera o backup falso`
