# Projeto R v1 — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o planejador de aposentadoria pessoal (PWA em GitHub Pages) que, a partir do salário líquido do mês, diz quanto investir e onde, e mostra se o usuário está no caminho da meta.

**Architecture:** Toda a lógica financeira vive em módulos ES puros em `js/core/` (sem DOM), testados com `node:test`. A camada `js/dados/` sincroniza um único `dados.json` num repositório privado via GitHub Contents API, com cópia local em `localStorage`. A interface em `js/ui/` é HTML/CSS/JS puro, renderizado por um roteador por hash, e consome só o `motor.js`.

**Tech Stack:** HTML, CSS e JavaScript (ES modules), sem build e sem dependências em tempo de execução; Node.js LTS apenas para testes (`node --test`); GitHub Pages; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-09-planejador-aposentadoria-design.md` (leia junto com este plano; as seções citadas como §x.y são de lá).

## Global Constraints

- Nenhum dado pessoal do usuário (idade, salário, patrimônio, carteira, nome, e-mail) em código, testes, fixtures, documentos ou commits do repositório público. Fixtures usam valores fictícios.
- Sem framework, sem build, sem dependências de runtime (`package.json` sem `dependencies`); gráficos em SVG feito à mão.
- ES modules em todo lugar; `js/core/` e `js/dados/` não tocam no DOM nem em `window` (recebem `fetch`/`Storage` por parâmetro).
- Textos da interface em pt-BR, simples e sem jargão; valores no formato `R$ 1.234,56`; meses exibidos como `nov/2026`.
- Interface mobile-first, tema claro/escuro por `prefers-color-scheme` (com override `data-tema` só para verificação).
- O app **nunca** sugere vender investimentos.
- Os tickers sugeridos aparecem sempre com o aviso "Os investimentos sugeridos são exemplos, não uma recomendação profissional."
- Premissas padrão: SWR `0.04`, rentabilidade real `0.05`, faixa `±0.02`, prazo `120` meses, alvo da reserva `6 × custo de vida`, teto da caixa `6 × excedente médio`, queda `≤ −10%` do pico, aviso de saldos após `35` dias, revisão do orçamento a cada `6` meses.
- Carteira-alvo padrão: `rendaFixa 0.40` (Tesouro IPCA+ com Juros Semestrais), `fiis 0.25` (XFIX11), `acoes 0.25` (DIVO11), `exterior 0.10` (IVVB11).
- Meses são strings `'YYYY-MM'`; dinheiro é `number` em reais (não centavos), arredondado só na exibição; testes comparam com tolerância via `perto()`.
- Trabalhar no branch `feat/planejador-v1`. Mensagens de commit em português, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comandos: `npm test` roda tudo; `node --test tests/core/x.test.js` roda um arquivo.

## Review Focus

1. **Valores digitados em formatos variados** ("7.800", "7800,5", "R$ 7.800,00", vazio, letras, negativo): devem virar número ou `null`, e a tela nunca mostra `NaN`. → teste na Task 1 (`parseBRL`).
2. **Começar do zero** (patrimônio 0, nenhum investimento, nenhum histórico): nada pode dividir por zero (preço implícito sem cotas, índice com saldo anterior 0, distribuição com carteira vazia). → testes nas Tasks 6, 8 e 11.
3. **Meta inalcançável** (aporte 0 ou muito baixo): projeções devolvem `null` ("não alcançada nesse ritmo") em vez de laço infinito, e o status vira `atrasado`. → testes nas Tasks 2 e 9.
4. **Token inválido, expirado, sem permissão ou repositório inexistente** (401/403/404): mensagem clara e os dados locais preservados. → testes na Task 12.
5. **IPCA indisponível ou com meses faltando** (API fora, mês ainda não divulgado): o app segue funcionando com o que tem, e avisa. → testes nas Tasks 3 e 11.

---

## Estrutura de arquivos

```
index.html · manifest.webmanifest · sw.js · package.json · .gitignore · README.md
css/app.css
icones/                     icone-192.png, icone-512.png, icone-maskable-512.png
js/app.js                   boot, roteador por hash, contexto compartilhado
js/core/meses.js            aritmética de meses e ciclo anual
js/core/formato.js          formatar/parsear BRL e percentuais
js/core/financas.js         taxa mensal, valor futuro, PMT, meses até a meta, trajetória
js/core/ipca.js             série do IPCA, fator acumulado, reais de hoje
js/core/metas.js            custo de vida, metas, provisão, categorias sugeridas
js/core/protecao.js         ordem de proteção (§4.5)
js/core/aporte.js           reserva / carteira / caixa (§4.6)
js/core/desempenho.js       saldos estimados (§4.8), índice e queda (§4.6)
js/core/alocacao.js         carteira padrão, distribuição, sugestão por ativo, "por quê" (§4.7)
js/core/projecao.js         ritmo, projeções, faixa, status, proventos, impacto (§4.9, §4.11)
js/core/checkup.js          regras do check-up (§4.10)
js/core/esquema.js          formato do estado, estado inicial, migração
js/core/motor.js            orquestra: calcularMes, registrarAplicacao, calcularPainel
js/dados/github.js          cliente da Contents API
js/dados/armazem.js         cache local + sincronização + conflito + offline
js/dados/ipca-remoto.js     busca da série no Banco Central
js/ui/dom.js                h(), campo de moeda, utilitários de tela
js/ui/grafico.js            SVG dos gráficos (função pura)
js/ui/inicio.js · mes.js · painel.js · orcamento.js · historico.js · config.js
scripts/servidor.mjs        servidor estático de desenvolvimento
scripts/gerar-icones.ps1    gera os PNGs dos ícones
tests/ajuda.js · tests/core/*.test.js · tests/dados/*.test.js · tests/ui/grafico.test.js
.github/workflows/testes.yml
```

Valores de referência usados nos testes (taxa real de 5% a.a.): `i5 = 0.0040741237836483535`, `i3 = 0.0024662697723036864`, `i7 = 0.0056541453874052738`, `i8 = 0.00643403011000343`.

---

### Task 1: Ambiente, executor de testes, meses e formato

**Files:**
- Delete: `index.html` (o antigo)
- Create: `package.json`, `.gitignore`, `scripts/servidor.mjs`, `.github/workflows/testes.yml`, `tests/ajuda.js`, `js/core/meses.js`, `js/core/formato.js`
- Test: `tests/core/meses.test.js`, `tests/core/formato.test.js`

**Interfaces:**
- Produces:
  - `tests/ajuda.js`: `perto(atual: number, esperado: number, tol = 0.01): void` (falha com mensagem mostrando os dois valores)
  - `meses.js`: `somarMeses(mes: string, n: number): string`, `diffMeses(de: string, ate: string): number` (= ate − de), `mesDe(data: Date): string`, `dataISO(data: Date): string` (`'YYYY-MM-DD'`, data local), `diasEntre(de: string, ate: string): number` (datas `'YYYY-MM-DD'`), `formatarMes(mes: string): string`, `cicloAnual(mes: string): string`
  - `formato.js`: `formatarBRL(valor: number): string`, `parseBRL(texto: string): number|null`, `formatarPct(fracao: number, casas = 1): string`

- [ ] **Step 1: Preparar o ambiente**

Run: `git checkout -b feat/planejador-v1` e `winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements`. Abra um shell novo (o PATH muda) e rode `node --version`.
Expected: versão `v22.x` ou maior.

- [ ] **Step 2: Criar o esqueleto**

`package.json`: `{"name":"projeto-r","private":true,"type":"module","scripts":{"test":"node --test","servir":"node scripts/servidor.mjs"}}`. `.gitignore`: `node_modules/`, `.superpowers/`. `scripts/servidor.mjs`: servidor `node:http` na porta 8080 servindo a raiz do repositório, com MIME para `.html .js .css .json .webmanifest(application/manifest+json) .svg .png`, e `index.html` em `/`. `.github/workflows/testes.yml`: em `push` e `pull_request`, `actions/checkout@v4`, `actions/setup-node@v4` com `node-version: lts/*`, `npm test`. Remova o `index.html` antigo com `git rm index.html`.

- [ ] **Step 3: Escrever os testes que falham**

```js
// tests/core/meses.test.js
test('somarMeses atravessa o ano', () => { assert.equal(somarMeses('2026-11', 3), '2027-02'); assert.equal(somarMeses('2027-07', 122), '2037-09'); assert.equal(somarMeses('2027-01', -1), '2026-12'); });
test('diffMeses', () => { assert.equal(diffMeses('2026-11', '2036-11'), 120); assert.equal(diffMeses('2027-03', '2027-01'), -2); });
test('formatarMes', () => { assert.equal(formatarMes('2026-11'), 'nov/2026'); assert.equal(formatarMes('2037-02'), 'fev/2037'); });
test('cicloAnual vai de novembro a outubro', () => { assert.equal(cicloAnual('2026-11'), '2026'); assert.equal(cicloAnual('2027-10'), '2026'); assert.equal(cicloAnual('2027-11'), '2027'); });
test('mesDe e dataISO', () => { assert.equal(mesDe(new Date(2026, 10, 10)), '2026-11'); assert.equal(dataISO(new Date(2026, 10, 5)), '2026-11-05'); });
test('diasEntre', () => { assert.equal(diasEntre('2026-11-10', '2026-12-15'), 35); assert.equal(diasEntre('2026-11-10', '2026-11-10'), 0); });

// tests/core/formato.test.js
test('formatarBRL', () => { assert.equal(formatarBRL(1234.56), 'R$ 1.234,56'); assert.equal(formatarBRL(0), 'R$ 0,00'); assert.equal(formatarBRL(-5), '-R$ 5,00'); });
test('parseBRL aceita formatos brasileiros', () => {
  assert.equal(parseBRL('R$ 7.800,00'), 7800); assert.equal(parseBRL('7.800'), 7800); assert.equal(parseBRL('7800,5'), 7800.5);
  assert.equal(parseBRL('7800.5'), 7800.5); assert.equal(parseBRL('1.234.567'), 1234567); assert.equal(parseBRL('0'), 0);
});
test('parseBRL rejeita entradas inválidas', () => { for (const t of ['', '   ', 'abc', '-50', '1,2,3']) assert.equal(parseBRL(t), null); });
test('formatarPct', () => { assert.equal(formatarPct(0.0643), '6,4%'); assert.equal(formatarPct(0.25, 0), '25%'); });
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (módulos não encontrados).

- [ ] **Step 5: Implementar `meses.js` e `formato.js`**

`formatarBRL` usa `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` e troca ` ` por espaço comum. Regras do `parseBRL`: remover `R$` e espaços; vazio, sinal de menos ou caracteres que não sejam dígitos, `.` e `,` → `null`; com vírgula, os pontos são milhar e a única vírgula é decimal (mais de uma vírgula → `null`); sem vírgula, um ponto seguido de exatamente 3 dígitos em cada grupo é milhar, senão um único ponto é decimal.

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: PASS em todos.

- [ ] **Step 7: Commit**

`git add -A && git commit` com a mensagem `chore: ambiente de testes, meses e formato`.

---

### Task 2: Matemática financeira e trajetória

**Files:**
- Create: `js/core/financas.js`
- Test: `tests/core/financas.test.js`

**Interfaces:**
- Produces:
  - `taxaMensal(rAnual: number): number` = `(1 + r)^(1/12) − 1`
  - `crescer(valor: number, i: number, meses: number): number`
  - `valorFuturo({p, aporte, i, meses}): number` (aporte no fim de cada mês; `i = 0` → `p + aporte·meses`)
  - `pmtNecessario({p, meta, i, meses}): number` (≥ 0; `0` se já alcança só com juros; `Infinity` se `meses ≤ 0` e `p < meta`)
  - `mesesAteMeta({p, aporte, i, meta, max = 600}): number|null` (`0` se `p ≥ meta`; `null` se não alcança em `max`)
  - `pmtInicial({p0, meta, i, prazo}): number`, `patrimonioPlanejado({p0, meta, i, prazo, t}): number` (§4.6)

- [ ] **Step 1: Escrever os testes que falham**

```js
test('taxaMensal', () => { perto(taxaMensal(0.05), 0.0040741237836, 1e-12); perto(taxaMensal(0.08), 0.00643403011, 1e-10); });
test('valorFuturo', () => { perto(valorFuturo({p:128400, aporte:9200, i:i5, meses:112}), 1504879.41); assert.equal(valorFuturo({p:100, aporte:10, i:0, meses:5}), 150); });
test('pmtNecessario', () => {
  perto(pmtNecessario({p:128400, meta:1650000, i:i5, meses:112}), 10225.10);
  assert.equal(pmtNecessario({p:2000000, meta:1650000, i:i5, meses:12}), 0);
  assert.equal(pmtNecessario({p:1000, meta:1650000, i:i5, meses:0}), Infinity);
});
test('mesesAteMeta', () => {
  assert.equal(mesesAteMeta({p:128400, aporte:9200, i:i5, meta:1650000}), 122);
  assert.equal(mesesAteMeta({p:128400, aporte:9200, i:i3, meta:1650000}), 135);
  assert.equal(mesesAteMeta({p:128400, aporte:9200, i:i7, meta:1650000}), 111);
  assert.equal(mesesAteMeta({p:128400, aporte:9200, i:i5, meta:4500000}), 257);
  assert.equal(mesesAteMeta({p:1650000, aporte:0, i:i5, meta:1650000}), 0);
  assert.equal(mesesAteMeta({p:0, aporte:0, i:i5, meta:1650000}), null);
});
test('trajetória planejada', () => {
  perto(pmtInicial({p0:50000, meta:1650000, i:i5, prazo:120}), 10161.46);
  perto(patrimonioPlanejado({p0:50000, meta:1650000, i:i5, prazo:120, t:8}), 134113.43);
  perto(patrimonioPlanejado({p0:50000, meta:1650000, i:i5, prazo:120, t:120}), 1650000);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/core/financas.test.js` → FAIL.
- [ ] **Step 3: Implementar `js/core/financas.js`** — `mesesAteMeta` simula mês a mês (`v = v·(1+i) + aporte`) até `max`, para não depender de logaritmo com aporte zero.
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: matemática financeira e trajetória`.

---

### Task 3: IPCA e reais de hoje

**Files:**
- Create: `js/core/ipca.js`
- Test: `tests/core/ipca.test.js`

**Interfaces:**
- Produces:
  - `parseSerieSgs(json: Array<{data: 'DD/MM/YYYY', valor: string}>): Record<string, number>` (chave `'YYYY-MM'`, valor em fração: `"0.82"` → `0.0082`)
  - `ultimoMes(serie): string|null`
  - `fatorInflacao(serie, de: string, ate: string): number` (produto de `1 + serie[m]` para `m` em `(de, ate]`; mês sem dado conta como 0)
  - `mesesFaltando(serie, de, ate): string[]`
  - `paraReaisDeHoje(valor: number, mesDoValor: string, serie): number` (corrige até `ultimoMes(serie)`; série vazia → valor inalterado)

- [ ] **Step 1: Escrever os testes que falham**

```js
const amostra = [{data:'01/07/2026', valor:'0.07'}, {data:'01/08/2026', valor:'-0.32'}, {data:'01/09/2026', valor:'0.82'}];
test('parseSerieSgs', () => { const s = parseSerieSgs(amostra); perto(s['2026-08'], -0.0032, 1e-12); assert.equal(ultimoMes(s), '2026-09'); });
test('fatorInflacao', () => { const s = parseSerieSgs(amostra); perto(fatorInflacao(s, '2026-06', '2026-09'), 1.005677241632, 1e-9); assert.equal(fatorInflacao(s, '2026-09', '2026-09'), 1); });
test('paraReaisDeHoje', () => { const s = parseSerieSgs(amostra); perto(paraReaisDeHoje(1000, '2026-06', s), 1005.68); assert.equal(paraReaisDeHoje(1000, '2026-06', {}), 1000); });
test('mês sem dado não quebra e é listado', () => {
  const s = {'2026-07': 0.01, '2026-09': 0.01};
  perto(fatorInflacao(s, '2026-06', '2026-09'), 1.0201, 1e-9); assert.deepEqual(mesesFaltando(s, '2026-06', '2026-09'), ['2026-08']);
});
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/ipca.js`** (usa `somarMeses`/`diffMeses` da Task 1).
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: série do IPCA e conversão para reais de hoje`.

---

### Task 4: Custo de vida, metas e provisão anual

**Files:**
- Create: `js/core/metas.js`
- Test: `tests/core/metas.test.js`

**Interfaces:**
- Produces:
  - `custoDeVida(orcamento: Array<{tipo: 'mensal'|'anual', valor: number}>): {mensal, anual, total}` (`total = mensal + anual/12`)
  - `calcularMetas({custoTotal, salario, swr}): {independencia, rendaPlena}` (`× 12 / swr`)
  - `provisaoMensal({anual, salario, recebe13, recebeFerias}): number` (`max(0, (anual − extrasEsperados)/12)`, com `extrasEsperados = (recebe13 ? salario : 0) + (recebeFerias ? salario/3 : 0)`)
  - `rendaDoPatrimonio(patrimonio: number, swr: number): number` (`patrimonio · swr / 12`)
  - `CATEGORIAS_SUGERIDAS: Array<{id, nome, tipo}>`: a lista da §4.11 (mensais: moradia, condomínio, contas da casa, mercado, transporte, saúde/plano, educação, assinaturas, cuidados pessoais, lazer, pets, presentes; anuais: IPVA, IPTU, seguros, material escolar, viagem)
  - `precisaRevisarOrcamento(ultimaRevisao: string|null, mesAtual: string): boolean` (`diffMeses ≥ 6`; `null` → `false`)

- [ ] **Step 1: Escrever os testes que falham**

```js
test('custoDeVida inclui anuais/12', () => assert.deepEqual(custoDeVida([{tipo:'mensal', valor:5000}, {tipo:'anual', valor:6000}]), {mensal:5000, anual:6000, total:5500}));
test('metas', () => assert.deepEqual(calcularMetas({custoTotal:5500, salario:7800, swr:0.04}), {independencia:1650000, rendaPlena:2340000}));
test('provisão', () => {
  assert.equal(provisaoMensal({anual:6000, salario:7800, recebe13:true, recebeFerias:true}), 0);
  perto(provisaoMensal({anual:12000, salario:3000, recebe13:true, recebeFerias:true}), 666.67);
  assert.equal(provisaoMensal({anual:12000, salario:3000, recebe13:false, recebeFerias:false}), 1000);
});
test('renda do patrimônio', () => perto(rendaDoPatrimonio(1504879.41, 0.04), 5016.26));
test('revisão a cada 6 meses', () => { assert.equal(precisaRevisarOrcamento('2026-11', '2027-05'), true); assert.equal(precisaRevisarOrcamento('2026-11', '2027-04'), false); assert.equal(precisaRevisarOrcamento(null, '2027-05'), false); });
test('categorias sugeridas têm mensais e anuais', () => { assert.ok(CATEGORIAS_SUGERIDAS.some(c => c.nome === 'IPVA' && c.tipo === 'anual')); assert.ok(CATEGORIAS_SUGERIDAS.some(c => c.nome === 'Mercado' && c.tipo === 'mensal')); });
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/metas.js`.**
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: custo de vida, metas e provisão anual`.

---

### Task 5: Ordem de proteção do valor recebido (§4.5)

**Files:**
- Create: `js/core/protecao.js`
- Test: `tests/core/protecao.test.js`

**Interfaces:**
- Consumes: `cicloAnual` (Task 1).
- Produces:
  - `TIPOS_EXTRA = ['decimo-terceiro', 'ferias', 'plr', 'outro']`
  - `perguntarExtra({recebidoEfetivo, salario}): boolean` (`> salario × 1.10`)
  - `calcularExcedente({recebido, pendenteDoMesAnterior = 0, salario, custoMensal, provisao, tipoExtra = null, anuaisFaltando}): {recebidoEfetivo, semAporte, motivo: 'custo-de-vida'|'sem-sobra'|null, excedente, paraAnuais, guardarParaProximoMes, paraDiaADia}`
  - `anuaisFaltando({anual, contadores: Record<string, number>, mes}): number`
  - `somarAoCiclo(contadores, mes, valor): Record<string, number>` (novo objeto)
  - `alvoReserva(custoTotal: number): number` (`6 × custoTotal`)

Algoritmo de `calcularExcedente` (decide o que a spec deixa implícito):
1. `R = recebido + pendenteDoMesAnterior`; `base = min(R, salario)`; `E = max(0, R − salario)`.
2. Em `tipoExtra === 'ferias'`: `guardarParaProximoMes = 3E/4` e `E = E/4`. A aproximação é: o excedente das férias é salário de 30 dias + 1/3, então o 1/3 é `E/4`.
3. Se `R − guardar ≤ custoMensal` → `semAporte`, motivo `'custo-de-vida'`, `excedente 0`, `paraAnuais 0`.
4. `paraAnuais = min(E, anuaisFaltando)`; `excedente = base − custoMensal − provisao + (E − paraAnuais)`; se `≤ 0` → `semAporte`, motivo `'sem-sobra'`, `excedente 0`.
5. `paraDiaADia = R − guardar − excedente − paraAnuais`.

- [ ] **Step 1: Escrever os testes que falham**

```js
const base = {salario:7800, custoMensal:5000, provisao:0, anuaisFaltando:0};
test('mês normal', () => { const r = calcularExcedente({...base, recebido:7800}); assert.equal(r.excedente, 2800); assert.equal(r.paraDiaADia, 5000); assert.equal(r.semAporte, false); });
test('recebeu menos que o custo de vida', () => { const r = calcularExcedente({...base, recebido:4000}); assert.equal(r.semAporte, true); assert.equal(r.motivo, 'custo-de-vida'); assert.equal(r.excedente, 0); });
test('13º cobre as anuais primeiro', () => { const r = calcularExcedente({...base, recebido:15600, tipoExtra:'decimo-terceiro', anuaisFaltando:6000}); assert.equal(r.paraAnuais, 6000); assert.equal(r.excedente, 4600); });
test('férias: só 1/3 é extra, o resto fica para o mês seguinte', () => { const r = calcularExcedente({...base, recebido:18200, tipoExtra:'ferias'}); assert.equal(r.guardarParaProximoMes, 7800); assert.equal(r.excedente, 5400); });
test('mês depois das férias usa o valor guardado', () => { const r = calcularExcedente({...base, recebido:0, pendenteDoMesAnterior:7800}); assert.equal(r.excedente, 2800); assert.equal(r.semAporte, false); });
test('provisão mensal sai do excedente', () => perto(calcularExcedente({...base, recebido:7800, provisao:666.67}).excedente, 2133.33));
test('sem sobra', () => { const r = calcularExcedente({...base, recebido:5500, provisao:600}); assert.equal(r.semAporte, true); assert.equal(r.motivo, 'sem-sobra'); });
test('perguntarExtra', () => { assert.equal(perguntarExtra({recebidoEfetivo:8580, salario:7800}), false); assert.equal(perguntarExtra({recebidoEfetivo:8581, salario:7800}), true); });
test('ciclo anual', () => {
  const c = somarAoCiclo({}, '2026-12', 2000);
  assert.equal(anuaisFaltando({anual:6000, contadores:c, mes:'2027-03'}), 4000);
  assert.equal(anuaisFaltando({anual:6000, contadores:c, mes:'2027-11'}), 6000);
});
test('alvo da reserva', () => assert.equal(alvoReserva(5500), 33000));
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/protecao.js`** conforme o algoritmo acima.
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: ordem de proteção do valor recebido`.

---

### Task 6: Saldos estimados, índice de desempenho e queda

**Files:**
- Create: `js/core/desempenho.js`
- Test: `tests/core/desempenho.test.js`

**Interfaces:**
- Consumes: `diffMeses` (Task 1), `crescer` (Task 2), `fatorInflacao` (Task 3).
- Produces:
  - `estimarSaldo({ultimoSaldo: {valor, mes}, aportesDepois: Array<{mes, valor}>, mesAtual, i}): {valor, estimado: boolean}`. Cresce o último saldo e cada aporte pela premissa até `mesAtual`; `estimado = diffMeses(ultimoSaldo.mes, mesAtual) > 0`.
  - `indiceDesempenho(pontos: Array<{mes, valor, aportesDesdeAnterior}>, serieIpca): Array<{mes, indice}>`. `pontos` são só os meses com saldos realmente atualizados (soma da carteira, sem a caixa). Começa em `1`. Entre `a` e `b`: `r = (V_b − aportes) / V_a − 1`, deflacionado por `fatorInflacao(serie, a.mes, b.mes)`. Se `V_a = 0`, o índice repete.
  - `situacaoQueda(indices): {emQueda: boolean, mesInicio: string|null, quedaPct: number}`. Pico = máximo até o último ponto; `quedaPct = último/pico − 1`; `emQueda = quedaPct ≤ −0.10`; `mesInicio` = primeiro mês depois do pico em que a queda chegou a `≤ −0.10`.

- [ ] **Step 1: Escrever os testes que falham**

```js
test('estimarSaldo cresce pela premissa', () => {
  const r = estimarSaldo({ultimoSaldo:{valor:10000, mes:'2026-11'}, aportesDepois:[{mes:'2026-12', valor:1000}], mesAtual:'2027-01', i:i5});
  perto(r.valor, 11085.72); assert.equal(r.estimado, true);
  assert.equal(estimarSaldo({ultimoSaldo:{valor:500, mes:'2027-01'}, aportesDepois:[], mesAtual:'2027-01', i:i5}).estimado, false);
});
test('índice ignora aportes', () => assert.deepEqual(indiceDesempenho([{mes:'2026-11', valor:10000, aportesDesdeAnterior:0}, {mes:'2026-12', valor:12000, aportesDesdeAnterior:2000}], {}).map(p => p.indice), [1, 1]));
test('índice com saldo anterior zero não divide por zero', () => assert.deepEqual(indiceDesempenho([{mes:'2026-11', valor:0, aportesDesdeAnterior:0}, {mes:'2026-12', valor:1000, aportesDesdeAnterior:1000}], {}).map(p => p.indice), [1, 1]));
test('índice é real (desconta IPCA)', () => perto(indiceDesempenho([{mes:'2026-11', valor:10000, aportesDesdeAnterior:0}, {mes:'2026-12', valor:10100, aportesDesdeAnterior:0}], {'2026-12':0.01})[1].indice, 1, 1e-9));
test('queda de 10% do pico', () => {
  const idx = indiceDesempenho([{mes:'2026-11', valor:10000, aportesDesdeAnterior:0}, {mes:'2026-12', valor:10500, aportesDesdeAnterior:0}, {mes:'2027-01', valor:9000, aportesDesdeAnterior:0}], {});
  const q = situacaoQueda(idx); assert.equal(q.emQueda, true); assert.equal(q.mesInicio, '2027-01'); perto(q.quedaPct, -0.142857, 1e-6);
});
test('recuperação encerra a queda', () => assert.equal(situacaoQueda([{mes:'a', indice:1}, {mes:'b', indice:1.05}, {mes:'c', indice:0.9}, {mes:'d', indice:1.06}]).emQueda, false));
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/desempenho.js`.**
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: saldos estimados e detecção de queda`.

---

### Task 7: Decisão do aporte — reserva, carteira e caixa (§4.6)

**Files:**
- Create: `js/core/aporte.js`
- Test: `tests/core/aporte.test.js`

**Interfaces:**
- Produces:
  - `tetoCaixa(excedenteMedio: number): number` (`6 ×`)
  - `decidirAporte({excedente, reserva, alvoReserva, emQueda, caixa, caixaNoInicioDaQueda, tetoCaixa, pmtNec, proventos = 0}): {paraReserva, paraCarteira, paraCaixa, daCaixaParaCarteira, aDistribuir}`

Regras, em ordem: `paraReserva = min(excedente, max(0, alvoReserva − reserva))`; `resto = excedente − paraReserva`. Em queda: `paraCarteira = resto`, `daCaixaParaCarteira = min(caixa, caixaNoInicioDaQueda/3)`, `paraCaixa = 0`. Fora de queda, com `pmtNec ≥ resto`: `paraCarteira = resto`. Fora de queda, com `pmtNec < resto`: `base = max(pmtNec, 0)`, `paraCaixa = min(resto − base, max(0, tetoCaixa − caixa))`, `paraCarteira = resto − paraCaixa`. Por fim, `aDistribuir = paraCarteira + daCaixaParaCarteira + proventos`. Só a diferença até o alvo vai para a reserva; o que passa disso segue as regras da carteira.

- [ ] **Step 1: Escrever os testes que falham**

```js
const b = {reserva:33000, alvoReserva:33000, emQueda:false, caixa:0, caixaNoInicioDaQueda:0, tetoCaixa:55200, pmtNec:10225};
test('reserva incompleta recebe tudo', () => { const r = decidirAporte({...b, excedente:2800, reserva:20000}); assert.equal(r.paraReserva, 2800); assert.equal(r.paraCarteira, 0); });
test('reserva completa no meio do mês', () => { const r = decidirAporte({...b, excedente:2800, reserva:32000}); assert.equal(r.paraReserva, 1000); assert.equal(r.paraCarteira, 1800); });
test('abaixo da trajetória: tudo na carteira', () => assert.equal(decidirAporte({...b, excedente:9200}).paraCarteira, 9200));
test('adiantado: diferença vai para a caixa', () => { const r = decidirAporte({...b, excedente:9200, pmtNec:6000}); assert.equal(r.paraCarteira, 6000); assert.equal(r.paraCaixa, 3200); });
test('caixa perto do teto', () => { const r = decidirAporte({...b, excedente:9200, pmtNec:6000, caixa:54000}); assert.equal(r.paraCaixa, 1200); assert.equal(r.paraCarteira, 8000); });
test('queda: usa 1/3 da caixa e não enche a caixa', () => {
  const r = decidirAporte({...b, excedente:9200, pmtNec:6000, emQueda:true, caixa:30000, caixaNoInicioDaQueda:30000});
  assert.equal(r.paraCarteira, 9200); assert.equal(r.daCaixaParaCarteira, 10000); assert.equal(r.paraCaixa, 0);
  assert.equal(decidirAporte({...b, excedente:9200, emQueda:true, caixa:5000, caixaNoInicioDaQueda:30000}).daCaixaParaCarteira, 5000);
});
test('depois do prazo tudo vai para a carteira', () => assert.equal(decidirAporte({...b, excedente:9200, pmtNec:Infinity}).paraCarteira, 9200));
test('proventos são reinvestidos', () => assert.equal(decidirAporte({...b, excedente:9200, proventos:300}).aDistribuir, 9500));
test('tetoCaixa', () => assert.equal(tetoCaixa(9200), 55200));
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/aporte.js`.**
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: decisão entre reserva, carteira e caixa`.

---

### Task 8: Divisão entre os ativos (§4.7)

**Files:**
- Create: `js/core/alocacao.js`
- Test: `tests/core/alocacao.test.js`

**Interfaces:**
- Produces:
  - `CLASSES = ['rendaFixa', 'fiis', 'acoes', 'exterior']`
  - `CARTEIRA_PADRAO: Record<classe, {peso, ticker, frase}>`. Pesos e tickers vêm de Global Constraints. Frases: rendaFixa `'Título do governo que paga juros a cada 6 meses e protege da inflação'`; fiis `'Fundo que reúne vários fundos imobiliários e paga aluguéis todo mês'`; acoes `'Fundo com empresas brasileiras que pagam bons dividendos'`; exterior `'As 500 maiores empresas dos EUA; não paga proventos, serve de proteção'`.
  - `NOMES_CLASSE: Record<classe, string>`: `'A renda fixa'`, `'A parte de fundos imobiliários'`, `'A bolsa brasileira'`, `'A parte no exterior'`.
  - `distribuirAporte({valores: Record<classe, number>, pesos: Record<classe, number>, aporte}): Record<classe, number>`. Proporcional aos déficits `max(0, w·Tot − V)`. Como `Σdéficits ≥ aporte` sempre, não existe o ramo "preencher e dividir a sobra" da spec. `aporte = 0` → zeros.
  - `arredondarDistribuicao(dist): Record<classe, number>`. Classes que não são renda fixa recebem `Math.floor`; a renda fixa recebe `total − soma das outras`.
  - `sugestaoPorAtivo({distribuicao, carteiraAlvo, precos: Record<classe, number|null>}): Array<{classe, ticker, frase, valor, cotasAprox: number|null}>`. Omite valores 0; `cotasAprox = floor(valor/preço)`, ou `null` se não houver preço.
  - `explicarPorque({valores, valoresMesAnterior, pesos, distribuicao, carteiraAlvo}): string`. Usa a classe com maior valor na distribuição. Se o valor dela caiu em relação ao mês anterior: `` `${NOMES_CLASSE[c]} caiu este mês e ficou abaixo do alvo, então o ${ticker} recebe uma fatia maior.` ``. Senão: `` `${NOMES_CLASSE[c]} está abaixo do alvo (${pctAtual} de ${pctAlvo}), então o ${ticker} recebe a maior parte.` ``. Com carteira vazia: `'Dividindo conforme a sua carteira-alvo.'`

- [ ] **Step 1: Escrever os testes que falham**

```js
const pesos = Object.fromEntries(CLASSES.map(c => [c, CARTEIRA_PADRAO[c].peso]));
const v = {rendaFixa:4000, fiis:2500, acoes:2500, exterior:500};
test('aporte igual à soma dos déficits', () => assert.deepEqual(distribuirAporte({valores:v, pesos, aporte:1000}), {rendaFixa:200, fiis:125, acoes:125, exterior:550}));
test('aporte menor: proporcional', () => assert.deepEqual(distribuirAporte({valores:v, pesos, aporte:500}), {rendaFixa:100, fiis:62.5, acoes:62.5, exterior:275}));
test('carteira vazia segue os pesos', () => assert.deepEqual(distribuirAporte({valores:{rendaFixa:0, fiis:0, acoes:0, exterior:0}, pesos, aporte:1000}), {rendaFixa:400, fiis:250, acoes:250, exterior:100}));
test('aporte zero', () => assert.deepEqual(distribuirAporte({valores:v, pesos, aporte:0}), {rendaFixa:0, fiis:0, acoes:0, exterior:0}));
test('arredondamento sobra na renda fixa', () => assert.deepEqual(arredondarDistribuicao({rendaFixa:100, fiis:62.5, acoes:62.5, exterior:275}), {rendaFixa:101, fiis:62, acoes:62, exterior:275}));
test('cotas aproximadas', () => {
  const s = sugestaoPorAtivo({distribuicao:{rendaFixa:0, fiis:0, acoes:0, exterior:275}, carteiraAlvo:CARTEIRA_PADRAO, precos:{exterior:100}});
  assert.equal(s.length, 1); assert.equal(s[0].ticker, 'IVVB11'); assert.equal(s[0].cotasAprox, 2);
  assert.equal(sugestaoPorAtivo({distribuicao:{rendaFixa:0, fiis:0, acoes:0, exterior:275}, carteiraAlvo:CARTEIRA_PADRAO, precos:{}})[0].cotasAprox, null);
});
test('por quê: queda', () => {
  const t = explicarPorque({valores:{rendaFixa:4000, fiis:2500, acoes:1500, exterior:1000}, valoresMesAnterior:{rendaFixa:4000, fiis:2500, acoes:2500, exterior:1000}, pesos, distribuicao:{rendaFixa:0, fiis:0, acoes:900, exterior:0}, carteiraAlvo:CARTEIRA_PADRAO});
  assert.equal(t, 'A bolsa brasileira caiu este mês e ficou abaixo do alvo, então o DIVO11 recebe uma fatia maior.');
});
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/alocacao.js`.**
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: divisão do aporte entre os ativos`.

---

### Task 9: Projeções, status e impacto do orçamento (§4.9, §4.11)

**Files:**
- Create: `js/core/projecao.js`
- Test: `tests/core/projecao.test.js`

**Interfaces:**
- Consumes: `somarMeses`, `diffMeses` (Task 1); `taxaMensal`, `mesesAteMeta` (Task 2); `calcularMetas` (Task 4).
- Produces:
  - `ritmoDeAportes({historico: Array<{mes, aplicadoCarteira, aplicadoCaixa}>, mesInicio, excedenteEsperado}): {valor, fonte: 'real'|'esperado'}`. A janela tem 6 meses e termina no último mês com lançamento, sem passar do `mesInicio`. Mês sem lançamento conta como 0. Se menos de 3 meses do histórico tiverem `aplicadoCarteira > 0`, devolve `{valor: excedenteEsperado, fonte: 'esperado'}`.
  - `projetar({patrimonio, aporteMensal, i, meta, mesAtual, reservaFaltando = 0}): {meses: number|null, mes: string|null}`. Simula mês a mês: o aporte enche primeiro o que falta da reserva e o resto rende na carteira. Limite de 600 meses.
  - `faixaProjecao({patrimonio, aporteMensal, rentabilidade, meta, mesAtual, reservaFaltando = 0, delta = 0.02}): {otimista, central, pessimista}` (cada um no formato de `projetar`)
  - `classificarStatus({mesProjetado: string|null, mesAlvo}): 'adiantado'|'no-caminho'|'atencao'|'atrasado'`. Com `d = diffMeses(mesAlvo, mesProjetado)`: `null` → atrasado; `d ≤ −3` → adiantado; `d ≤ 3` → no-caminho; `d ≤ 12` → atencao; acima disso → atrasado.
  - `acaoSugerida({pmtNec, ritmo}): {aporteExtra: number}|null` (`pmtNec − ritmo` se `> 0` e finito)
  - `proventosMedios({historico: Array<{mes, proventos}>, mesInicio}): number` (janela de até 12 meses que termina no último lançamento; mês sem lançamento = 0)
  - `impactoNoPrazo({patrimonio, aporteMensal, i, custoTotal, swr, deltaCustoMensal}): number`. São os meses de diferença na meta de Independência: a meta sobe com o custo e o aporte cai no mesmo valor.

- [ ] **Step 1: Escrever os testes que falham**

```js
const p = {patrimonio:128400, aporteMensal:9200, i:i5, meta:1650000, mesAtual:'2027-07'};
test('projetar', () => assert.deepEqual(projetar(p), {meses:122, mes:'2037-09'}));
test('projetar com reserva em formação', () => { assert.equal(projetar({...p, reservaFaltando:18400}).meses, 124); assert.equal(projetar({...p, reservaFaltando:10000}).meses, 123); });
test('projetar inalcançável', () => assert.deepEqual(projetar({...p, patrimonio:0, aporteMensal:0}), {meses:null, mes:null}));
test('faixa 3%–7%', () => { const f = faixaProjecao({...p, rentabilidade:0.05}); assert.equal(f.otimista.meses, 111); assert.equal(f.central.meses, 122); assert.equal(f.pessimista.meses, 135); });
test('status', () => {
  const s = m => classificarStatus({mesProjetado: m, mesAlvo:'2036-11'});
  assert.equal(s('2036-08'), 'adiantado'); assert.equal(s('2036-09'), 'no-caminho'); assert.equal(s('2037-02'), 'no-caminho');
  assert.equal(s('2037-03'), 'atencao'); assert.equal(s('2037-11'), 'atencao'); assert.equal(s('2037-12'), 'atrasado'); assert.equal(s(null), 'atrasado');
});
test('ritmo real e esperado', () => {
  const h = [{mes:'2027-01', aplicadoCarteira:9000, aplicadoCaixa:0}, {mes:'2027-02', aplicadoCarteira:9400, aplicadoCaixa:0}, {mes:'2027-04', aplicadoCarteira:9200, aplicadoCaixa:400}];
  assert.deepEqual(ritmoDeAportes({historico:h, mesInicio:'2027-01', excedenteEsperado:9000}), {valor:7000, fonte:'real'});
  assert.deepEqual(ritmoDeAportes({historico:h.slice(0, 2), mesInicio:'2027-01', excedenteEsperado:9000}), {valor:9000, fonte:'esperado'});
});
test('ação sugerida', () => { assert.deepEqual(acaoSugerida({pmtNec:10200, ritmo:9200}), {aporteExtra:1000}); assert.equal(acaoSugerida({pmtNec:8000, ritmo:9200}), null); });
test('proventos médios', () => assert.equal(proventosMedios({historico:[{mes:'2027-01', proventos:300}, {mes:'2027-03', proventos:600}], mesInicio:'2027-01'}), 300));
test('impacto de +R$ 300/mês', () => assert.equal(impactoNoPrazo({patrimonio:128400, aporteMensal:9200, i:i5, custoTotal:5500, swr:0.04, deltaCustoMensal:300}), 9));
```

(O ritmo `7000` corresponde a `(9000 + 9400 + 0 + 9600) / 4`: a janela vai de `2027-01` a `2027-04`. Os `9` meses de impacto são `131 − 122`.)

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/projecao.js`.**
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: projeções, status e impacto do orçamento`.

---

### Task 10: Check-up da carteira (§4.10)

**Files:**
- Create: `js/core/checkup.js`
- Test: `tests/core/checkup.test.js`

**Interfaces:**
- Consumes: `CLASSES`, `NOMES_CLASSE` (Task 8); `formatarPct` (Task 1).
- Produces: `checkup({valores, pesos, carteiraAlvo, foraDoPlano: Array<{nome, tipoForaDoPlano: 'poupanca'|'outro'}>, reserva, alvoReserva, caixa, tetoCaixa, diasDesdeAtualizacao}): Array<{nivel: 'ok'|'atencao', chave: string, texto: string}>`

Uma regra para cada item da §4.10 (compare em pontos percentuais com tolerância de `1e-9`, para que 5 p.p. exatos não disparem por erro de ponto flutuante), com estes limites estritos: abaixo do alvo por mais de 5 p.p. → `atencao`, chave `abaixo:<classe>`, texto citando o percentual atual, o alvo e o ticker que vai ser priorizado. Acima do alvo por mais de 10 p.p. → `atencao`, chave `acima:<classe>`, texto que **não** contém "vend". Poupança → chave `poupanca:<nome>`. Outro item fora do plano → chave `fora:<nome>`. Reserva → `ok`/`atencao`, chave `reserva`. Caixa → `ok`, chave `caixa` (vazia, com saldo ou no teto). Saldos com mais de 35 dias → `atencao`, chave `saldos`. Carteira com total 0 → nenhuma regra de classe.

- [ ] **Step 1: Escrever os testes que falham**

```js
const b = {pesos, carteiraAlvo:CARTEIRA_PADRAO, foraDoPlano:[], reserva:33000, alvoReserva:33000, caixa:0, tetoCaixa:55200, diasDesdeAtualizacao:10};
const chaves = r => r.map(x => x.chave);
test('classe abaixo do alvo', () => assert.ok(chaves(checkup({...b, valores:{rendaFixa:4000, fiis:1500, acoes:3000, exterior:1500}})).includes('abaixo:fiis')));
test('exatamente 5 p.p. não dispara', () => assert.ok(!chaves(checkup({...b, valores:{rendaFixa:5500, fiis:2000, acoes:2000, exterior:500}})).some(c => c.startsWith('abaixo:'))));
test('classe acima não manda vender', () => { const r = checkup({...b, valores:{rendaFixa:5500, fiis:2000, acoes:2000, exterior:500}}); const a = r.find(x => x.chave === 'acima:rendaFixa'); assert.ok(a); assert.ok(!/vend/i.test(a.texto)); });
test('poupança e fora do plano', () => { const r = chaves(checkup({...b, valores:{rendaFixa:0, fiis:0, acoes:0, exterior:0}, foraDoPlano:[{nome:'Poupança', tipoForaDoPlano:'poupanca'}, {nome:'Cripto', tipoForaDoPlano:'outro'}]})); assert.ok(r.includes('poupanca:Poupança')); assert.ok(r.includes('fora:Cripto')); });
test('saldos desatualizados e reserva formando', () => { const r = checkup({...b, valores:{rendaFixa:0, fiis:0, acoes:0, exterior:0}, reserva:10000, diasDesdeAtualizacao:36}); assert.equal(r.find(x => x.chave === 'reserva').nivel, 'atencao'); assert.ok(chaves(r).includes('saldos')); });
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/checkup.js`.**
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Commit** — `feat: check-up da carteira`.

---

### Task 11: Esquema do estado e motor (integração do núcleo)

**Files:**
- Create: `js/core/esquema.js`, `js/core/motor.js`
- Test: `tests/core/esquema.test.js`, `tests/core/motor.test.js`

**Interfaces:**
- Consumes: tudo das Tasks 1–10.
- Produces:
  - `esquema.js`: `SCHEMA_VERSION = 1`; `criarEstadoInicial({salario, mesInicio, recebe13 = true, recebeFerias = true, anuaisJaSeparados = 0}): Estado`; `migrar(estado): Estado` (v1 devolve o próprio estado; versão maior que a conhecida → `throw new Error('versao-desconhecida')`); `novoId(): string`.
  - Formato `Estado`:
    ```
    { schemaVersion, config: { salario, mesSalario, recebe13, recebeFerias, mesInicio, prazoMeses: 120, swr: 0.04, rentabilidadeReal: 0.05, ultimaRevisaoOrcamento },
      plano: { p0, mesP0 },
      orcamento: [{ id, nome, tipo, valor, mes }],
      ativos: [{ id, nome, ticker, papel: 'reserva'|'caixa'|'carteira'|'fora-do-plano'|'fgts', classe: string|null, tipoForaDoPlano: 'poupanca'|'outro'|null }],
      carteiraAlvo: CARTEIRA_PADRAO (cópia),
      saldos: [{ ativoId, data: 'YYYY-MM-DD', valor, cotas }],   // só atualizações reais; o mês é data.slice(0, 7)
      meses: [{ mes, recebido, tipoExtra, proventos, sugestao, aplicado: [{ ativoId, valor, cotas }], guardarParaProximoMes, paraAnuais }],
      contadoresAnuais: {}, ipca: { serie: {}, atualizadoEm: null }, ipcaManual: {} }
    ```
  - `motor.js`:
    - `calcularMes({estado, recebido, tipoExtra = null, proventos = 0, saldosAtualizados = null, hoje: 'YYYY-MM-DD'}): RespostaMes`, com `RespostaMes = {mes, perguntarExtra, semAporte, motivo, recebidoEfetivo, excedente, paraDiaADia, paraAnuais, guardarParaProximoMes, paraReserva, paraCaixa, daCaixaParaCarteira, sugestoes: Array<{classe, ticker, frase, valor, cotasAprox}>, porque, avisos: string[], estimado}`. Os avisos possíveis são `'saldos-desatualizados'` e `'ipca-indisponivel'`. `saldosAtualizados: Array<{ativoId, valor, cotas}>|null` substitui os saldos estimados no cálculo.
    - `registrarAplicacao(estado, {mes, data, recebido, tipoExtra = null, proventos = 0, saldosAtualizados = null, resposta, aplicado: Array<{destino: classe|'reserva'|'caixa', valor, cotas = null}>, transferidoDaCaixa = 0}): Estado`. Puro. Faz upsert do mês (um lançamento por mês), grava `saldosAtualizados` em `saldos` com `data` e soma `resposta.paraAnuais` com `somarAoCiclo`.
    - `calcularPainel({estado, hoje: 'YYYY-MM-DD'}): Painel`, com `Painel = {status, patrimonio, planejadoHoje, diferenca, metas, custoTotal, salario, mesAlvo, projecaoM1, faixa, projecaoM2, rendaNoPrazo, ritmo, pmtNec, acao, proventosMedios, rendimentoReal: number|null, checkup, grafico: {plano, real, projecao, faixa}, estimado}`. As séries do gráfico são `Array<{mes, valor}>`; `faixa` é `{otimista, pessimista}`.

Regras de montagem (decidem o que as tasks anteriores deixam em aberto):
- A série efetiva do IPCA é `{...ipca.serie, ...ipcaManual}`. Todo valor monetário guardado com mês é convertido com `paraReaisDeHoje` antes de entrar no cálculo. O `recebido` do mês corrente é usado como está. Se a série estiver vazia, ou se `ultimoMes` estiver mais de 2 meses antes de `hoje`, entra o aviso `'ipca-indisponivel'`.
- Os saldos atuais de cada ativo vêm de `estimarSaldo`, usando a última entrada em `saldos` e os `aplicado` posteriores. Patrimônio para as metas = soma de `carteira` + `caixa` + `fora-do-plano`.
- `t = diffMeses(config.mesInicio, hoje)`. A trajetória usa `plano.p0` (convertido), `M1` e `taxaMensal(rentabilidadeReal)`. `pmtNec` vem de `pmtNecessario` com `meses = prazoMeses − t`.
- O pendente das férias é o `guardarParaProximoMes` do lançamento do mês anterior.
- Queda: `indiceDesempenho` sobre os meses com saldos reais da carteira. A caixa no início da queda é o saldo estimado da caixa em `mesInicio`.
- O excedente médio (para o teto da caixa) é a média de `sugestao.excedente` dos últimos 6 lançamentos, ou o excedente do mês se não houver lançamentos.
- O preço de cada classe é o último saldo dividido pelas cotas do ativo padrão da classe; sem cotas → `null`.
- **Registro:** cada `destino` vira o `ativoId` do primeiro ativo com esse papel/classe. Se não existir, `registrarAplicacao` cria o ativo: classe → `{papel:'carteira', classe, ticker e nome do alvo}`; `'reserva'` → `'Reserva (Tesouro Selic)'`; `'caixa'` → `'Caixa de oportunidade (Tesouro Selic)'`. Um `transferidoDaCaixa > 0` é gravado como um `aplicado` **negativo** na caixa.
- **Ritmo de um mês** = soma dos `aplicado` nas classes e na caixa (incluindo o valor negativo da transferência, que se anula com a entrada nas classes) **menos os proventos do mês**, que são rendimento e não dinheiro novo. A reserva não entra. Na projeção, `reservaFaltando = max(0, alvoReserva − reserva)`.
- **Saldos desatualizados:** a data mais recente em `saldos` de ativos `carteira` comparada com `hoje`; o aviso aparece quando `diasEntre > 35`. `estimado` é verdadeiro se algum saldo usado veio de `estimarSaldo` com `estimado: true`.
- **Séries do gráfico:** `plano` é mensal, do mês 0 ao prazo. `real` é o patrimônio estimado em cada mês com lançamento. `projecao` e a faixa vão de hoje até o mês em que cada uma alcança `M1`, ou até 24 meses depois do alvo se não alcançar.
- `rendimentoReal` é a taxa anualizada do índice de desempenho desde o primeiro ponto (`null` com menos de 2 pontos).

- [ ] **Step 1: Escrever a fixture e os testes que falham**

Fixture `estadoBase()` em `tests/core/motor.test.js`: `criarEstadoInicial({salario:7800, mesInicio:'2026-11'})` mais `orcamento = [{tipo:'mensal', valor:5000, mes:'2026-11'}, {tipo:'anual', valor:6000, mes:'2026-11'}]`. Ativos: reserva (saldo 33000), caixa (saldo 0) e um por classe, com saldos `{rendaFixa:4000, fiis:2500, acoes:2500, exterior:500}`, todos com `data: '2026-11-10'`. `plano = {p0:9500, mesP0:'2026-11'}`. IPCA vazio, exceto onde o teste indicar.

```js
test('mês normal divide o excedente pelos déficits', () => {
  const r = calcularMes({estado: estadoBase(), recebido:7800, hoje:'2026-11-10'});
  assert.equal(r.excedente, 2800); assert.equal(r.paraDiaADia, 5000); assert.equal(r.perguntarExtra, false);
  assert.deepEqual(Object.fromEntries(r.sugestoes.map(s => [s.classe, s.valor])), {rendaFixa:920, fiis:575, acoes:575, exterior:730});
});
test('saldo do mês anterior é estimado, sem aviso', () => { const r = calcularMes({estado: estadoBase(), recebido:7800, hoje:'2026-12-05'}); assert.equal(r.estimado, true); assert.ok(!r.avisos.includes('saldos-desatualizados')); });
test('saldos com mais de 35 dias geram aviso', () => assert.ok(calcularMes({estado: estadoBase(), recebido:7800, hoje:'2026-12-20'}).avisos.includes('saldos-desatualizados')));
test('pergunta o extra quando o valor passa de 110% do salário', () => assert.equal(calcularMes({estado: estadoBase(), recebido:9000, hoje:'2026-11-10'}).perguntarExtra, true));
test('um lançamento por mês', () => {
  let e = estadoBase(); const r = calcularMes({estado:e, recebido:7800, hoje:'2026-11-10'});
  e = registrarAplicacao(e, {mes:'2026-11', data:'2026-11-10', recebido:7800, resposta:r, aplicado:[]}); e = registrarAplicacao(e, {mes:'2026-11', data:'2026-11-12', recebido:7900, resposta:r, aplicado:[]});
  assert.equal(e.meses.filter(m => m.mes === '2026-11').length, 1); assert.equal(e.meses[0].recebido, 7900);
});
test('aplicar em classe sem ativo cria o ativo; transferência da caixa fica negativa', () => {
  let e = criarEstadoInicial({salario:7800, mesInicio:'2026-11'}); const r = calcularMes({estado:e, recebido:7800, hoje:'2026-11-10'});
  e = registrarAplicacao(e, {mes:'2026-11', data:'2026-11-10', recebido:7800, resposta:r, aplicado:[{destino:'fiis', valor:500}], transferidoDaCaixa:200});
  assert.equal(e.ativos.find(a => a.classe === 'fiis').ticker, 'XFIX11'); assert.ok(e.meses[0].aplicado.some(x => x.valor === -200));
});
test('férias passam o pendente para o mês seguinte', () => {
  let e = estadoBase(); const r = calcularMes({estado:e, recebido:18200, tipoExtra:'ferias', hoje:'2026-11-10'});
  e = registrarAplicacao(e, {mes:'2026-11', data:'2026-11-10', recebido:18200, tipoExtra:'ferias', resposta:r, aplicado:[]});
  assert.equal(calcularMes({estado:e, recebido:0, hoje:'2026-12-10'}).excedente, 2800);
});
test('painel sem histórico usa o excedente esperado', () => {
  const p = calcularPainel({estado: estadoBase(), hoje:'2026-11-10'});
  assert.equal(p.ritmo.fonte, 'esperado'); assert.equal(p.ritmo.valor, 2800); assert.equal(p.metas.independencia, 1650000);
  assert.equal(p.mesAlvo, '2036-11'); perto(p.planejadoHoje, 9500); assert.equal(p.status, classificarStatus({mesProjetado: p.projecaoM1.mes, mesAlvo:'2036-11'}));
});
test('metas acompanham a inflação', () => { const e = estadoBase(); e.ipca.serie = {'2026-12':0.01}; perto(calcularPainel({estado:e, hoje:'2027-01-10'}).metas.rendaPlena, 2363400); });
test('IPCA ausente gera aviso, sem quebrar', () => assert.ok(calcularMes({estado: estadoBase(), recebido:7800, hoje:'2026-11-10'}).avisos.includes('ipca-indisponivel')));
test('começar do zero não quebra', () => {
  const e = criarEstadoInicial({salario:7800, mesInicio:'2026-11'}); e.orcamento = [{tipo:'mensal', valor:5000, mes:'2026-11'}];
  const r = calcularMes({estado:e, recebido:7800, hoje:'2026-11-10'}); assert.equal(r.paraReserva, 2800);
  const p = calcularPainel({estado:e, hoje:'2026-11-10'}); assert.ok(Number.isFinite(p.patrimonio)); assert.equal(p.rendimentoReal, null);
});
test('migrar rejeita versão futura', () => assert.throws(() => migrar({schemaVersion:99}), /versao-desconhecida/));
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/core/esquema.js` e `js/core/motor.js`.**
- [ ] **Step 4: Rodar a suíte inteira** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: esquema do estado e motor do mês e do painel`.

---

### Task 12: Dados — cliente do GitHub, armazém e IPCA remoto

**Files:**
- Create: `js/dados/github.js`, `js/dados/armazem.js`, `js/dados/ipca-remoto.js`
- Test: `tests/dados/github.test.js`, `tests/dados/armazem.test.js`, `tests/dados/ipca-remoto.test.js`

**Interfaces:**
- Consumes: `migrar` (Task 11), `parseSerieSgs` (Task 3).
- Produces:
  - `github.js`: `class ErroGitHub extends Error { codigo: 'token-invalido'|'sem-permissao'|'repo-nao-encontrado'|'conflito'|'rede'|'desconhecido' }`; `criarClienteGitHub({token, dono, repo = 'Projeto_R-dados', caminho = 'dados.json', fetch}): {ler(): Promise<{estado, sha}|null>, gravar(estado, sha: string|null): Promise<string>}`; `donoPadrao(hostname: string): string` (`'fulano.github.io'` → `'fulano'`; senão `''`).
    - Usa `GET`/`PUT https://api.github.com/repos/${dono}/${repo}/contents/${caminho}`, com os cabeçalhos `Authorization: Bearer`, `Accept: application/vnd.github+json` e `X-GitHub-Api-Version: 2022-11-28`. O conteúdo vai em base64 UTF-8 (`TextEncoder` + `btoa` em blocos; na leitura, remover `\n`). Mapeamento: 401 → `token-invalido`; 403 → `sem-permissao`; 409/422 no `PUT` → `conflito`; `fetch` lançando erro → `rede`. No `ler()`, um 404 dispara `GET /repos/${dono}/${repo}`: se esse também der 404, `repo-nao-encontrado`; senão devolve `null` (ainda sem dados).
  - `armazem.js`: `criarArmazem({armazenamento, cliente}): {carregar(), salvar(mutacao), sincronizarPendentes()}`. Chaves do `localStorage`: `projetoR.estado`, `projetoR.sha`, `projetoR.pendente`.
    - `carregar(): Promise<{estado: Estado|null, origem: 'remoto'|'local'|'vazio', aviso?: string}>`. Remoto disponível e nada pendente → grava local e devolve o remoto. Há pendência → envia o local (vale a última gravação). Erro de `rede` → devolve o local com `aviso: 'offline'`. Outros erros do GitHub → devolve o local com `aviso: codigo`.
    - `salvar(mutacao: (Estado) => Estado): Promise<{estado, sincronizado: boolean, aviso?: 'conflito-resolvido'|'offline'|string}>`. Aplica no local, grava local e depois remoto. Em `conflito`: lê o remoto, reaplica a `mutacao` sobre ele, grava e avisa `conflito-resolvido`. Em `rede`: marca pendente e avisa `offline`.
  - `ipca-remoto.js`: `URL_IPCA = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados'`; `buscarSerieIpca({fetch, desde: 'YYYY-MM'}): Promise<Record<mes, number>>` (query `formato=json&dataInicial=01/MM/YYYY`; resposta fora do formato → `throw`); `precisaAtualizarIpca(ipca, agora: Date): boolean` (`atualizadoEm` nulo ou mais de 24h atrás).
  - `armazenamento` e `fetch` falsos são construídos dentro dos testes.

- [ ] **Step 1: Escrever os testes que falham**

```js
// github.test.js — fetch falso registra as chamadas e devolve respostas programadas
test('ler decodifica UTF-8', async () => { /* GET 200 com content = base64('{"schemaVersion":1,"config":{"nome":"Ação"}}') */ assert.equal((await c.ler()).estado.config.nome, 'Ação'); });
test('ler sem arquivo devolve null', async () => { /* contents 404, repo 200 */ assert.equal(await c.ler(), null); });
test('repo inexistente', async () => { /* contents 404, repo 404 */ await assert.rejects(c.ler(), e => e.codigo === 'repo-nao-encontrado'); });
test('token inválido e sem permissão', async () => { await assert.rejects(c401.ler(), e => e.codigo === 'token-invalido'); await assert.rejects(c403.ler(), e => e.codigo === 'sem-permissao'); });
test('gravar envia sha e devolve o novo', async () => { /* PUT 200 {content:{sha:'novo'}} */ assert.equal(await c.gravar({schemaVersion:1}, 'velho'), 'novo'); assert.equal(JSON.parse(chamadas.at(-1).body).sha, 'velho'); });
test('conflito no PUT', async () => { await assert.rejects(c409.gravar({}, 'x'), e => e.codigo === 'conflito'); });
test('donoPadrao', () => { assert.equal(donoPadrao('fulano.github.io'), 'fulano'); assert.equal(donoPadrao('localhost'), ''); });

// armazem.test.js — cliente falso em memória
test('salvar grava local e remoto', async () => { const r = await a.salvar(e => ({...e, x:1})); assert.equal(r.sincronizado, true); assert.equal(JSON.parse(mem['projetoR.estado']).x, 1); });
test('conflito reaplica a mutação sobre o remoto', async () => { /* gravar lança conflito uma vez; remoto tem y:2 */ const r = await a.salvar(e => ({...e, x:1})); assert.equal(r.aviso, 'conflito-resolvido'); assert.deepEqual([r.estado.x, r.estado.y], [1, 2]); });
test('offline marca pendente e sincroniza depois', async () => { /* gravar lança rede */ const r = await a.salvar(e => ({...e, x:1})); assert.equal(r.aviso, 'offline'); assert.equal(mem['projetoR.pendente'], '1'); /* rede volta */ await a.sincronizarPendentes(); assert.equal(mem['projetoR.pendente'], undefined); });
test('token inválido mantém os dados locais', async () => { const r = await a.carregar(); assert.equal(r.origem, 'local'); assert.equal(r.aviso, 'token-invalido'); });

// ipca-remoto.test.js
test('buscarSerieIpca monta a URL e parseia', async () => { const s = await buscarSerieIpca({fetch: falso, desde:'2026-07'}); assert.match(urlChamada, /dataInicial=01\/07\/2026/); perto(s['2026-09'], 0.0082, 1e-12); });
test('resposta inválida lança erro', async () => { await assert.rejects(buscarSerieIpca({fetch: falsoHtml, desde:'2026-07'})); });
test('precisaAtualizarIpca', () => { assert.equal(precisaAtualizarIpca({atualizadoEm:null}, new Date()), true); assert.equal(precisaAtualizarIpca({atualizadoEm:new Date().toISOString()}, new Date()), false); });
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/dados/` → FAIL.
- [ ] **Step 3: Implementar os três módulos.**
- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: sincronização com o GitHub, cache local e IPCA remoto`.

---

### Task 13: Casca da interface, estilos e roteador

**Files:**
- Create: `index.html`, `css/app.css`, `js/app.js`, `js/ui/dom.js`

**Interfaces:**
- Consumes: `criarArmazem`, `criarClienteGitHub`, `donoPadrao` (Task 12); `buscarSerieIpca`, `precisaAtualizarIpca` (Task 12); `mesDe` (Task 1).
- Produces:
  - Contexto passado a cada tela: `ctx = {estado, hoje: 'YYYY-MM-DD' (dataISO(new Date())), salvar(mutacao): Promise<void>, navegar(hash): void, aviso(texto, nivel): void, conexao: {token, dono}}`.
  - Contrato de tela: cada módulo em `js/ui/` exporta `render(container: HTMLElement, ctx): void`.
  - Rotas: `#/inicio` (assistente), `#/mes` (padrão), `#/painel`, `#/orcamento`, `#/historico`, `#/config`. Sem estado → `#/inicio`.
  - `dom.js`: `h(tag, attrs, ...filhos): HTMLElement`; `campoMoeda({rotulo, valor: number|null, aoMudar(valor: number|null)}): HTMLElement` (aceita digitação livre, usa `parseBRL`, formata ao perder o foco e nunca mostra `NaN`); `cartao(...filhos)`; `botao(texto, aoClicar, {secundario})`.
  - `localStorage`: `projetoR.token`, `projetoR.dono`.

- [ ] **Step 1: Criar a casca**

`index.html`: `lang="pt-BR"`, viewport, `<title>Projeto R</title>`, `theme-color`, link para `css/app.css`, cabeçalho com o nome e uma barra de abas (Mês, Painel, Orçamento, Histórico, ⚙), `<main id="tela">` e `<script type="module" src="js/app.js">`. `css/app.css`: tokens em `:root` (fundo, cartão, texto, texto suave, borda, destaque, ok, atenção, alerta), redefinidos em `@media (prefers-color-scheme: dark)` e em `:root[data-tema="escuro"]`. Layout em coluna única até 720px, com largura máxima de 960px acima disso, e o estilo limpo dos esboços (cartões arredondados, número grande no destaque). Ao iniciar, o `app.js` lê `?tema=escuro|claro` e aplica `data-tema`, só para verificação. Na inicialização, ele também atualiza o IPCA quando `precisaAtualizarIpca` indica, e uma falha nisso só gera aviso.

- [ ] **Step 2: Verificar no navegador**

Run: `npm run servir` e abra `http://localhost:8080` em 390×844 e em 1280×800, com `?tema=claro` e `?tema=escuro`.
Expected: sem dados, o app redireciona para `#/inicio` (por enquanto uma tela vazia com o título); as abas trocam o hash; não há erro no console; não há rolagem horizontal em 390px.

- [ ] **Step 3: Commit** — `feat: casca da interface, tema e roteador`.

---

### Task 14: Assistente de primeiro uso

**Files:**
- Create: `js/ui/inicio.js`

**Interfaces:**
- Consumes: `ctx` (Task 13); `criarEstadoInicial` (Task 11); `CATEGORIAS_SUGERIDAS`, `custoDeVida` (Task 4); `CARTEIRA_PADRAO`, `CLASSES` (Task 8); `calcularPainel` (Task 11); `criarClienteGitHub` (Task 12).

Os passos seguem a §5.1:
1. **Conectar:** guia de criação do fine-grained token. Os passos: github.com → Settings → Developer settings → Fine-grained tokens → Generate; *Repository access: Only select repositories → Projeto_R-dados*; *Permissions → Contents: Read and write*; validade de 1 ano. Depois, campo do token e do dono (preenchido com `donoPadrao(location.hostname)`) e o botão "Testar conexão". Se o `ler()` devolver dados, grava a conexão e vai para `#/mes`. O botão secundário "Continuar sem sincronizar" segue só com dados locais.
2. **Dados básicos:** salário líquido (`campoMoeda`), 13º e férias (marcados por padrão) e "quanto você já tem separado para as despesas anuais deste ciclo (nov–out)".
3. **Orçamento:** as categorias sugeridas aparecem como itens marcáveis, cada uma com campo de valor; dá para adicionar categoria própria (nome, mensal/anual); o total de custo de vida é mostrado ao vivo.
4. **Investimentos atuais:** lista editável com nome, papel (Reserva, Caixa, Carteira + classe, Fora do plano + tipo, FGTS), saldo e cotas (só quando o papel for carteira). Pode ficar vazia.
5. **Carteira-alvo:** a padrão, com frase e ticker; pesos editáveis, com soma obrigatória de 100%; aviso de que são exemplos.
6. **Veredito:** usa `calcularPainel` sobre o estado montado e mostra as duas metas, o excedente esperado comparado ao aporte necessário, a data projetada da Independência e a renda alcançável no prazo, em linguagem direta. Se a meta não couber em 10 anos, diz em quanto tempo cabe. O botão "Começar" salva tudo (`plano.p0` = soma dos saldos que contam para as metas) e vai para `#/mes`.

- [ ] **Step 1: Implementar `js/ui/inicio.js`.**
- [ ] **Step 2: Verificar no navegador (390px)**

Expected: percorrer os 6 passos com valores fictícios (salário 7.800, mercado 1.500, moradia 3.500, IPVA 2.400 anual), sem nenhum investimento; o veredito mostra Independência R$ 1.560.000 (custo 5.200 × 12 / 4%) e não aparece `NaN` em lugar nenhum; recarregar a página mantém os dados (local); "Testar conexão" com um token inválido mostra "Chave inválida ou expirada", sem travar.

- [ ] **Step 3: Commit** — `feat: assistente de primeiro uso`.

---

### Task 15: Tela do mês (tela inicial)

**Files:**
- Create: `js/ui/mes.js`

**Interfaces:**
- Consumes: `calcularMes`, `registrarAplicacao` (Task 11); `campoMoeda`, `h` (Task 13); `TIPOS_EXTRA` (Task 5); `formatarBRL`, `formatarMes` (Task 1).

Layout da opção "A" aprovada na sessão de design:
- Pergunta "Quanto caiu na sua conta este mês?" com `campoMoeda` em foco; abaixo, uma mini barra de progresso da Independência.
- A cada digitação válida, o app recalcula com `calcularMes` e mostra:
  - Se `perguntarExtra`: chips "13º", "Férias", "PLR/bônus", "Outro" (o mapeamento para `TIPOS_EXTRA` segue a mesma ordem), que recalculam ao tocar.
  - Se `semAporte`: o cartão "Este mês não invista nada, o seu dia a dia vem primeiro." (motivo `custo-de-vida`) ou "Este mês não sobra nada para investir." (motivo `sem-sobra`).
  - Senão: "Separe para investir este mês" com `excedente` em destaque e "`paraDiaADia` ficam para o seu dia a dia".
  - Linhas extras quando houver valor: "Separe R$ X para as despesas anuais (deixe na conta ou no Tesouro Selic)", "Guarde R$ X para o mês que vem (adiantamento das férias)", "Reserva de emergência (Tesouro Selic): R$ X", "Caixa de oportunidade (Tesouro Selic): R$ X", "Da caixa de oportunidade para a carteira: R$ X".
  - "Onde aplicar": uma linha por sugestão (ticker, frase e valor, mais "≈ N cotas" quando houver), o "Por quê" e o aviso de que os investimentos são exemplos.
  - Avisos: `saldos-desatualizados` ("Seus saldos são de mmm/aaaa. Atualizar deixa a divisão mais precisa."), `ipca-indisponivel` e "estimado".
- Campo "Proventos recebidos este mês (veja no extrato da corretora)".
- "Atualizar saldos": expande a lista de ativos com os saldos e cotas atuais preenchidos.
- "Já apliquei": abre a lista do que foi sugerido (classes, reserva e caixa como `destino`; a transferência da caixa como `transferidoDaCaixa`), com valores editáveis, e confirma com `ctx.salvar(e => registrarAplicacao(e, {mes, data: ctx.hoje, ...}))`. Se o mês já tiver lançamento, a tela abre preenchida com ele.

- [ ] **Step 1: Implementar `js/ui/mes.js`.**
- [ ] **Step 2: Verificar no navegador (390px), com o estado da Task 14 mais uma reserva completa e saldos por classe**

Expected: digitar `7.800` mostra o excedente e as linhas por ativo, sem piscar nem mostrar `NaN`; digitar `4.000` mostra "o seu dia a dia vem primeiro"; digitar `18.200` mostra os chips e, ao tocar em "Férias", a linha "Guarde R$ … para o mês que vem"; "Já apliquei" cria o lançamento, e reabrir a tela mostra os dados do mês; campo vazio ou `abc` não quebra a tela.

- [ ] **Step 3: Commit** — `feat: tela do mês`.

---

### Task 16: Painel e gráficos

**Files:**
- Create: `js/ui/grafico.js`, `js/ui/painel.js`
- Test: `tests/ui/grafico.test.js`

**Interfaces:**
- Consumes: `calcularPainel` (Task 11); `formatarBRL`, `formatarMes`, `formatarPct` (Task 1).
- Produces: `graficoTrajetoria({plano, real, projecao, faixa: {otimista, pessimista}, meta, mesAlvo, largura = 640, altura = 300}): string` (SVG); `graficoZoom({plano, real, largura = 640, altura = 160}): string` (SVG dos últimos 12 meses, com um `<circle>` por ponto real). As funções são puras; os eixos usam `formatarMes` e valores abreviados ("500 mil", "1,5 mi").

- [ ] **Step 1: Escrever os testes que falham**

```js
const serie = (n, f) => Array.from({length:n}, (_, k) => ({mes: somarMeses('2026-11', k), valor: f(k)}));
test('svg sem NaN e com as quatro camadas', () => {
  const svg = graficoTrajetoria({plano: serie(121, k => 9500 + k*13000), real: serie(9, k => 9500 + k*11000), projecao: serie(130, k => 9500 + k*12500), faixa:{otimista: serie(120, k => k*14000), pessimista: serie(140, k => k*11000)}, meta:1650000, mesAlvo:'2036-11'});
  assert.ok(svg.startsWith('<svg')); assert.ok(!svg.includes('NaN')); assert.equal((svg.match(/<polyline/g) || []).length, 3); assert.ok(svg.includes('<polygon'));
});
test('séries vazias não quebram', () => assert.ok(!graficoTrajetoria({plano:[], real:[], projecao:[], faixa:{otimista:[], pessimista:[]}, meta:0, mesAlvo:'2036-11'}).includes('NaN')));
test('zoom usa só os últimos 12 meses', () => assert.equal((graficoZoom({plano: serie(30, k => k), real: serie(30, k => k)}).match(/<circle/g) || []).length, 12));
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL.
- [ ] **Step 3: Implementar `js/ui/grafico.js`**, com cores via `currentColor` e classes CSS para respeitar o tema.
- [ ] **Step 4: Rodar e ver passar** — PASS.
- [ ] **Step 5: Implementar `js/ui/painel.js`**, seguindo o esboço aprovado:
  - Cartão de status com 🔵 "Adiantado", 🟢 "No caminho", 🟡 "Um pouco abaixo do plano" ou 🔴 "Abaixo do plano", junto com patrimônio, planejado para hoje, diferença, data projetada e ação sugerida.
  - Cartão principal "Sua carteira já te paga R$ X por mês", com barra de progresso contra o custo de vida e menção ao salário.
  - Cartões: Independência (data e faixa), renda no prazo, Renda plena, ritmo (com o rótulo "baseada no seu excedente esperado (ainda sem histórico)" quando `fonte === 'esperado'`) e rendimento real.
  - Os dois gráficos e o check-up.
  - Quando a projeção for `null`: "não alcançada nesse ritmo".
  - Quando os proventos anualizados passarem de 4% do patrimônio, uma nota informativa (§4.9): "Na aposentadoria, reinvista o que passar de 4% ao ano para proteger a carteira da inflação."
  - Quando houver atraso e `acao` for `null` ou pequena, o texto alternativo é "Espere: uma alta da bolsa também fecha a diferença."
- [ ] **Step 6: Verificar no navegador (390px e 1280px, claro e escuro)**

Expected: os números batem com os da tela do mês e do assistente; com o estado recém-criado, o ritmo aparece como "esperado"; os gráficos ficam legíveis nos dois temas, sem estourar a largura; com aporte esperado 0, aparece "não alcançada nesse ritmo".

- [ ] **Step 7: Commit** — `feat: painel e gráficos`.

---

### Task 17: Orçamento com impacto ao vivo

**Files:**
- Create: `js/ui/orcamento.js`

**Interfaces:**
- Consumes: `custoDeVida`, `CATEGORIAS_SUGERIDAS`, `precisaRevisarOrcamento` (Task 4); `impactoNoPrazo` (Task 9); `calcularPainel` (Task 11).

A tela lista as categorias agrupadas em Mensais e Anuais, cada uma com campo de valor; permite adicionar (das sugeridas ou com nome próprio) e remover. Ao editar um valor, mostra ao lado o impacto com `impactoNoPrazo` (patrimônio e ritmo vindos de `calcularPainel`), no formato `+R$ 300/mês = 9 meses mais tarde` ou `−R$ 200/mês = 6 meses mais cedo`. Os totais (custo mensal, anuais e custo de vida) aparecem no topo. "Salvar" grava e atualiza `config.ultimaRevisaoOrcamento`. Quando `precisaRevisarOrcamento` for verdadeiro, um banner na tela do mês e no painel aponta para esta tela.

- [ ] **Step 1: Implementar `js/ui/orcamento.js` e os banners.**
- [ ] **Step 2: Verificar no navegador**

Expected: aumentar uma categoria em 300 mostra o impacto em meses antes de salvar; depois de salvar, o painel reflete a nova meta; uma categoria criada pelo usuário persiste após recarregar.

- [ ] **Step 3: Commit** — `feat: orçamento com impacto no prazo`.

---

### Task 18: Histórico e configurações

**Files:**
- Create: `js/ui/historico.js`, `js/ui/config.js`

**Interfaces:**
- Consumes: `registrarAplicacao` (Task 11); `CARTEIRA_PADRAO`, `CLASSES` (Task 8); `migrar` (Task 11); `ctx` (Task 13).

- **Histórico:** lista do mês mais recente para o mais antigo, com recebido, sugerido (`sugestao.excedente`), aplicado (soma), patrimônio no mês e proventos. Tocar num mês abre o detalhe com as sugestões da época e permite corrigir recebido, proventos e valores aplicados (salva com `registrarAplicacao`).
- **Configurações:** salário (com `mesSalario` atualizado), 13º/férias, premissas (SWR, rentabilidade e prazo, com explicação de uma linha cada), carteira-alvo (pesos e tickers, soma 100%), investimentos (adicionar, editar papel e classe, remover), conexão (token, dono, testar, desconectar), IPCA manual (mês e % — só aparece se a busca automática falhou), "Exportar backup" (baixa `projeto-r-backup-AAAA-MM-DD.json`), "Importar backup" (lê o arquivo, passa por `migrar`, pede confirmação e salva) e "Refazer o assistente".

- [ ] **Step 1: Implementar as duas telas.**
- [ ] **Step 2: Verificar no navegador**

Expected: corrigir um mês no histórico muda o painel; exportar e importar devolve exatamente o mesmo estado; importar um JSON com `schemaVersion: 99` mostra erro sem apagar nada; pesos que não somam 100% bloqueiam o salvar com uma mensagem.

- [ ] **Step 3: Commit** — `feat: histórico e configurações`.

---

### Task 19: PWA, publicação e repositório de dados

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `scripts/gerar-icones.ps1`, `icones/*.png`, `README.md`
- Modify: `index.html` (link do manifest, ícones), `js/app.js` (registro do service worker)

**Interfaces:**
- Consumes: casca da Task 13.

- [ ] **Step 1: Ícones e manifest**

`scripts/gerar-icones.ps1` usa `System.Drawing` para gerar `icone-192.png`, `icone-512.png` e `icone-maskable-512.png` (um "R" branco sobre o azul de destaque; a versão maskable com 20% de margem). O `manifest.webmanifest` tem `name`/`short_name` "Projeto R", `start_url: "./"`, `scope: "./"`, `display: "standalone"`, as cores do tema e os três ícones.

- [ ] **Step 2: Service worker**

O `sw.js` tem uma constante `VERSAO`. No `install`, faz pré-cache da casca (HTML, CSS, todos os `js/**`, manifest e ícones). Nos `fetch` GET da mesma origem, usa **network-first** com fallback para o cache e atualiza o cache. Requisições de outras origens (`api.github.com`, `api.bcb.gov.br`) **nunca** passam pelo cache. No `activate`, apaga caches de versões antigas. O `app.js` registra `./sw.js`.

- [ ] **Step 3: Verificar offline**

Run: `npm run servir`, abrir `http://localhost:8080`, recarregar uma vez e, no DevTools, marcar *Offline* e recarregar.
Expected: o app abre com os dados locais e o aviso "sem conexão"; o Lighthouse/DevTools reconhece o manifest como instalável.

- [ ] **Step 4: README e checagem de dados pessoais**

`README.md` traz o que é o app, como rodar os testes (`npm test`), como servir localmente e o aviso de que os dados ficam num repositório privado separado. Depois, rode `git grep -nE "[0-9]{2}\s?anos|@gmail|token"` e revise cada ocorrência.
Expected: nenhuma idade, nenhum e-mail, nenhum token; só os nomes de variáveis e os textos da interface.

- [ ] **Step 5: Commit** — `feat: PWA (manifest, service worker, ícones) e README`.

- [ ] **Step 6: Publicar — confirmar com o usuário antes**

Peça a confirmação explícita do usuário (tornar o repositório público é uma ação visível para fora). Com o "sim", faça o merge do branch (via superpowers:finishing-a-development-branch) e rode `gh repo edit rodolss/Projeto_R --visibility public --accept-visibility-change-consequences`, `git push origin main` e `gh api -X POST repos/rodolss/Projeto_R/pages -f "source[branch]=main" -f "source[path]=/"`. Crie os dados com `gh repo create Projeto_R-dados --private`, mais um `README.md` dizendo "Dados pessoais do Projeto R. Não tornar público." enviado via `gh api -X PUT repos/rodolss/Projeto_R-dados/contents/README.md`.
Expected: `gh api repos/rodolss/Projeto_R/pages --jq .html_url` devolve a URL; `gh repo view rodolss/Projeto_R-dados --json visibility` devolve `PRIVATE`; o workflow de testes passa no GitHub Actions.

- [ ] **Step 7: Verificação final com o usuário**

Abra a URL publicada no celular (390px) e no computador. O usuário cria o token seguindo o guia do assistente e faz o primeiro uso.
Expected: o `dados.json` aparece no `Projeto_R-dados`; um lançamento feito no celular aparece no computador depois de recarregar; o app pode ser adicionado à tela inicial do celular.
