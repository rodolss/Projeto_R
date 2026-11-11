# Redesenho v2 ("quanto falta") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a meta principal do Projeto R para a renda plena e redesenhar o app: Início com "faltam X anos e Y meses", Simulador com 4 cenários, menu inferior, visual azul-marinho com animações e comemoração de marcos.

**Architecture:** As regras ficam no núcleo puro e testado (`js/core/`): cenários, setinha, simulador e marcos, com o motor passando a mirar a renda plena e entregando ao Início tudo pronto em `calcularPainel`. As telas (`js/ui/`) só desenham. O visual vem de tokens CSS em `css/app.css`, com fontes guardadas no repositório. Os dados ganham o `schemaVersion` 2 (`marcos` e `meses[].previsao`), com migração automática.

**Tech Stack:** HTML, CSS e JavaScript puros (módulos ES, sem build), PWA com service worker, testes com `node --test`, Edge headless (CDP) para capturas de tela.

**Spec:** `docs/superpowers/specs/2026-11-10-redesenho-v2-design.md` (aprovada). Protótipo de referência: `git show prototipo/redesenho-v2:prototipos/redesenho-v2.html` (variante D = Início, A = Simular).

## Global Constraints

- Sem pacotes npm novos e sem etapa de build: tudo em módulos ES nativos.
- No Git Bash, rode `export PATH="/c/Program Files/nodejs:$PATH"` antes de `npm test` ou `node`.
- Textos da interface em português do Brasil com acentos, sem jargão. Todo número tem uma frase simples ao lado.
- Nenhum dado pessoal no repositório. Amostras e testes usam só números inventados.
- Cores apenas por tokens CSS, definidos para o claro (`:root`), para o escuro (`@media (prefers-color-scheme: dark) :root:not([data-tema="claro"])`) e para `:root[data-tema="escuro"]`. Nenhum componente usa cor literal.
- Toda animação respeita `prefers-reduced-motion: reduce`: nada se mexe e a comemoração aparece sem confete. A tela fica completa e correta sem animação.
- Todo arquivo servido ao navegador que for criado ou renomeado entra na lista `CASCA` de `sw.js` na mesma tarefa. A constante `VERSAO` passa a ser `'projeto-r-v2'`.
- Cenários: ruim = premissa − 0,02; moderado = premissa − 0,01; normal = premissa; bom = premissa + 0,02. Nomes e carinhas: Ruim 😟, Moderado 😐, Normal 🙂, Bom 😄.
- O alvo é `somarMeses(config.mesInicio, config.prazoMeses)` (padrão de 120 meses). Ele nunca aparece como alarme, status ou cor vermelha.
- Pensado para o celular: tudo cabe em 412 px de largura, sem rolagem lateral.
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Usuário real começando do zero** (sem investimentos, proventos zero e reserva em formação). O esperado é: anel vazio sem `NaN`, "faltam" calculado pelo excedente, reserva com "faltam R$ X", nenhum marco a comemorar e o cartão de proventos mostrando o convite. O teste está na Task 5.
2. **Dados da v1 vindos do GitHub ou de um backup importado.** O esperado é migrar para a v2 com `marcos: {}` sem perder nada. O teste está na Task 1 (`migrar`) e no armazém.
3. **Módulo novo esquecido na lista de cache do service worker.** O esperado é que o app continue abrindo sem internet. O teste está na Task 6 (`sw.test.js`) e roda em toda tarefa seguinte.
4. **Valores extremos no simulador** (salário 0, custo maior que o salário, aporte 0). O esperado é nunca aparecer `NaN` nem `Infinity` no resultado: meses viram `null` ("mais de 50 anos"). O teste está na Task 3.
5. **Renda plena já atingida.** O esperado é `faltam` igual a 0 e o marco atingido (com saldos confirmados), e o Início mostra "Você chegou". O teste está na Task 5.

---

### Task 1: Esquema v2 e mescla dos marcos

**Files:**
- Modify: `js/core/esquema.js`
- Modify: `js/dados/mesclar.js`
- Test: `tests/core/esquema.test.js`, `tests/dados/mesclar.test.js`, `tests/dados/armazem.test.js` (fixtures)

**Interfaces:**
- Produces: `SCHEMA_VERSION === 2`.
- Produces: `criarEstadoInicial(...)` passa a incluir `marcos: {}`.
- Produces: `migrar(estado)`:
  - um estado v1 vira `{ ...estado, schemaVersion: 2, marcos: estado.marcos ?? {} }`;
  - um estado v2 volta como a mesma referência;
  - qualquer outra coisa lança `Error('versao-desconhecida')`.
- Produces: o formato `estado.marcos: { reserva?: 'AAAA-MM-DD', independencia?: 'AAAA-MM-DD', rendaPlena?: 'AAAA-MM-DD' }`.
- Produces: `mesclar()` mescla `marcos` chave a chave e, quando os dois lados têm a mesma chave, fica a data mais antiga.

- [ ] **Step 1: Write the failing tests** (em `tests/core/esquema.test.js` e `tests/dados/mesclar.test.js`)

```js
test('estado inicial v2 traz marcos vazio', () => {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  assert.equal(e.schemaVersion, 2);
  assert.deepEqual(e.marcos, {});
});
test('migrar v1 → v2 acrescenta marcos e preserva o resto', () => {
  const v1 = { ...criarEstadoInicial({ salario: 1, mesInicio: '2026-11' }), schemaVersion: 1 };
  delete v1.marcos;
  const v2 = migrar(v1);
  assert.equal(v2.schemaVersion, 2);
  assert.deepEqual(v2.marcos, {});
  assert.deepEqual(v2.config, v1.config);
});
test('migrar rejeita versão 3', () => assert.throws(() => migrar({ schemaVersion: 3 }), /versao-desconhecida/));

test('marcos: une as chaves e fica com a data mais antiga', () => {
  const r = mesclar({
    base: { marcos: {} },
    local: { marcos: { reserva: '2027-03-02' } },
    remoto: { marcos: { reserva: '2027-03-01', independencia: '2035-01-01' } },
  });
  assert.deepEqual(r.marcos, { reserva: '2027-03-01', independencia: '2035-01-01' });
});
```

Em `tests/dados/armazem.test.js`, acrescente um teste: um remoto `{ schemaVersion: 1, x: 1 }` carregado pelo armazém volta com `schemaVersion: 2` e `marcos: {}`. Use o padrão `criarArmazem`/`criarCliente` do próprio arquivo.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/core/esquema.test.js tests/dados/mesclar.test.js tests/dados/armazem.test.js`
Expected: FAIL (`schemaVersion` 1 ≠ 2; `marcos` indefinido).

- [ ] **Step 3: Implement**

Faça as mudanças descritas em **Interfaces** em `esquema.js` e acrescente o ramo `k === 'marcos'` em `mesclar()`. Os fixtures do armazém que usam `schemaVersion: 1` e esperam o estado idêntico na volta passam a usar `schemaVersion: SCHEMA_VERSION`, importado de `js/core/esquema.js`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add js/core/esquema.js js/dados/mesclar.js tests/
git commit -m "feat: esquema v2 com marcos e migração da v1"
```

---

### Task 2: Cenários, setinha e impacto do orçamento na renda plena

**Files:**
- Modify: `js/core/projecao.js`
- Modify: `js/ui/orcamento.js`
- Test: `tests/core/projecao.test.js`

**Interfaces:**
- Produces: `cenarios(premissa: number) -> Array<{ id: 'ruim'|'moderado'|'normal'|'bom', nome: string, emoji: string, taxa: number }>`, sempre nessa ordem.
- Produces: `setinha({ meses: Array<{ mes, previsao? }>, mesAtual: 'AAAA-MM', faltamAgora: number|null }) -> null | { delta: number, mesComparado: 'AAAA-MM', imediato: boolean }`.
  - Usa o lançamento mais recente com `mes < mesAtual` e com `previsao`.
  - `faltava = diffMeses(m.mes, m.previsao.mesRendaPlena)` e `delta = faltamAgora − faltava`.
  - `imediato` diz se `m.mes` é o mês imediatamente anterior a `mesAtual`.
  - Devolve `null` se não houver esse lançamento, se a `previsao.mesRendaPlena` dele for `null` ou se `faltamAgora` for `null`.
- Changes: `impactoNoPrazo({ patrimonio, aporteMensal, i, metaRendaPlena, deltaCustoMensal }) -> number|null`. A meta fica fixa, o aporte vira `aporteMensal − deltaCustoMensal` e o resultado é a diferença em meses (`null` se algum lado não chegar).
- Keep (por enquanto): `classificarStatus`, `acaoSugerida` e `faixaProjecao`. A remoção fica para a Task 11.

- [ ] **Step 1: Write the failing tests**

```js
test('cenários acompanham a premissa', () => {
  assert.deepEqual(cenarios(0.05).map((c) => [c.id, c.nome, c.emoji, Number(c.taxa.toFixed(4))]), [
    ['ruim', 'Ruim', '😟', 0.03], ['moderado', 'Moderado', '😐', 0.04], ['normal', 'Normal', '🙂', 0.05], ['bom', 'Bom', '😄', 0.07],
  ]);
  assert.deepEqual(cenarios(0.06).map((c) => Number(c.taxa.toFixed(4))), [0.04, 0.05, 0.06, 0.08]);
});
test('setinha compara o tempo que falta com o último mês anterior', () => {
  const meses = [{ mes: '2027-01', previsao: { mesRendaPlena: '2048-05' } }, { mes: '2027-02', previsao: { mesRendaPlena: '2048-04' } }];
  assert.deepEqual(setinha({ meses, mesAtual: '2027-03', faltamAgora: 251 }), { delta: -3, mesComparado: '2027-02', imediato: true });
});
test('setinha ignora o próprio mês e avisa quando o comparado não é o anterior', () => {
  const meses = [{ mes: '2026-12', previsao: { mesRendaPlena: '2048-02' } }, { mes: '2027-03', previsao: { mesRendaPlena: '2048-01' } }];
  assert.deepEqual(setinha({ meses, mesAtual: '2027-03', faltamAgora: 250 }), { delta: -4, mesComparado: '2026-12', imediato: false });
});
test('setinha some sem base de comparação', () => {
  assert.equal(setinha({ meses: [], mesAtual: '2027-03', faltamAgora: 250 }), null);
  assert.equal(setinha({ meses: [{ mes: '2027-02' }], mesAtual: '2027-03', faltamAgora: 250 }), null);
  assert.equal(setinha({ meses: [{ mes: '2027-02', previsao: { mesRendaPlena: null } }], mesAtual: '2027-03', faltamAgora: 250 }), null);
  assert.equal(setinha({ meses: [{ mes: '2027-02', previsao: { mesRendaPlena: '2048-01' } }], mesAtual: '2027-03', faltamAgora: null }), null);
});
test('impacto no prazo da renda plena: gastar mais tira do aporte', () => {
  const base = { patrimonio: 260000, aporteMensal: 2400, i: i5, metaRendaPlena: 1800000 };
  assert.ok(impactoNoPrazo({ ...base, deltaCustoMensal: 300 }) > 0);
  assert.ok(impactoNoPrazo({ ...base, deltaCustoMensal: -300 }) < 0);
  assert.equal(impactoNoPrazo({ ...base, deltaCustoMensal: 0 }), 0);
});
```

Substitua o teste antigo de `impactoNoPrazo`, que usava `custoTotal`/`swr`, por este último.

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/core/projecao.test.js`
Expected: FAIL (`cenarios` e `setinha` não exportados).

- [ ] **Step 3: Implement `cenarios`, `setinha` e o novo `impactoNoPrazo` em `js/core/projecao.js`**

- [ ] **Step 4: Update `js/ui/orcamento.js`**

- Em `base`, troque `custoTotal`/`swr` por `metaRendaPlena: painel.metas.rendaPlena`.
- Troque toda menção a "Independência" no arquivo por "renda plena". O comentário da linha 1 fica "...na data da renda plena". O texto da linha 107 fica "Ao lado, o efeito na data da renda plena."

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/core/projecao.js js/ui/orcamento.js tests/core/projecao.test.js
git commit -m "feat: cenários, setinha e impacto do orçamento na renda plena"
```

---

### Task 3: Núcleo do simulador

**Files:**
- Create: `js/core/simulador.js`
- Test: `tests/core/simulador.test.js`

**Interfaces:**
- Consumes:
  - `projetar` e `cenarios` (`js/core/projecao.js`);
  - `taxaMensal` e `pmtNecessario` (`js/core/financas.js`);
  - `calcularMetas` (`js/core/metas.js`);
  - `alvoReserva` (`js/core/protecao.js`);
  - `somarMeses` e `diffMeses` (`js/core/meses.js`).
- Produces o tipo `BaseSimulador = { patrimonio, reserva, salario, custoTotal, ritmo, consegue, premissa, swr, mesAtual, mesAlvo }`. Quem o entrega é `calcularPainel` (Task 5).
- Produces o tipo `Alavancas = { salario: number, custo: number, aporte: number }`.
- Produces `moverAlavanca(sim: Alavancas, campo: 'salario'|'custo'|'aporte', valor: number) -> Alavancas`:
  - `salario` soma a diferença ao `aporte`;
  - `custo` subtrai a diferença do `aporte`;
  - o `aporte` nunca fica abaixo de 0;
  - os valores são arredondados para reais inteiros.
- Produces `aporteNecessario({ patrimonio, meta, i, mesAtual, mesLimite, reservaFaltando = 0 }) -> number`:
  - `Infinity` se `mesLimite <= mesAtual`;
  - `0` se `projetar` com aporte 0 já chega até `mesLimite`;
  - nos outros casos, busca binária sobre o aporte entre 0 e `meta + reservaFaltando`, usando `projetar(...).meses <= diffMeses(mesAtual, mesLimite)`, até a diferença ficar abaixo de R$ 0,50. Devolve o limite superior.
- Produces `simular({ base: BaseSimulador, sim: Alavancas })`, que devolve:

```
{
  metas: { independencia, rendaPlena },              // calcularMetas com sim.custo e sim.salario
  cenarios: [{ id, nome, emoji, taxa, meses, mes }], // renda plena por cenário (projetar com reservaFaltando)
  consegue,                                          // max(0, base.consegue + (sim.salario − base.salario) − (sim.custo − base.custoTotal))
  investeMaisQueConsegue,                            // sim.aporte > consegue + 0.5
  alvo: { mes, situacao: 'antes'|'passou'|'cabe'|'nao-fecha', necessario: number|null, aMais: number|null },
  prazosMaiores: [{ mes, necessario }, { mes, necessario }],
}
```

  - `reservaFaltando = max(0, alvoReserva(sim.custo) − base.reserva)`.
  - Na situação `'passou'`, `necessario` e `aMais` são `null`. O resultado nunca contém `Infinity` nem `NaN`.
  - `situacao` segue esta ordem:
    1. `'antes'` se o normal tem `mes` e `mes <= mesAlvo`;
    2. `'passou'` se `mesAlvo <= mesAtual`;
    3. `'cabe'` se `necessario <= consegue`;
    4. `'nao-fecha'` nos outros casos.
  - `aMais = max(0, necessario − sim.aporte)`.
  - `prazosMaiores` são `mesAlvo + 60` e `mesAlvo + 120`, ou `mesAtual + 60` e `mesAtual + 120` quando o alvo já passou.

- [ ] **Step 1: Write the failing tests**

```js
const BASE = { patrimonio: 260000, reserva: 21000, salario: 6000, custoTotal: 3500, ritmo: 2400, consegue: 2500, premissa: 0.05, swr: 0.04, mesAtual: '2026-11', mesAlvo: '2036-11' };
const REAIS = { salario: 6000, custo: 3500, aporte: 2400 };

test('quatro cenários com os números reais', () => {
  const r = simular({ base: BASE, sim: REAIS });
  assert.deepEqual(r.metas, { independencia: 1050000, rendaPlena: 1800000 });
  assert.deepEqual(r.cenarios.map((c) => [c.id, c.meses, c.mes]),
    [['ruim', 330, '2054-05'], ['moderado', 287, '2050-10'], ['normal', 255, '2048-02'], ['bom', 210, '2044-05']]);
});
test('alvo que não fecha: necessário e prazos maiores', () => {
  const r = simular({ base: BASE, sim: REAIS });
  assert.equal(r.alvo.mes, '2036-11');
  assert.equal(r.alvo.situacao, 'nao-fecha');
  perto(r.alvo.necessario, 8917, 1);
  assert.deepEqual(r.prazosMaiores.map((p) => p.mes), ['2041-11', '2046-11']);
  perto(r.prazosMaiores[0].necessario, 4756, 1);
  perto(r.prazosMaiores[1].necessario, 2736, 1);
  assert.equal(r.consegue, 2500);
  assert.equal(r.investeMaisQueConsegue, false);
});
test('cabe no que consegue', () => {
  const r = simular({ base: { ...BASE, consegue: 9000 }, sim: REAIS });
  assert.equal(r.alvo.situacao, 'cabe');
  perto(r.alvo.aMais, 8917 - 2400, 1);
});
test('chega antes do alvo', () => {
  assert.equal(simular({ base: BASE, sim: { ...REAIS, aporte: 15000 } }).alvo.situacao, 'antes');
});
test('alvo já passou: prazos contam de hoje', () => {
  const r = simular({ base: { ...BASE, mesAlvo: '2026-11' }, sim: REAIS });
  assert.equal(r.alvo.situacao, 'passou');
  assert.deepEqual(r.prazosMaiores.map((p) => p.mes), ['2031-11', '2036-11']);
});
test('alavancas ligadas', () => {
  assert.deepEqual(moverAlavanca(REAIS, 'salario', 7000), { salario: 7000, custo: 3500, aporte: 3400 });
  assert.deepEqual(moverAlavanca(REAIS, 'custo', 3800), { salario: 6000, custo: 3800, aporte: 2100 });
  assert.deepEqual(moverAlavanca(REAIS, 'custo', 9000), { salario: 6000, custo: 9000, aporte: 0 });
  assert.deepEqual(moverAlavanca(REAIS, 'aporte', 5000), { salario: 6000, custo: 3500, aporte: 5000 });
});
test('consegue acompanha as alavancas e avisa o excesso', () => {
  const r = simular({ base: BASE, sim: { salario: 7000, custo: 3800, aporte: 3000 } });
  assert.equal(r.consegue, 3200);
  assert.equal(r.investeMaisQueConsegue, false);
  assert.equal(simular({ base: BASE, sim: { ...REAIS, aporte: 2600 } }).investeMaisQueConsegue, true);
});
test('custo simulado maior aumenta a reserva que falta e atrasa a renda plena', () => {
  const r = simular({ base: BASE, sim: { salario: 6000, custo: 5000, aporte: 2400 } });
  assert.equal(r.metas.independencia, 1500000);
  assert.ok(r.cenarios[2].meses > 255);
});
test('aporteNecessario: coerente com pmtNecessario e com a reserva', () => {
  const i = taxaMensal(0.05);
  const args = { patrimonio: 260000, meta: 1800000, i, mesAtual: '2026-11', mesLimite: '2036-11' };
  perto(aporteNecessario(args), pmtNecessario({ p: 260000, meta: 1800000, i, meses: 120 }), 1);
  assert.ok(aporteNecessario({ ...args, reservaFaltando: 20000 }) > aporteNecessario(args));
  assert.equal(aporteNecessario({ ...args, mesLimite: '2026-11' }), Infinity);
  assert.equal(aporteNecessario({ ...args, patrimonio: 2000000 }), 0);
});
test('valores extremos não geram NaN nem Infinity no resultado (Review Focus 4)', () => {
  for (const sim of [{ salario: 0, custo: 0, aporte: 0 }, { salario: 6000, custo: 9000, aporte: 0 }, { salario: 30000, custo: 500, aporte: 0 }]) {
    const r = simular({ base: BASE, sim });
    const numeros = [r.consegue, r.alvo.necessario, r.alvo.aMais, ...r.prazosMaiores.map((p) => p.necessario)].filter((v) => v !== null);
    for (const v of numeros) assert.ok(Number.isFinite(v) && v >= 0, `valor inválido: ${v}`);
    for (const c of r.cenarios) assert.ok(c.meses === null || Number.isInteger(c.meses));
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/core/simulador.test.js`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `js/core/simulador.js`** conforme **Interfaces**.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/core/simulador.js tests/core/simulador.test.js
git commit -m "feat: núcleo do simulador (alavancas, cenários e necessário para o alvo)"
```

---

### Task 4: Núcleo dos marcos

**Files:**
- Create: `js/core/marcos.js`
- Test: `tests/core/marcos.test.js`

**Interfaces:**
- Produces: `MARCOS = ['reserva', 'independencia', 'rendaPlena']`.
- Produces: `avaliarMarcos({ reserva, alvoReserva, patrimonio, metas: { independencia, rendaPlena }, saldosConfirmados: boolean, comemorados = {} })`, que devolve:

```
{
  reserva: { atingido, falta },
  independencia: { atingido, quaseLa },
  rendaPlena: { atingido, quaseLa },
  aComemorar: string[],
}
```

  - A **reserva** é atingida quando `alvoReserva > 0 && reserva >= alvoReserva`. O saldo estimado vale. `falta = max(0, alvoReserva − reserva)`.
  - A **independência** e a **renda plena** são atingidas quando `meta > 0 && patrimonio >= meta && saldosConfirmados`. `quaseLa` vale para `patrimonio >= meta && meta > 0 && !saldosConfirmados`.
  - `aComemorar` lista os atingidos que não estão em `comemorados`, na ordem de `MARCOS`.
- Produces: `registrarComemoracao(estado, ids: string[], data: 'AAAA-MM-DD') -> estado`. É uma cópia do estado com `marcos[id] = data` só para as chaves que ainda não existem.

- [ ] **Step 1: Write the failing tests**

```js
const metas = { independencia: 1050000, rendaPlena: 1800000 };
test('reserva conta mesmo estimada; mostra quanto falta', () => {
  assert.deepEqual(avaliarMarcos({ reserva: 21000, alvoReserva: 21000, patrimonio: 0, metas, saldosConfirmados: false }).reserva, { atingido: true, falta: 0 });
  assert.deepEqual(avaliarMarcos({ reserva: 15000, alvoReserva: 21000, patrimonio: 0, metas, saldosConfirmados: false }).reserva, { atingido: false, falta: 6000 });
});
test('sem orçamento e sem metas não há marco atingido', () => {
  const m = avaliarMarcos({ reserva: 0, alvoReserva: 0, patrimonio: 0, metas: { independencia: 0, rendaPlena: 0 }, saldosConfirmados: true });
  assert.equal(m.reserva.atingido, false);
  assert.equal(m.independencia.atingido, false);
  assert.equal(m.rendaPlena.atingido, false);
  assert.deepEqual(m.aComemorar, []);
});
test('independência e renda plena pedem saldos confirmados', () => {
  const base = { reserva: 21000, alvoReserva: 21000, patrimonio: 1100000, metas };
  assert.deepEqual(avaliarMarcos({ ...base, saldosConfirmados: false }).independencia, { atingido: false, quaseLa: true });
  assert.deepEqual(avaliarMarcos({ ...base, saldosConfirmados: true }).independencia, { atingido: true, quaseLa: false });
  assert.deepEqual(avaliarMarcos({ ...base, saldosConfirmados: true }).rendaPlena, { atingido: false, quaseLa: false });
});
test('comemora uma vez, na ordem do caminho', () => {
  const base = { reserva: 21000, alvoReserva: 21000, patrimonio: 1900000, metas, saldosConfirmados: true };
  assert.deepEqual(avaliarMarcos(base).aComemorar, ['reserva', 'independencia', 'rendaPlena']);
  assert.deepEqual(avaliarMarcos({ ...base, comemorados: { reserva: '2027-01-01' } }).aComemorar, ['independencia', 'rendaPlena']);
});
test('registrarComemoracao guarda a data sem sobrescrever nem mutar', () => {
  const e = { marcos: { reserva: '2027-01-01' } };
  const novo = registrarComemoracao(e, ['reserva', 'independencia'], '2035-05-05');
  assert.deepEqual(novo.marcos, { reserva: '2027-01-01', independencia: '2035-05-05' });
  assert.deepEqual(e.marcos, { reserva: '2027-01-01' });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/core/marcos.test.js`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `js/core/marcos.js`**

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/core/marcos.js tests/core/marcos.test.js
git commit -m "feat: núcleo dos marcos (reserva, independência, renda plena)"
```

---

### Task 5: O motor mira a renda plena e entrega o novo painel

**Files:**
- Modify: `js/core/motor.js`
- Test: `tests/core/motor.test.js`

**Interfaces:**
- Consumes:
  - `setinha` (Task 2);
  - `avaliarMarcos` (Task 4);
  - `alvoReserva` (`protecao.js`);
  - `diasEntre` (`meses.js`).
- Changes (`contexto`):
  - `pmtNec` passa a usar `metas.rendaPlena`;
  - novo campo `saldosConfirmados`: há pelo menos um ativo de papel `carteira`, e todos têm registro de saldo com `diasEntre(data, hoje) <= 35`.
- Changes (`calcularPainel`): `planejadoHoje`, `grafico.plano` e o `caminho` (projeção e faixa do gráfico) passam a usar `metas.rendaPlena`.
- Produces: `calcularPainel` devolve também estes campos:
  - `faltam: number|null`, igual a `projecaoM2.meses`;
  - `setinha`, o retorno de `setinha({ meses: estado.meses, mesAtual: mes, faltamAgora: faltam })`;
  - `reserva: number` e `alvoReserva: number`;
  - `marcos`, o retorno de `avaliarMarcos({ reserva, alvoReserva, patrimonio, metas, saldosConfirmados, comemorados: estado.marcos ?? {} })`;
  - `baseSimulador: BaseSimulador`, com `ritmo = ritmo.valor`, `consegue = max(excedenteEsperado, ritmo.valor)`, `premissa = cfg.rentabilidadeReal`, `custoTotal = custo.total`, `salario`, `patrimonio = grupo.patrimonio`, `reserva = grupo.reserva`, `swr = cfg.swr`, `mesAtual = mes` e `mesAlvo`.
- Produces: `registrarAplicacao` grava `previsao: { mesRendaPlena }` no lançamento. O valor vem de `calcularPainel({ estado: novo, hoje: data }).projecaoM2.mes`, calculado depois de o lançamento entrar em `novo.meses`.
- Keep (até a Task 11): `status`, `acao`, `faixa` e `rendaNoPrazo` continuam no retorno, porque as telas antigas ainda os usam.

- [ ] **Step 1: Write the failing tests** (use o `estadoBase()` do arquivo)

```js
test('o plano mira a renda plena: perto da Independência, nada vai para a caixa', () => {
  const e = estadoBase();
  e.saldos = e.saldos.map((s) => (s.ativoId === 'rf' ? { ...s, valor: 1000000 } : s));
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  assert.equal(r.paraCaixa, 0);
  assert.equal(r.sugestoes.reduce((s, x) => s + x.valor, 0), 2800);
});
test('painel: faltam, setinha, marcos e base do simulador', () => {
  const p = calcularPainel({ estado: estadoBase(), hoje: '2026-11-10' });
  assert.equal(p.faltam, p.projecaoM2.meses);
  assert.equal(p.setinha, null);
  assert.equal(p.marcos.reserva.atingido, true);
  assert.deepEqual(p.marcos.aComemorar, ['reserva']);
  assert.deepEqual(p.baseSimulador, { patrimonio: 9500, reserva: 33000, salario: 7800, custoTotal: 5500, ritmo: 2800, consegue: 2800, premissa: 0.05, swr: 0.04, mesAtual: '2026-11', mesAlvo: '2036-11' });
});
test('registrar o mês guarda a previsão; no mês seguinte a setinha compara com ele', () => {
  let e = estadoBase();
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r, aplicado: r.sugestoes.map((s) => ({ destino: s.classe, valor: s.valor })) });
  const m = e.meses.find((x) => x.mes === '2026-11');
  assert.equal(m.previsao.mesRendaPlena, calcularPainel({ estado: e, hoje: '2026-11-10' }).projecaoM2.mes);
  const p = calcularPainel({ estado: e, hoje: '2026-12-10' });
  assert.equal(p.setinha.mesComparado, '2026-11');
  assert.equal(p.setinha.imediato, true);
});
test('marco comemorado não volta para a fila', () => {
  const e = estadoBase();
  e.marcos = { reserva: '2026-11-10' };
  assert.deepEqual(calcularPainel({ estado: e, hoje: '2026-11-10' }).marcos.aComemorar, []);
});
test('independência pela estimativa fica em "quase lá" sem saldos recentes', () => {
  const e = estadoBase();
  e.saldos = e.saldos.map((s) => (s.ativoId === 'rf' ? { ...s, valor: 2000000 } : s));
  assert.equal(calcularPainel({ estado: e, hoje: '2026-11-10' }).marcos.independencia.atingido, true);
  const depois = calcularPainel({ estado: e, hoje: '2027-01-20' }).marcos.independencia;
  assert.deepEqual(depois, { atingido: false, quaseLa: true });
});
test('começar do zero: nada a comemorar, reserva com quanto falta, sem NaN (Review Focus 1)', () => {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  e.orcamento = [{ id: 'o1', nome: 'Gastos', tipo: 'mensal', valor: 5000, mes: '2026-11' }];
  const p = calcularPainel({ estado: e, hoje: '2026-11-10' });
  assert.equal(p.marcos.reserva.atingido, false);
  assert.equal(p.marcos.reserva.falta, 30000);
  assert.deepEqual(p.marcos.aComemorar, []);
  assert.ok(p.faltam === null || Number.isInteger(p.faltam));
  assert.ok(!JSON.stringify(p).includes('NaN'));
});
test('renda plena atingida: faltam 0 e marco atingido (Review Focus 5)', () => {
  const e = estadoBase();
  e.saldos = e.saldos.map((s) => (s.ativoId === 'rf' ? { ...s, valor: 2400000 } : s));
  const p = calcularPainel({ estado: e, hoje: '2026-11-10' });
  assert.equal(p.faltam, 0);
  assert.equal(p.marcos.rendaPlena.atingido, true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/core/motor.test.js`
Expected: FAIL (`faltam`, `marcos` e `previsao` indefinidos; caixa recebendo no primeiro teste).

- [ ] **Step 3: Implement** as mudanças de **Interfaces** em `js/core/motor.js`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS. O teste antigo "painel sem histórico" continua passando sem mudança, porque o `status` ainda existe.

- [ ] **Step 5: Commit**

```bash
git add js/core/motor.js tests/core/motor.test.js
git commit -m "feat: plano mira a renda plena; painel com faltam, setinha, marcos e base do simulador"
```

---

### Task 6: Fontes, cores azul-marinho, ícones e ferramenta de captura

**Files:**
- Create: `fontes/inter-latin.woff2`, `fontes/sora-latin.woff2`, `fontes/OFL-Inter.txt`, `fontes/OFL-Sora.txt`
- Modify: `css/app.css` (tokens, `@font-face`, peças), `index.html` (`theme-color` e `preload` das fontes), `manifest.webmanifest`, `scripts/gerar-icones.ps1`, `icones/*.png` (regenerados), `sw.js` (`VERSAO` e fontes)
- Create: `scripts/capturar-telas.mjs`, `scripts/dados-exemplo.json`
- Test: `tests/dados/sw.test.js`

**Interfaces:**
- Produces (os tokens CSS que todas as tarefas de tela usam) — os nomes atuais ficam e alguns são novos:

| token | claro | escuro |
|---|---|---|
| `--fundo` | `#f2f4f8` | `#0a0f1c` |
| `--cartao` | `#ffffff` | `#121a2b` |
| `--cartao-2` (novo) | `#e6ebf3` | `#1a2337` |
| `--texto` | `#101a2e` | `#e5eaf4` |
| `--suave` | `#536079` | `#96a1b8` |
| `--borda` | `#d5dce8` | `#263049` |
| `--destaque` | `#1c3b72` | `#8aaaf0` |
| `--destaque-texto` | `#ffffff` | `#0a1022` |
| `--destaque-suave` (novo) | `#e0e8f6` | `#1a2950` |
| `--ok` / `--ok-fundo` | `#1a7a50` / `#dcf1e5` | `#5fcf9a` / `#12301f` |
| `--ouro` / `--ouro-fundo` (novos) | `#9a6514` / `#f4e7cf` | `#eab54d` / `#33290f` |
| `--atencao` / `--atencao-fundo` | `#a8731a` / `#f6ecd8` | `#e3b04f` / `#33270c` |
| `--alerta` / `--alerta-fundo` | `#b4462b` / `#f8e3dc` | `#f08a6c` / `#3a1d14` |
| `--info` / `--info-fundo` | `= --destaque` / `= --destaque-suave` | idem |
| `--plano` | `#8a96ad` | `#6b7790` |
| `--faixa` | `rgba(28,59,114,.12)` | `rgba(138,170,240,.16)` |
| `--c-ruim`, `--c-moderado`, `--c-normal`, `--c-bom` (novos) | `#c0533a`, `#a8731a`, `#1c3b72`, `#1a7a50` | `#f08a6c`, `#e3b04f`, `#8aaaf0`, `#5fcf9a` |

- Produces (fontes): `--fonte-texto: "Inter", system-ui, ...` e `--fonte-titulo: "Sora", "Segoe UI", system-ui, ...`. Títulos, `.valor-grande` e `.valor` usam a fonte de título.
- Produces (peças):
  - `.cartao` com raio de 18 px;
  - `.botao` com raio de 14 px e `:active { transform: scale(.96) }`;
  - campos com raio de 12 px;
  - `.tela` com `max-width: 560px`.
- Produces (ferramenta): `node scripts/capturar-telas.mjs <pasta-saida> [--rotas inicio,mes,...] [--festa] [--reduzir]` grava `<rota>-claro.png` e `<rota>-escuro.png` em 412 × 915. Detalhes:
  - Pressupõe `npm run servir` rodando em `http://localhost:8080`.
  - Abre o Edge headless (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, `--remote-debugging-port` e um `--user-data-dir` temporário) e fala com ele por CDP, usando o `WebSocket` global do Node.
  - Põe `scripts/dados-exemplo.json` em `localStorage['projetoR.estado']` antes de abrir as rotas. Antes, ajusta as datas da amostra ao dia de hoje: saldos com a data de hoje e um lançamento no mês anterior, com `previsao`, para a setinha aparecer.
  - `--festa` apaga `marcos` da amostra, para a comemoração aparecer.
  - `--sem-dados` não injeta estado nenhum, para capturar o assistente.
  - `--reduzir` emula `prefers-reduced-motion: reduce`.
  - Espera 1,5 s por tela.
  - Imprime os erros de console e as exceções da página e sai com código 1 se houver algum.
- Produces (amostra): `scripts/dados-exemplo.json` é um estado v2 com números **inventados**:
  - salário 6.000;
  - orçamento total de 3.500 (3.000 mensais + 6.000 anuais);
  - reserva de 21.000 já comemorada (`marcos.reserva`);
  - carteira de 260.000 nas 4 classes com os tickers da carteira padrão;
  - proventos de 1.080 no lançamento.

- [ ] **Step 1: Write the failing test** `tests/dados/sw.test.js` (Review Focus 3)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const texto = readFileSync('sw.js', 'utf8');
const casca = [...texto.match(/const CASCA = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
const modulos = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? modulos(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name).replaceAll('\\', '/')] : []));

test('service worker na versão 2', () => assert.match(texto, /const VERSAO = 'projeto-r-v2'/));
test('todo arquivo do cache existe', () => { for (const a of casca) assert.ok(existsSync(a), `falta ${a}`); });
test('todo módulo de js/ e toda fonte estão no cache', () => {
  for (const m of modulos('js')) assert.ok(casca.includes(m), `${m} fora do cache do service worker`);
  for (const f of readdirSync('fontes').filter((n) => n.endsWith('.woff2'))) assert.ok(casca.includes(`fontes/${f}`), `fontes/${f} fora do cache`);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/dados/sw.test.js`
Expected: FAIL (`VERSAO` ainda é v1; a pasta `fontes` não existe).

- [ ] **Step 3: Baixe as fontes e as licenças**

- Peça `https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap` e `https://fonts.googleapis.com/css2?family=Sora:wght@500..700&display=swap` com um User-Agent de Chrome recente.
- De cada resposta, pegue a URL `woff2` do bloco `/* latin */` e salve como `fontes/inter-latin.woff2` e `fontes/sora-latin.woff2`.
- Baixe as licenças `https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt` e `.../ofl/sora/OFL.txt`, salvando como `fontes/OFL-Inter.txt` e `fontes/OFL-Sora.txt`.
- Nenhum dado do usuário vai nos pedidos.

- [ ] **Step 4: Atualize CSS, HTML, manifest, ícones e `sw.js`**

- **CSS:**
  - `@font-face` para Inter (pesos `400 600`) e Sora (`500 700`), com `font-display: swap` e a `unicode-range` latina;
  - os tokens da tabela acima nos três blocos (claro, escuro do sistema e `data-tema`);
  - as peças com o visual novo.
- **Abas do topo:** ficam como estão nesta tarefa e saem na Task 7.
- **Cor do tema:** `theme-color` e `manifest.theme_color` passam a `#1c3b72`, e `background_color` a `#f2f4f8`.
- **Ícones:** em `gerar-icones.ps1`, a cor de fundo vira `FromArgb(255, 28, 59, 114)`. Rode `powershell -ExecutionPolicy Bypass -File scripts/gerar-icones.ps1`.
- **`sw.js`:** `VERSAO = 'projeto-r-v2'` e as duas fontes entram em `CASCA`.

- [ ] **Step 5: Escreva `scripts/dados-exemplo.json` e `scripts/capturar-telas.mjs`** conforme **Interfaces**.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verificação visual**

- Run: `npm run servir` em segundo plano.
- Depois: `node scripts/capturar-telas.mjs <scratchpad>/t6 --rotas mes,orcamento,config`
- Expected: código de saída 0 e 6 PNGs. Abra-os e confira:
  - azul-marinho no claro e azul claro no escuro;
  - letras Inter e Sora;
  - nada cortado em 412 px.

- [ ] **Step 8: Commit**

```bash
git add fontes css/app.css index.html manifest.webmanifest scripts icones sw.js tests/dados/sw.test.js
git commit -m "feat: visual azul-marinho, fontes no app e ferramenta de captura"
```

---

### Task 7: Navegação nova (menu inferior, rotas, tela Mais e movimento)

**Files:**
- Rename: `js/ui/inicio.js` → `js/ui/boas-vindas.js` (o assistente)
- Rename: `js/ui/painel.js` → `js/ui/inicio.js` (provisório: o Início mostra o painel antigo até a Task 8)
- Create: `js/ui/rotas.js`, `js/ui/mais.js`, `js/ui/movimento.js`
- Modify: `js/app.js`, `index.html`, `css/app.css`, `js/ui/config.js`, `sw.js`
- Test: `tests/ui/rotas.test.js`

**Interfaces:**
- Produces (`rotas.js`):
  - `TELAS = ['boas-vindas', 'inicio', 'mes', 'simular', 'mais', 'orcamento', 'historico', 'config']`;
  - `resolverRota(hash: string, temEstado: boolean) -> string`. Sem estado, devolve sempre `'boas-vindas'`. Com estado: `''`, `'#/painel'` e rotas desconhecidas dão `'inicio'`, e as rotas conhecidas dão elas mesmas. Ignora `?...` depois da rota;
  - `abaDoMenu(rota) -> 'inicio'|'mes'|'simular'|'mais'|null`. `orcamento`, `historico` e `config` dão `'mais'`, e `boas-vindas` dá `null`.
- Produces (`movimento.js`):
  - `reduzMovimento(): boolean`;
  - `escalonar(container: HTMLElement): void` define `--i` (0, 1, 2…) nos filhos diretos;
  - `contar(el: HTMLElement, alvo: number, formatar: (n: number) => string, duracaoMs = 1100): void` anima o texto de 0 até `alvo` (easing cúbico de saída). Com movimento reduzido, só escreve `formatar(alvo)`.
- Produces (CSS):
  - `.tela > *` com animação `entrar` (subir 16 px e aparecer, 520 ms, atraso `calc(var(--i,0) * 70ms)`);
  - `.menu` fixo embaixo, com 4 itens (ícone SVG de 24 px dentro de uma pílula de 56 × 30 px e o texto). O ativo tem `aria-current="page"`, cor `--destaque` e a pílula em `--destaque-suave`, com animação de entrada;
  - `.avisos` fixos no topo, por cima do conteúdo;
  - saem `.topo`, `.abas` e `.so-largo`.
- Produces (tela Mais, `mais.js` com `render(container, ctx)`): título "Mais" e três linhas-link:
  - "Orçamento" com a frase "Seu custo de vida" (`#/orcamento`);
  - "Histórico" com "Mês a mês" (`#/historico`);
  - "Ajustes" com "Premissas, conexão e backup" (`#/config`).
- Produces (menu, em `index.html`): Início `#/inicio`, Mês `#/mes`, Simular `#/simular` e Mais `#/mais`, com os ícones SVG do protótipo (casa, cartão, controles e três linhas). O menu fica escondido no assistente (`body.sem-abas`).
- Changes:
  - `app.js` usa `resolverRota`, atualiza `location.hash` quando a rota resolvida difere e marca o menu com `abaDoMenu`;
  - `app.js` chama `escalonar(tela)` depois de cada `render`;
  - `boas-vindas.js` navega para `#/inicio` onde hoje vai para `#/mes`;
  - em `config.js`, "Refazer" vai para `#/boas-vindas`;
  - `CASCA` recebe os arquivos novos e renomeados.
- O `#/simular` mostra "Esta tela ainda não está pronta." até a Task 9. Isso é esperado.

- [ ] **Step 1: Write the failing test** `tests/ui/rotas.test.js`

```js
test('rotas', () => {
  assert.equal(resolverRota('', true), 'inicio');
  assert.equal(resolverRota('#/painel', true), 'inicio');
  assert.equal(resolverRota('#/xyz', true), 'inicio');
  assert.equal(resolverRota('#/simular', true), 'simular');
  assert.equal(resolverRota('#/mes?x=1', true), 'mes');
  assert.equal(resolverRota('#/mes', false), 'boas-vindas');
  assert.equal(resolverRota('#/boas-vindas', true), 'boas-vindas');
});
test('aba do menu', () => {
  assert.equal(abaDoMenu('config'), 'mais');
  assert.equal(abaDoMenu('orcamento'), 'mais');
  assert.equal(abaDoMenu('historico'), 'mais');
  assert.equal(abaDoMenu('mes'), 'mes');
  assert.equal(abaDoMenu('boas-vindas'), null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/ui/rotas.test.js`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement** os renomeios (`git mv`), `rotas.js`, `movimento.js`, `mais.js`, o menu e as mudanças em `app.js`, `config.js`, CSS e `sw.js`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, inclusive o `sw.test.js` com os arquivos novos.

- [ ] **Step 5: Verificação visual**

Run: `node scripts/capturar-telas.mjs <scratchpad>/t7 --rotas inicio,mes,mais`
Expected: saída 0. O menu aparece embaixo com a aba certa destacada, e não há mais abas no topo.

- [ ] **Step 6: Commit**

```bash
git add -A js index.html css/app.css sw.js tests/ui/rotas.test.js
git commit -m "feat: menu inferior, rotas novas, tela Mais e movimento das telas"
```

---

### Task 8: O novo Início

**Files:**
- Modify: `js/ui/inicio.js` (reescrito por completo)
- Create: `js/ui/detalhes.js`
- Modify: `js/ui/grafico.js` (anel), `js/core/formato.js` (duração), `css/app.css`, `sw.js`
- Test: `tests/ui/grafico.test.js`, `tests/core/formato.test.js`

**Interfaces:**
- Consumes: os campos de `calcularPainel` produzidos na Task 5 e `contar`/`reduzMovimento` (Task 7).
- Produces: `formatarDuracao(meses: number|null) -> string`:
  - `null` → `'mais de 50 anos'`;
  - `0` → `'menos de 1 mês'`;
  - `1` → `'1 mês'`;
  - `12` → `'1 ano'`;
  - `255` → `'21 anos e 3 meses'`;
  - `13` → `'1 ano e 1 mês'`.
- Produces: `anel({ fracao: number }) -> string` (SVG):
  - `viewBox="0 0 260 260"`, raio 104 e traço de 18;
  - um `circle.anel-trilho` e um `circle.anel-arco` com `stroke-dasharray` igual à circunferência e `stroke-dashoffset = C × (1 − f)`;
  - `f` é limitado a [0, 1]. Um `NaN` vira 0, e um valor acima de 0 e abaixo de 0,015 vira 0,015 para ficar visível;
  - começa no topo (`rotate(-90 130 130)`).
- Produces: `renderDetalhes(p, estado) -> HTMLElement` monta o conteúdo do "Ver detalhes":
  - a lista de números (investido, reserva, as duas metas com frase, ritmo e a fonte dele, proventos, rendimento real e o necessário para o alvo `p.pmtNec`);
  - o gráfico "até a meta" com a legenda Plano / Real / Projeção no seu ritmo / Faixa: do cenário ruim ao bom;
  - o gráfico dos últimos meses e o check-up.
  - A frase do gráfico usa a premissa de verdade: "A projeção usa o seu ritmo e X% ao ano acima da inflação (o cenário normal). A faixa vai do cenário ruim (Y%) ao bom (Z%)."
- Produces (Início, na ordem da spec 5.2, com os textos exatos):
  1. Eyebrow "Sua renda plena", o anel e, no centro, "Faltam" / "{anos} anos" / "e {meses} meses" / "no seu ritmo de hoje".
     - Linhas com zero somem: só anos, ou só meses.
     - Com `faltam === null`: "mais de" / "50 anos" e o link "Veja no simulador".
     - Com a renda plena atingida (`marcos.rendaPlena.atingido`): anel cheio e "Você chegou" 🏆.
  2. Setinha (chip):
     - `delta < 0`: `▼ {formatarDuracao(−delta)} a menos que no mês passado` (verde);
     - `delta > 0`: `▲ {…} a mais que no mês passado` (tom `--atencao`);
     - `0`: `igual ao mês passado`;
     - se `!imediato`, troque "no mês passado" por `em {formatarMes(mesComparado)}`;
     - sem setinha, nada aparece.
  3. `Você já juntou R$ {abreviar(patrimonio)} de R$ {abreviar(metas.rendaPlena)}.`
  4. Cartão: eyebrow "Seus investimentos já te pagam", o valor `{formatarBRL(proventosMedios)}` e "por mês".
     - A barra vai de 0 até o salário (limitada), com a marca 🥇 `{formatarBRL(custoTotal)}` em custo ÷ salário e a 🏆 `{formatarBRL(salario)}` no fim.
     - Frase: "Em 🥇 eles pagam o seu custo de vida. Em 🏆, o seu salário inteiro."
     - Com `proventosMedios === 0`, a frase vira: "Quando seus investimentos pagarem proventos, informe na tela do Mês e eles aparecem aqui."
  5. Marcos em fila:
     - ✓ "Reserva de emergência": "conquistada" ou `faltam {formatarBRL(falta)}`;
     - 🥇 "Independência": "conquistada", "quase lá: atualize seus saldos" ou `em {formatarDuracao(projecaoM1.meses)}`;
     - 🏆 "Renda plena": "conquistada", "quase lá: atualize seus saldos" ou `{formatarMes(projecaoM2.mes)}` (ou "mais de 50 anos").
  6. `Seu alvo é {formatarMes(mesAlvo)}. No seu ritmo, a renda plena chega {formatarDuracao(|d|)} depois.`, com `d = diffMeses(mesAlvo, projecaoM2.mes)`. Se `d < 0`, troque "depois" por "antes do alvo". Se `d === 0`: "chega bem no alvo". Junto vem o link "Veja o que muda no simulador" (`#/simular`). A frase some se `projecaoM2.mes` for `null`.
  7. Cartão "Dia de pagamento?" / "Veja quanto investir este mês e onde.", com o botão "Abrir" para `#/mes`.
  8. Avisos (copiados do painel antigo): revisar o orçamento, inflação indisponível e saldos estimados.
  9. `<details class="detalhes"><summary>Ver detalhes</summary>`, com `renderDetalhes`.
- Animações:
  - o arco do anel enche (keyframes de `stroke-dashoffset` a partir da circunferência) e a barra cresce;
  - `contar` no valor de "já te pagam";
  - o chip da setinha "salta" (escala de 0,5 a 1, com atraso de 650 ms).

- [ ] **Step 1: Write the failing tests**

```js
// tests/ui/grafico.test.js
test('anel: sem NaN e limitado entre 0 e 1', () => {
  for (const f of [NaN, -1, 0, 0.001, 0.25, 1, 3]) {
    const s = anel({ fracao: f });
    assert.ok(s.startsWith('<svg') && !s.includes('NaN'));
  }
  assert.match(anel({ fracao: 1 }), /stroke-dashoffset="0"/);
});
// tests/core/formato.test.js
test('formatarDuracao', () => {
  assert.equal(formatarDuracao(null), 'mais de 50 anos');
  assert.equal(formatarDuracao(0), 'menos de 1 mês');
  assert.equal(formatarDuracao(1), '1 mês');
  assert.equal(formatarDuracao(12), '1 ano');
  assert.equal(formatarDuracao(13), '1 ano e 1 mês');
  assert.equal(formatarDuracao(255), '21 anos e 3 meses');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/ui/grafico.test.js tests/core/formato.test.js`
Expected: FAIL (`anel` e `formatarDuracao` não exportados).

- [ ] **Step 3: Implement** `anel`, `formatarDuracao`, `detalhes.js`, o novo `inicio.js`, o CSS do Início e o `detalhes.js` em `CASCA`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verificação visual**

- Run: `node scripts/capturar-telas.mjs <scratchpad>/t8 --rotas inicio`
- Repita com `--reduzir`.
- Expected: saída 0. Compare com `#d-inicio` do protótipo:
  - anel com "Faltam … anos";
  - setinha;
  - cartão de proventos com a barra e as duas marcas;
  - três marcos;
  - frase do alvo;
  - "Ver detalhes" fechado;
  - no escuro, nada ilegível.

- [ ] **Step 6: Commit**

```bash
git add js css/app.css sw.js tests
git commit -m "feat: novo Início (anel, setinha, já te pagam, marcos e detalhes)"
```

---

### Task 9: A tela Simular

**Files:**
- Create: `js/ui/simular.js`
- Modify: `css/app.css`, `sw.js`

**Interfaces:**
- Consumes:
  - `calcularPainel(...).baseSimulador` (Task 5);
  - `simular` e `moverAlavanca` (Task 3);
  - `formatarDuracao` (Task 8).
- Produces: `render(container, ctx)`. O estado das alavancas nasce de `baseSimulador` a cada `render` e nunca é salvo. Ao arrastar, só o resultado é redesenhado, e o controle mantém o foco.
- Controles (`<input type="range">`, valor em R$ ao lado):
  - "Quanto invisto por mês" (passo 50);
  - "Meu salário líquido" (passo 100);
  - "Meu custo de vida" (passo 100);
  - mínimo 0 em todos; o máximo é o maior entre o padrão (15.000, 30.000 e 20.000) e o dobro do valor real, arredondado ao passo.
- Textos exatos:
  - Título "E se…?" e o subtítulo "Mexa à vontade: nada aqui muda os seus dados."
  - Cartão com o eyebrow "Para chegar no seu alvo":
    - `antes`: "Você chega antes do alvo" / `No cenário normal, a renda plena chega em {mes normal}, antes de {alvo}.`
    - `cabe`: `Invista {R$ necessario} por mês` / `para chegar à renda plena em {alvo}, no cenário normal. São {R$ aMais} a mais do que agora.`
    - `nao-fecha`: `Seriam {R$ necessario} por mês` / `para chegar à renda plena em {alvo}, no cenário normal. É mais do que você consegue investir hoje ({R$ consegue}), então até {alvo} não fecha.`
    - `passou`: "Seu alvo já passou" / "Veja quanto seria para os próximos prazos:"
    - Sempre no fim do cartão: "Com mais prazo:" e duas pílulas `{formatarMes(mes)}: {R$ necessario}/mês`.
  - Dica abaixo dos controles: `O quanto você consegue investir hoje: {R$ consegue}.` Com `investeMaisQueConsegue`, ela vira, em tom de alerta: `Você está investindo mais do que consegue hoje ({R$ consegue}).`
  - Botão "Voltar aos meus números".
  - Eyebrow "Quanto falta em cada cenário" e uma grade 2 × 2:
    - carinha, nome e `{taxa em %} ao ano`;
    - tempo (`{anos} anos` / `e {meses} meses`, ou "mais de 50 anos");
    - `chega em {formatarMes}`;
    - a diferença para os números reais do mesmo cenário (`▼ {duração} a menos` em verde ou `▲ {duração} a mais` em tom de alerta), só quando for diferente;
    - o Normal com borda de destaque e a cor de cada cartão em `--c-{id}`.
  - Nota: "As porcentagens são quanto o dinheiro rende por ano acima da inflação."

- [ ] **Step 1: Implement** `simular.js` e o CSS (cartões 2 × 2 com a borda superior na cor do cenário, controles e pílulas), e coloque `simular.js` em `CASCA`.

- [ ] **Step 2: Run the whole suite**

Run: `npm test`
Expected: PASS (o `sw.test.js` confere o cache).

- [ ] **Step 3: Verificação visual**

Run: `node scripts/capturar-telas.mjs <scratchpad>/t9 --rotas simular`
Expected: saída 0. Com a amostra aparecem:
- o cartão "Seriam R$ … por mês", o caso "não fecha" da amostra;
- os três controles;
- os 4 cartões, com o Normal destacado;
- tudo legível nos dois temas.

- [ ] **Step 4: Commit**

```bash
git add js/ui/simular.js css/app.css sw.js
git commit -m "feat: tela Simular com alavancas e quatro cenários"
```

---

### Task 10: Comemoração dos marcos

**Files:**
- Create: `js/ui/festa.js`
- Modify: `js/ui/inicio.js`, `js/app.js`, `css/app.css`, `sw.js`

**Interfaces:**
- Consumes:
  - `p.marcos.aComemorar` (Task 5);
  - `registrarComemoracao` (Task 4);
  - `reduzMovimento` (Task 7).
- Produces: `comemorar(ids: string[]): Promise<void>`. Mostra um cartão por marco, em sequência; "Continuar" ou Esc passa para o próximo, e a promessa resolve quando o último fecha. Textos exatos:
  - eyebrow "Marco conquistado" e botão "Continuar";
  - `reserva`: 🛡️ "Reserva de emergência completa!" / "Você tem 6 meses do seu custo de vida guardados. Um imprevisto já não derruba o seu plano.";
  - `independencia`: 🥇 "Independência conquistada!" / "Seus investimentos já conseguem pagar o seu custo de vida. Daqui em diante, trabalhar vira uma escolha.";
  - `rendaPlena`: 🏆 "Renda plena! Você chegou." / "Seus investimentos pagam o equivalente ao seu salário inteiro.".
- Visual e movimento:
  - fundo escurecido (`rgba(6,10,22,.6)`);
  - o cartão entra com um salto (escala de 0,7 para 1) e o ícone gira e cresce;
  - confete em `<canvas>` (cerca de 150 peças, ~2,8 s, cores lidas de `--destaque`, `--ouro`, `--ok`, `--c-ruim` e `--c-moderado`);
  - com movimento reduzido, só o cartão, sem confete e sem keyframes;
  - foco no botão e `role="dialog"` com `aria-modal="true"`.
- Changes (`app.js`): o contexto ganha `sincronizado: boolean`. Ele é `true` quando não há conexão com o GitHub ou depois que `sincronizarAoAbrir()` termina. Ao virar `true`, a tela é redesenhada se a rota for `inicio`.
- Changes (`inicio.js`): quando `ctx.sincronizado && p.marcos.aComemorar.length`:
  1. primeiro `await ctx.salvar((e) => registrarComemoracao(e, ids, ctx.hoje))`, para gravar antes de mostrar e evitar repetição se o app fechar no meio;
  2. depois `comemorar(ids)`.

  Esperar a sincronização evita comemorar duas vezes quando o outro aparelho já comemorou.

- [ ] **Step 1: Implement** `festa.js`, o CSS da comemoração, a integração no Início e em `app.js`, e `festa.js` em `CASCA`.

- [ ] **Step 2: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Verificação visual**

- Run: `node scripts/capturar-telas.mjs <scratchpad>/t10 --rotas inicio --festa`
- Repita com `--festa --reduzir`.
- Expected: saída 0 e o cartão "Reserva de emergência completa!" por cima do Início. Com movimento normal há confete na captura; com `--reduzir`, não há.

- [ ] **Step 4: Commit**

```bash
git add js css/app.css sw.js
git commit -m "feat: comemoração dos marcos, uma vez só e depois da sincronização"
```

---

### Task 11: Textos das outras telas, assistente e limpeza

**Files:**
- Modify:
  - `js/ui/mes.js`, `js/ui/config.js` e `js/ui/boas-vindas.js` (textos e o último passo do assistente);
  - `js/core/motor.js` e `js/core/projecao.js` (remover o que ficou sem uso);
  - `README.md`.
- Test: `tests/core/motor.test.js`, `tests/core/projecao.test.js`

**Interfaces:**
- Changes:
  - `calcularPainel` deixa de devolver `status`, `acao`, `faixa` e `rendaNoPrazo`;
  - `projecao.js` deixa de exportar `classificarStatus`, `acaoSugerida` e `faixaProjecao`;
  - os testes deles saem, e o teste "painel sem histórico" perde a linha do `status`;
  - `motor.js` deixa de importar o que saiu.
- **Mês:** o bloco da barra "Independência: X% do caminho · alvo …" é trocado pela linha `Faltam {formatarDuracao(faltam)} para a renda plena.`. Se `faltam === null`, o texto é "No ritmo de hoje, a renda plena fica a mais de 50 anos.".
- **Ajustes:** a dica da rentabilidade passa a ser: "Quanto a carteira rende por ano acima da inflação. É o cenário normal do simulador; o ruim e o moderado ficam 2 e 1 pontos abaixo, e o bom 2 pontos acima."
- **Assistente, passo "Seu plano"**, com o mesmo título e subtítulo:
  - Cartões:
    - "🏆 Renda plena (sua meta)", com `formatarBRL(metas.rendaPlena)` e a frase `Patrimônio que paga {R$ salario}/mês, o seu salário.`;
    - "🥇 Independência (um marco no caminho)", com `formatarBRL(metas.independencia)` e `Paga o seu custo de vida de {R$ custoTotal}/mês.`;
    - "Quanto sobra para investir", com `{R$ ritmo.valor}/mês`.
  - Conclusão, sempre `aviso('info', …)` e nunca alerta:
    - com `faltam` definido: `No seu ritmo, faltam {formatarDuracao(faltam)} para a renda plena ({formatarMes(projecaoM2.mes)}). Seu alvo é {formatarMes(mesAlvo)}: no simulador você vê o que muda se investir mais.`;
    - sem data: `No ritmo de hoje, a renda plena fica a mais de 50 anos. No simulador você vê quanto seria preciso investir.`.
  - O aviso da reserva continua.
  - "Começar" salva e vai para `#/inicio`.
- **README:** os bullets da descrição passam a falar do Início ("quanto falta para a renda plena"), do Simulador com 4 cenários e do menu de 4 botões. A seção de privacidade não muda.

- [ ] **Step 1: Remova os testes** de `classificarStatus`, `acaoSugerida` e `faixaProjecao`, e a linha do `status` em "painel sem histórico".

- [ ] **Step 2: Implement** as remoções no núcleo e os textos novos.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: PASS. `grep -rn "classificarStatus\|acaoSugerida\|faixaProjecao\|rendaNoPrazo\|Independência:" js` não acha nada.

- [ ] **Step 4: Verificação visual**

- Run: `node scripts/capturar-telas.mjs <scratchpad>/t11 --rotas mes,config,orcamento,historico,mais`
- Capture também o assistente: `node scripts/capturar-telas.mjs <scratchpad>/t11b --rotas boas-vindas --sem-dados`.
- Expected: saída 0, a linha "Faltam … para a renda plena" no Mês, e nenhum texto falando da Independência como meta.

- [ ] **Step 5: Commit**

```bash
git add -A js tests README.md scripts
git commit -m "feat: textos da renda plena nas outras telas e no assistente; remove status e faixa antigos"
```
