# Tela do Mês em lista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a aba Mês por uma lista de 4 tarefas (salário, proventos desde o último registro, saldos, investir) com folhas por baixo, resumo do mês registrado, edição e "Atualizar só os saldos"; o cartão do Início acompanha.

**Architecture:** A lógica (situação das tarefas, rascunho, datas, totais, saldos no dia do registro, cartão do Início) fica em `js/core/lista-mes.js`, pura e testada. O rascunho vive no `localStorage` (`js/ui/mes-rascunho.js`). A folha aberta vem do hash (`#/mes?folha=salario`), então o botão voltar fecha a folha; `app.js` passa a só atualizar a tela quando a rota não muda. `js/ui/mes.js` é reescrito reaproveitando os blocos da sugestão, da confirmação e dos saldos que já existem.

**Tech Stack:** JavaScript puro (ESM), `node --test`, CSS com os tokens de `css/app.css`.

**Spec:** `docs/superpowers/specs/2026-11-12-tela-do-mes-lista-design.md`

## Global Constraints

- Motor, regras, textos da sugestão e formato de `dados.json` não mudam. Registrar continua sendo `registrarAplicacao`; saldos avulsos, `registrarSaldos`.
- Textos fixados pelo desenho (copiar exatamente): "Dia de pagamento de {mês}", "{N} de 4 feitos", "Salário que caiu", "Falta preencher", "Proventos desde o último registro", "Dividendos, aluguéis de FIIs e juros do Tesouro que caíram desde {DD/mmm}, o seu último registro. Veja no extrato da corretora.", "desde que você começou", "Não caiu nada", "Saldos da corretora", "Opcional", "Copie antes de aplicar o dinheiro deste mês. Deixa a divisão mais precisa.", "Usar estes saldos", "Pular", "Atualizados em {DD/mmm}", "Pulado: o app estima", "O app estima", "Investir", "Libera depois das tarefas 1 a 3", "Separe {R$}", "Este mês não sobra nada para investir", "O seu dia a dia vem primeiro", "✓ {Mês} registrado", "em {DD/mmm} · {R$} aplicados", "Editar registro", "Atualizar só os saldos", "Editando o registro de {mês}. Ao confirmar, os valores novos substituem os antigos.", "Cancelar edição", "Registro atualizado.", "Mês registrado! 👏", "Atualizar saldos", "Copie os valores como estão na corretora agora. O registro de {mês} não muda.", "Salvar saldos", "Cancelar", "Saldos salvos.", "Fechar", "Salvar"; Início: "{R$} aplicados em {DD/mmm}", "Ver", "Dia de pagamento? · {N} de 4 feitos", "Continuar".
- Datas curtas "DD/mmm" como no protótipo: dia sem zero à esquerda + mês abreviado minúsculo sem ponto (`12/nov`).
- Rascunho no `localStorage` com a chave `projetoR.rascunhoMes`; não sincroniza; descartado se for de outro mês.
- `sw.js`: `VERSAO = 'projeto-r-v3'` e os arquivos novos na `CASCA`.
- Conferência visual com `node scripts/capturar-telas.mjs <pasta> --estado <arquivo>` (histórico falso; `npm run servir` rodando).

## Review Focus

- Botão voltar do Android com uma folha aberta: fecha a folha e continua no Mês; voltar de novo sai do Mês. Teste: `folhaAberta` (Task 2) e conferência manual descrita na Task 3.
- Dados chegando de outro aparelho (`receberEstado` → `renderizar`) com folha aberta ou em edição: a folha e o que foi digitado continuam (rascunho). Teste: Task 1 `rascunhoDoRegistro`/`validarRascunho`; conferência na Task 3.
- Virada do mês com rascunho antigo: o rascunho de outubro não aparece em novembro. Teste: Task 1 `validarRascunho` com outro mês → `null`.
- Proventos 0 ("Não caiu nada") conta como feito; salário vazio não salva a tarefa 1. Teste: Task 1 `situacao`.
- Tela de 412 px, temas claro e escuro: a folha rola por dentro e os botões não ficam sob o menu inferior. Conferência visual na Task 3.

---

### Task 1: Lógica da lista e rascunho

**Files:**
- Create: `js/core/lista-mes.js`, `js/ui/mes-rascunho.js`
- Test: `tests/core/lista-mes.test.js`, `tests/ui/mes-rascunho.test.js`

**Interfaces:**
- Produces (`js/core/lista-mes.js`), com `Rascunho = { mes: 'AAAA-MM', editando: boolean, recebido: number|null, tipoExtra: string|null, proventos: number|null, saldos: {[ativoId]: {valor: number|null, cotas: number|null}}|null, saldosModo: 'copiados'|'pulados'|null, feito: { salario: boolean, proventos: boolean } }`:
  - `rascunhoVazio(mes) → Rascunho`
  - `rascunhoDoRegistro(entrada) → Rascunho` (de um item de `meses`; `editando: true`, feito salário/proventos `true`, `saldos: null`, `saldosModo: null`)
  - `validarRascunho(salvo, mes) → Rascunho|null`
  - `situacao({ registrado: boolean, rascunho: Rascunho|null }) → { modo: 'novo'|'registrado'|'editando', feitas: {salario, proventos, saldos, investir}, quantas: number, podeInvestir: boolean }`
  - `ultimoRegistroAntes(meses, mes) → 'AAAA-MM-DD'|null`
  - `saldoDigitadoNoMes(estado, mes) → 'AAAA-MM-DD'|null` (só ativos `papel === 'carteira'`)
  - `totalAplicado(entrada) → number` (soma de `aplicado[].valor`, negativos incluídos, em centavos)
  - `saldosParaGravar({ estado, mes, hoje, saldos }) → saldos` (lista `{ativoId, valor, cotas}`)
  - `dataCurta('AAAA-MM-DD') → 'D/mmm'`
- Produces (`js/ui/mes-rascunho.js`): `lerRascunho(mes, armazenamento = globalThis.localStorage) → Rascunho|null`, `salvarRascunho(rascunho, armazenamento)`, `apagarRascunho(armazenamento)`; toda leitura/escrita em try/catch.

- [ ] **Step 1: Escrever os testes**
  - `situacao`: sem nada feito → `modo 'novo'`, `quantas 0`, `podeInvestir false`; salário+proventos feitos e `saldosModo 'pulados'` → `quantas 3`, `podeInvestir true`; proventos `0` com `feito.proventos true` conta; `registrado` sem rascunho em edição → `modo 'registrado'`, `quantas 4`; rascunho com `editando` → `modo 'editando'`, `feitas.saldos true`, `feitas.investir false`, `podeInvestir true` se salário e proventos feitos.
  - `validarRascunho`: rascunho de `'2026-10'` pedido em `'2026-11'` → `null`; lixo (`null`, `'x'`, `{}`) → `null`; válido → igual.
  - `rascunhoDoRegistro({ mes:'2026-11', recebido:9200, tipoExtra:null, proventos:412.3, ... })` → `{ mes:'2026-11', editando:true, recebido:9200, proventos:412.3, feito:{salario:true, proventos:true}, saldos:null, saldosModo:null, tipoExtra:null }`.
  - `ultimoRegistroAntes`: `[{mes:'2026-09', data:'2026-09-08'}, {mes:'2026-10', data:'2026-10-07'}, {mes:'2026-11', data:'2026-11-12'}]` com `'2026-11'` → `'2026-10-07'`; lista vazia → `null`.
  - `saldoDigitadoNoMes`: saldo da carteira em `2026-11-12` → `'2026-11-12'`; só saldo da reserva no mês → `null`.
  - `totalAplicado({ aplicado:[{valor:1000},{valor:500.5},{valor:-200}] })` → `1300.5`.
  - `saldosParaGravar`: com o mês registrado em `hoje` e `aplicado` de 1000 no ativo `a` → saldo digitado 5000 de `a` vira `{valor:4000, cotas:null}`; ativo sem aporte fica igual; em outro dia (`hoje` ≠ `data`) nada muda.
  - `dataCurta('2026-11-12')` → `'12/nov'`; `dataCurta('2026-01-05')` → `'5/jan'`.
  - `mes-rascunho`: salvar e ler de volta com armazenamento falso; ler de outro mês → `null`; armazenamento que lança → `lerRascunho` devolve `null` e `salvarRascunho` não lança.
- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/core/lista-mes.test.js tests/ui/mes-rascunho.test.js` → FAIL (módulos não existem)
- [ ] **Step 3: Implementar** as funções acima (meses abreviados: jan fev mar abr mai jun jul ago set out nov dez).
- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS; `npm test` → tudo passa
- [ ] **Step 5: Commit** — `feat(mes): lógica da lista de tarefas e rascunho no aparelho`

### Task 2: Folha por baixo, rota da folha e atualização sem recarregar

**Files:**
- Modify: `js/ui/rotas.js` (nova `folhaAberta`), `js/ui/dom.js` (nova `folha`), `js/app.js` (`renderizar`), `css/app.css`, `scripts/capturar-telas.mjs` (nome de arquivo seguro para rotas com `?`)
- Test: `tests/ui/rotas.test.js`

**Interfaces:**
- Produces: `folhaAberta(hash) → string|null` (`'#/mes?folha=salario'` → `'salario'`; sem parâmetro → `null`); `folha({ conteudo: Node[], aoFechar: () => void, rotulo: string }) → Node[]` (véu + painel `role="dialog"`, `aria-modal`, `aria-label`; tocar no véu chama `aoFechar`); em `app.js`, quando a rota resolvida é a mesma já desenhada e o módulo exporta `atualizar(container, ctx)`, `renderizar` chama só `atualizar` (sem `escalonar` e sem rolar para o topo).
- CSS novo (tokens existentes, claro/escuro): `.tarefa` (linha tocável), `.tarefa .bola`/`.bola.feito`, `.passos` (barra de 4 partes), `.veu`, `.folha` (fixa embaixo, `max-height: 86%`, rola por dentro, acima do menu, `padding-bottom` com `env(safe-area-inset-bottom)`), `.cartao.registrado`, `.check`; animação da folha só com `prefers-reduced-motion: no-preference`.

- [ ] **Step 1: Escrever os testes** em `tests/ui/rotas.test.js`: `folhaAberta('#/mes?folha=salario') === 'salario'`; `folhaAberta('#/mes') === null`; `folhaAberta('#/mes?folha=') === null`; `resolverRota('#/mes?folha=investir', true) === 'mes'`.
- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/ui/rotas.test.js` → FAIL (`folhaAberta` não existe)
- [ ] **Step 3: Implementar** `folhaAberta`, `folha`, o atalho em `renderizar`, o CSS e o nome seguro em `capturar-telas.mjs` (troca de `?`, `=` e `/` por `-` no nome do PNG).
- [ ] **Step 4: Rodar e ver passar** — `node --test tests/ui/rotas.test.js` → PASS; `npm test` → tudo passa
- [ ] **Step 5: Commit** — `feat(ui): folha por baixo ligada ao hash e atualização sem recarregar a tela`

### Task 3: Nova tela do Mês

**Files:**
- Modify: `js/ui/mes.js` (reescrita)

**Interfaces:**
- Consumes: tudo da Task 1 e da Task 2; `calcularMes`, `registrarAplicacao`, `registrarSaldos`, `calcularPainel`, `saldosAtuais` (`js/core/motor.js`); `precisaRevisarOrcamento`; `TIPOS_EXTRA`.
- Produces: `render(container, ctx)` e `atualizar(container, ctx)` (o mesmo desenho; `atualizar` existe para o atalho da Task 2).

- [ ] **Step 1: Reescrever `js/ui/mes.js`** conforme o desenho, nesta ordem de tela: aviso de revisão do orçamento (como hoje); aviso de edição com "Cancelar edição" (modo editando); cabeçalho (novo: "Dia de pagamento de {mês}", "{N} de 4 feitos", barra, frase "Faltam…"; registrado: "✓ {Mês} registrado", "em {DD/mmm} · {R$} aplicados", barra cheia); as 4 linhas; no modo registrado, "Editar registro" e "Atualizar só os saldos". Regras:
  - Abrir folha = `location.hash = '#/mes?folha=<nome>'` (nomes: `salario`, `proventos`, `saldos`, `investir`, `so-saldos`); fechar = `history.back()` se a folha foi aberta nesta sessão, senão `location.replace('#/mes')`.
  - Toda mudança nas tarefas 1–3 grava o rascunho (`salvarRascunho`); o rascunho é lido a cada desenho (`lerRascunho(mes)`). Ao abrir uma folha, o foco vai para o primeiro campo.
  - Folha `salario`: campo como hoje; chips de `TIPOS_EXTRA` quando `perguntarExtra` (calcule com `calcularMes`); "Salvar" exige valor > 0 e marca `feito.salario`.
  - Folha `proventos`: campo, dica com `dataCurta(ultimoRegistroAntes(meses, mes))` ou "desde que você começou", chip "Não caiu nada" (0); "Salvar" marca `feito.proventos`.
  - Folha `saldos`: os campos de `painelSaldos` de hoje (sem o botão "Salvar só os saldos"); "Usar estes saldos" → `saldosModo 'copiados'`; "Pular" → `'pulados'` (sem apagar saldos já copiados).
  - Folha `investir`: os blocos da sugestão e a confirmação de hoje, com `calcularMes({ ..., saldosAtualizados })` onde `saldosAtualizados` vem do rascunho só se `saldosModo === 'copiados'` e não estiver editando. Confirmar → `registrarAplicacao` (editando: `saldosAtualizados: null`; sem mudanças, `aplicado` salvo como o `usarSalvo` de hoje), `apagarRascunho`, toast "Mês registrado! 👏" ou "Registro atualizado.", fecha a folha.
  - Folha `so-saldos`: "Atualizar saldos", texto, campos; "Salvar saldos" → `registrarSaldos` com `saldosParaGravar(...)`, toast "Saldos salvos."; "Cancelar".
  - Modo registrado: tocar nas linhas 1, 2 ou 4 grava `rascunhoDoRegistro` e abre a folha da linha; linha 3 abre `so-saldos`. "Cancelar edição" apaga o rascunho.
  - Situação das linhas como no desenho; linha 3 registrada usa `saldoDigitadoNoMes`; linha 4 sem aporte usa o `motivo`.
- [ ] **Step 2: Testes** — `npm test` → tudo passa (inclui `modulos.test.js`, que carrega a tela).
- [ ] **Step 3: Conferência visual** — gerar o estado falso (`node scripts/gerar-historico-falso.mjs <tmp>/falso.json`) e uma variante com novembro registrado (script de rascunho no scratchpad, usando `calcularMes` + `registrarAplicacao`); com `npm run servir`, `node scripts/capturar-telas.mjs <tmp>/telas --estado <arquivo> --rotas mes,mes?folha=salario,mes?folha=proventos,mes?folha=saldos,mes?folha=investir,inicio` nas duas variantes; olhar claro e escuro: lista, folhas, mês registrado, cartão do Início, nada sob o menu.
- [ ] **Step 4: Commit** — `feat(mes): aba Mês em lista de tarefas, com mês registrado e edição`

### Task 4: Cartão do Início e service worker

**Files:**
- Modify: `js/core/lista-mes.js` (nova `cartaoDoPagamento`), `js/ui/inicio.js`, `sw.js`
- Test: `tests/core/lista-mes.test.js`, `tests/dados/sw.test.js`

**Interfaces:**
- Produces: `cartaoDoPagamento({ entrada, rascunho }) → { tipo: 'registrado', total, data } | { tipo: 'continuar', quantas } | { tipo: 'abrir' }` (`entrada` = item de `meses` do mês atual ou `undefined`; `continuar` quando não registrado e o rascunho tem 1 a 3 tarefas feitas).

- [ ] **Step 1: Escrever os testes** — `cartaoDoPagamento`: com `entrada` → `{ tipo:'registrado', total: totalAplicado(entrada), data: entrada.data }`; sem `entrada`, rascunho com salário feito → `{ tipo:'continuar', quantas:1 }`; sem nada → `{ tipo:'abrir' }`; com `entrada` e rascunho em edição → `registrado`. Em `sw.test.js`: versão `projeto-r-v3`.
- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/core/lista-mes.test.js tests/dados/sw.test.js` → FAIL
- [ ] **Step 3: Implementar** `cartaoDoPagamento`; no Início, o cartão "Dia de pagamento?" usa o resultado ("✓ {Mês} registrado" / "{R$} aplicados em {DD/mmm}" / "Ver"; "Dia de pagamento? · {N} de 4 feitos" / "Continuar"; o de hoje); `sw.js` com `VERSAO = 'projeto-r-v3'` e `./js/core/lista-mes.js`, `./js/ui/mes-rascunho.js` na `CASCA`.
- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS; `npm test` → tudo passa; captura do `inicio` nas duas variantes da Task 3.
- [ ] **Step 5: Commit** — `feat(inicio): cartão do pagamento mostra o mês registrado; sw v3`
