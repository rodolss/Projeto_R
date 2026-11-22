# Cotação automática na Carteira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cadastrar ações/FIIs escolhendo numa lista e digitando só o número de cotas; o valor em reais é calculado com a cotação.

**Architecture:** papel automático = ativo com `compras`; ao abrir a Carteira, a cotação do dia vira um saldo do dia
(`cotas × preço`), então motor, gráficos e Dia de pagamento não mudam. Cotação só no aparelho.

**Tech Stack:** ES modules, `node --test`, `fetch` do navegador (brapi.dev, sem chave).

**Spec:** `docs/superpowers/specs/2026-11-22-cotacoes-automaticas-design.md`

## Global Constraints

- Sem versão nova do dados.json; cotações nunca no repositório; só o código do papel sai do aparelho.
- Repo público: nada de nomes nem valores reais em código, testes ou documentos.
- Textos em português do Brasil, com acentos, sem jargão; par de botões: secundário antes, confirmação depois.
- Arquivos em CRLF: usar Edit; desenhar as telas no Edge headless antes de publicar.
- Versão 94 (sw.js e js/versao.js); módulos novos na `CASCA` do sw.js; `tests/dados/sw.test.js` na 94.

## Review Focus

- Sem internet / API fora do ar: a Carteira abre, mostra o último preço com a data e nada quebra (Task 2, 3).
- Lista de busca vazia, resposta inesperada, ticker que não está na resposta: sem erro, sem preço (Task 2).
- Comprei e vendi tudo (cotas 0): o papel fica com valor 0 e some das contas sem dividir por zero (Task 1).
- Compra sem preço pago: sem ganho (não inventa) e sem aplicado errado (Task 1).
- Cotação aplicada duas vezes no mesmo dia ou com valor igual: não regrava (Task 1).

### Task 1: núcleo

**Files:** Create `js/core/cotacoes.js`; Modify `js/core/carteira.js` (`posicoes`); Test `tests/core/cotacoes.test.js`, `tests/core/carteira.test.js`

**Interfaces:**
- Produces:
  - `papelAutomatico(ativo) -> boolean` (`Array.isArray(ativo.compras)`)
  - `cotasDoPapel(estado, ativo) -> number` (compras + aportes com cotas dos meses)
  - `custoDoPapel(estado, ativo) -> number|null` (null se alguma compra não tem preço)
  - `grupoDoTipo({ type, subType }) -> 'fiis'|'acoes'`
  - `novoPapel(estado, { ticker, nome, grupo, cotas, preco = null, cotacao = null, hoje, novoId }) -> { estado, id }`
  - `registrarCompra(estado, ativoId, { cotas, preco = null, cotacao = null, hoje, novoId }) -> estado` (cotas < 0 = venda)
  - `aplicarCotacoes(estado, cotacoes, hoje) -> estado` (`cotacoes = { TICKER: { preco, em } }`; o mesmo objeto se nada mudou)

- [ ] Testes (casa inventada com ITUB4 12 cotas a 38,00 e cotação 40,07): `grupoDoTipo` (fii→fiis, stock/etf→acoes); `novoPapel`
  cria o ativo com `compras`, nome = código, e saldo do dia `12 × cotação` com as cotas; sem cotação, sem saldo;
  `registrarCompra` soma, vende (−5) e zera (valor 0); `aplicarCotacoes` grava o saldo do dia (`cotas × preço`), não regrava
  com o mesmo valor, ignora papel sem cotação e papel antigo (sem `compras`), subtrai o aporte do mesmo dia
  (`saldosParaGravar`); `posicoes`: aplicado = custo e ganho = saldo − custo; compra sem preço → `ganho` null e aplicado = saldo.
- [ ] Rodar: FAIL. Implementar; rodar: PASS; suíte inteira verde; commit `feat: núcleo da cotação automática`.

### Task 2: rede

**Files:** Create `js/dados/cotacoes-remoto.js`; Test `tests/dados/cotacoes-remoto.test.js` (com `fetch` falso)

**Interfaces:**
- Produces: `buscarSugestoes(texto, { fetch }) -> [{ ticker, nome, preco, tipo, subTipo }]` (até 8; [] se menos de 2 letras ou erro);
  `buscarPreco(ticker, { fetch }) -> number|null`; `atualizarCotacoes(tickers, { fetch, guardadas, agora, espera }) -> { cotacoes, falhou }`;
  `precisaAtualizar(guardadas, tickers, agora) -> boolean` (mais de 15 min ou ticker novo).

- [ ] Testes: resposta real simplificada (`stocks[{stock,name,close,type,subType}]`); `buscarPreco` escolhe o ticker exato (ITUB4,
  não ITUB4F); resposta quebrada/HTTP 429/rede fora → null sem lançar; `atualizarCotacoes` mantém o valor guardado de quem
  falhou, para ao primeiro 429, marca `em`; `precisaAtualizar` por tempo e por ticker novo.
- [ ] FAIL → implementar → PASS → suíte → commit.

### Task 3: telas e versão 94

**Files:** Modify `js/ui/carteira-ativos.js`, `js/ui/inicio.js`, `sw.js`, `js/versao.js`, `tests/dados/sw.test.js`, `README.md`, `css/app.css` (só se faltar estilo)

- [ ] Adicionar investimento: busca com resultados, escolha, cotas e preço pago (valor calculado na hora), nota da privacidade,
  link "É outro tipo". Folha do papel automático: preço de hoje com data, "Comprei mais / Vendi". Linha da lista: "12 cotas · R$ 40,07".
- [ ] `inicio.js`: ao desenhar a Carteira, se há papéis automáticos e `precisaAtualizar`, busca em segundo plano, guarda no
  aparelho e, se `aplicarCotacoes` mudou algo, `ctx.salvar`; redesenha; falha: segue com o último preço.
- [ ] Versão 94, módulos novos no cache, README.
- [ ] `npm test` verde; desenhar Carteira › Ativos, a folha de adicionar (com busca falsa) e a folha do papel no Edge (claro e escuro).
- [ ] commit `feat: cotação automática na Carteira; versão 94`.
