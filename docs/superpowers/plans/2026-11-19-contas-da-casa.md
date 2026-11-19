# Contas da casa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um espaço "Contas da casa" no app, separado da aposentadoria, que divide as contas do mês entre duas pessoas em proporção à renda, como a planilha do casal, com o histórico dela importado.

**Architecture:** Estado próprio em `casa.json` no repositório privado, com armazém (cópia local + GitHub) reaproveitado por prefixo e mescla em 3 vias campo a campo. A lógica fica em `js/core/casa.js` (mês, previsão, divisão, mutações) e `js/core/casa-ano.js` (resumo do ano), pura e testada. Três telas novas (`casa`, `casa-ano`, `casa-ajustes`) com menu próprio; o espaço é lembrado por aparelho. Um script importa a planilha uma vez.

**Tech Stack:** JavaScript puro (ESM), `node --test`, CSS com os tokens de `css/app.css`, Node `zlib` só no script de importação.

**Spec:** `docs/superpowers/specs/2026-11-19-contas-da-casa-design.md`

## Global Constraints

- Sem bibliotecas nem build; elementos com `h()` de `js/ui/dom.js`; cores só pelos tokens de `css/app.css` (claro e escuro); celular de 412 px.
- `dados.json`, motor e telas da aposentadoria não mudam (só as entradas: Mais, assistente e o menu).
- Textos exatos: "Contas da casa", "Mês", "Ano", "Ajustes", "a confirmar", "{N} valor(es) a confirmar", "{Nome} paga", "sobra {R$}", "Quem ganha mais paga mais: cada um paga {P}% do que ganha.", "Ver {N} conta(s) sem valor", "Em {mês}: {R$}", "Tirar o valor deste mês", "Anotar uma compra", "Pronto, fatura conferida", "Digitar só o total da fatura", "{n} de {N}", "Ir para o planejador de aposentadoria", "Não uso mais", "Voltar a usar", "Adicionar conta", "Só quer as contas da casa?".
- Mês = mês em que as contas são pagas; meses no formato `'AAAA-MM'`; valores em reais arredondados a centavos para exibição e divisão.
- Chaves do aparelho: `projetoR.casa.estado|sha|pendente|base|estado.corrompido` e `projetoR.espaco` (`'casa'|'aposentadoria'`).
- `sw.js` e `js/versao.js`: `VERSAO = 'projeto-r-v6'`; todo arquivo novo de `js/` na `CASCA`.
- Nenhum dado real no repositório público (testes e capturas com números inventados).

## Review Focus

- **Dados de outro aparelho chegando com uma folha aberta ou campo em foco:** o valor digitado não pode sumir. A folha recebe `data-sem-recarregar`, e `receberCasa` não redesenha enquanto alguém digita. Teste: Task 3 (mescla de dois aparelhos no mesmo mês) e conferência na Task 5.
- **Mês sem salários (ou só um salário):** não pode dividir por zero. Sem renda, mostra o pedido de salários; com um salário só, essa pessoa paga tudo. Teste: Task 1, `resumoDoMes` sem renda e com uma renda.
- **Conta arquivada ou ausente numa aba antiga:** não pode ganhar valor inventado pela previsão no passado. Teste: Task 1 (arquivada não prevê) e Task 8 (conta ativa ausente vira 0 nos meses reais).
- **Apagar uma parcela no meio:** apaga a parcela e as seguintes, e as anteriores ficam. Uma fatura conferida acompanha a nova soma. Teste: Task 1, `apagarCompra`.
- **Aparelho conectado que ainda não baixou o `casa.json`:** não pode oferecer "Começar" e criar uma casa duplicada. Mostra "Carregando as contas…" até sincronizar. Teste: Task 5, `estadoDaTela` (função pura exportada pela tela).

---

### Task 1: Núcleo do mês da casa

**Files:**
- Create: `js/core/casa.js`
- Test: `tests/core/casa.test.js`

**Interfaces:**
- Produces (tipos: `Casa = { schemaVersion: 1, pessoas: [{id, nome}] (2), contas: [{id, nome, compraPorCompra, arquivada}], meses: [{mes, salarios: {}, valores: {}, compras: [{id, contaId, nome, valor, grupo?, parcela?: {n, de}}]}] }`):
  - `SCHEMA_CASA = 1`; `centavos(n) → number`
  - `criarCasa({ nomes: [a, b], novoId }) → Casa` — pessoas `p1`/`p2`; contas Condomínio, Água, Luz, Internet e Cartão da casa (`compraPorCompra: true`)
  - `migrarCasa(estado) → Casa` — lança `Error('versao-desconhecida')` se `schemaVersion !== 1`
  - `primeiroMes(casa) → 'AAAA-MM'|null`
  - `valorDaConta(casa, mes, contaId) → { valor, situacao: 'confirmado'|'a-confirmar'|'vazio', compras, deOnde: 'AAAA-MM'|null }`
  - `salarioNoMes(casa, mes, pessoaId) → { valor, situacao, deOnde }`
  - `resumoDoMes(casa, mes) → { mes, contas: [{conta, valor, situacao, compras, deOnde}], semValor: [conta], total, aConfirmar, renda, divide, fatiaDaRenda: number|null, pessoas: [{pessoa, salario, situacaoSalario, deOnde, fatia, paga, sobra}] }`
  - Mutações puras (devolvem uma `Casa` nova): `salvarValor(casa, {mes, contaId, valor})` (`valor: null` apaga), `salvarSalario(casa, {mes, pessoaId, valor})`, `adicionarCompra(casa, {mes, contaId, nome, valor, vezes, novoId})`, `apagarCompra(casa, {mes, compraId})`, `conferirFatura(casa, {mes, contaId})`, `adicionarConta(casa, {nome, compraPorCompra, novoId})`, `editarConta(casa, contaId, {nome?, compraPorCompra?, arquivada?})`, `moverConta(casa, contaId, delta)`, `renomearPessoa(casa, pessoaId, nome)`

- [ ] **Step 1: Escrever os testes** (casa de teste com ids fixos `c1..c4`, cartão `c4`):
  - `criarCasa({nomes:['Ana','Bia'], novoId})`: 2 pessoas `p1`/`p2`, 5 contas, só o cartão com `compraPorCompra`; `migrarCasa({schemaVersion:2})` lança `/versao-desconhecida/`.
  - Previsão: Luz 100 digitada em `2026-10` e nada em `2026-11` → `{valor:100, situacao:'a-confirmar', deOnde:'2026-10'}`. Digitar 120 em novembro → `confirmado`. Sem nenhum valor → `{valor:0, situacao:'vazio'}`. Conta arquivada com valor em outubro → em novembro, `vazio`.
  - Cartão: compras de 50 e 30 em novembro sem confirmar → `{valor:80, situacao:'a-confirmar'}`. `conferirFatura` → `confirmado`, e `valores.c4 === 80`. `adicionarCompra` de mais 20 → valor 100 e `valores.c4 === 100`.
  - `adicionarCompra({vezes:3, valor:40})` em `2026-11` → compras em 11, 12 e `2027-01`, mesmo `grupo`, `parcela` 1, 2 e 3 de 3. `apagarCompra` da parcela de dezembro → sobra só a de novembro.
  - `resumoDoMes` com contas 600 + 400 e salários 7500 e 2500 → total 1000, `fatiaDaRenda` 0.1, pessoas pagam 750 e 250, sobras 6750 e 2250. Contas 100 com salários 1 e 2 → pagam 33,33 e 66,67 (somam 100). Sem salários → `divide:false`, `paga:null`. Com um salário só (o outro 0) → quem tem salário paga tudo.
  - `resumoDoMes`: conta ativa com 0 vai para `semValor`; arquivada com 0 não aparece; `aConfirmar` conta as contas e os salários previstos.
  - `moverConta(c2, -1)` troca a ordem com `c1`; `editarConta(c3, {arquivada:true})`; `renomearPessoa(p2, 'Bea')`.
- [ ] **Step 2:** `node --test tests/core/casa.test.js` → FAIL (módulo inexistente)
- [ ] **Step 3: Implementar** `js/core/casa.js`. A previsão procura o mês anterior mais recente que tenha valor definido para a conta. No cartão, conta o mês com compras ou com valor digitado; contas arquivadas não são previstas. O `aConfirmar` ignora contas com valor 0.
- [ ] **Step 4:** `node --test tests/core/casa.test.js` → PASS
- [ ] **Step 5: Commit** `feat(casa): núcleo do mês — previsão, divisão pela renda e parcelas`

### Task 2: Resumo do ano

**Files:**
- Create: `js/core/casa-ano.js`
- Test: `tests/core/casa-ano.test.js`

**Interfaces:**
- Consumes: `resumoDoMes`, `primeiroMes` (Task 1)
- Produces: `resumoDoAno(casa, ano, mesAtual) → { ano, ate: 'AAAA-MM'|null, meses: [{mes, total, renda, divide, pessoas}], total, mediaMensal, renda, fatiaDaRenda, pessoas: [{pessoa, totalPago, mediaPaga, mediaSobra, mediaSalario}], porConta: [{conta, total, peso}] }`; `anosDisponiveis(casa, mesAtual) → number[]`

- [ ] **Step 1: Testes:**
  - Casa com dados de `2026-01` a `2026-03` e `mesAtual = '2026-02'`. O resumo de 2026 tem 2 meses e `ate` igual a `'2026-02'`.
  - Médias só dos meses que dividem (um mês sem salários entra no total, mas não na média de salário).
  - `porConta` vem em ordem decrescente e os pesos somam 1.
  - `fatiaDaRenda = total ÷ renda`.
  - Ano sem dados → `meses: []`, `total: 0`.
  - `anosDisponiveis` com primeiro mês em `2024-05` e mês atual `2026-11` → `[2024, 2025, 2026]`; sem dados → `[2026]`.
- [ ] **Step 2:** rodar → FAIL
- [ ] **Step 3: Implementar** `js/core/casa-ano.js`. Os meses vão de `max(primeiroMes, ano-01)` a `min(mesAtual, ano-12)`.
- [ ] **Step 4:** rodar → PASS
- [ ] **Step 5: Commit** `feat(casa): resumo do ano sem os defeitos da planilha`

### Task 3: Mescla em 3 vias e armazém por prefixo

**Files:**
- Create: `js/dados/mesclar-casa.js`
- Modify: `js/dados/armazem.js` (opções `prefixo`, `migrar`, `mesclar`)
- Test: `tests/dados/mesclar-casa.test.js`, `tests/dados/armazem.test.js`

**Interfaces:**
- Produces: `mesclarCasa({ base, local, remoto }) → Casa`; `criarArmazem({ armazenamento, cliente, prefixo = 'projetoR', migrar, mesclar })`

- [ ] **Step 1: Testes:**
  - Dois aparelhos no mesmo mês: o local digita a Luz e o remoto digita a Água → o resultado tem as duas.
  - Os dois anotam compras diferentes no cartão → o resultado tem as duas compras.
  - O local apaga uma compra que o remoto não mexeu → ela some.
  - O local renomeia uma conta e o remoto arquiva a mesma conta → nome novo e arquivada.
  - Mesmo campo alterado nos dois lados → vale o local.
  - Sem base (primeira sincronização) → une as listas.
  - `meses` voltam em ordem.
  - Armazém com `prefixo: 'projetoR.casa'` grava em `projetoR.casa.estado` e não toca `projetoR.estado`.
  - Conflito no armazém da casa usa o `mesclar` passado.
- [ ] **Step 2:** rodar → FAIL
- [ ] **Step 3: Implementar.** `mesclar3(base, local, remoto)` é recursiva:
  - igual à base de um lado → vale o outro lado;
  - objetos → chave a chave (chave apagada num lado e intacta no outro some);
  - listas de objetos com `id` ou `mes` → item a item, como `mesclarLista`, recursivo quando os dois mudaram;
  - o resto → vale o local.

  No armazém, as chaves passam a ser `${prefixo}.estado` e assim por diante, e os padrões continuam os de hoje.
- [ ] **Step 4:** `npm test` → PASS (inclusive os testes antigos do armazém)
- [ ] **Step 5: Commit** `feat(dados): casa.json com mescla campo a campo e armazém por prefixo`

### Task 4: Espaços, rotas e menu da casa

**Files:**
- Modify: `js/ui/rotas.js`, `js/app.js`, `index.html`, `css/app.css`, `js/ui/mais.js`, `js/ui/boas-vindas.js`, `js/ui/atualizacao.js`
- Test: `tests/ui/rotas.test.js`, `tests/ui/atualizacao.test.js`

**Interfaces:**
- Produces:
  - `TELAS` com `'casa', 'casa-ano', 'casa-ajustes'` no fim.
  - `resolverRota(hash, temEstado, espaco = 'aposentadoria')`.
  - `ehDaCasa(rota) → bool`.
  - `parametroDoHash(hash, nome) → string|null`.
  - `depoisDeSalvar(hash, folha, tela = 'mes')`.
  - `ctx.casa`, `ctx.casaSincronizada` e `ctx.salvarCasa(mutacao) → Promise<{estado, aviso?}>`.
- Consumes: `migrarCasa` (Task 1), `mesclarCasa` e o armazém com prefixo (Task 3).

- [ ] **Step 1: Testes:**
  - `resolverRota('', false, 'casa') === 'casa'`.
  - `resolverRota('#/casa-ano', false) === 'casa-ano'`.
  - `resolverRota('#/inicio', false, 'casa') === 'boas-vindas'`.
  - `resolverRota('#/xyz', true, 'casa') === 'casa'`.
  - `resolverRota('', true) === 'inicio'`.
  - `abaDoMenu('casa-ano') === 'casa-ano'`.
  - `parametroDoHash('#/casa?mes=2026-10&folha=x', 'mes') === '2026-10'`.
  - `depoisDeSalvar('#/casa', 'x', 'casa') === 'redesenhar'`.
  - `podeRecarregar` aceita `#/casa` sem folha.
- [ ] **Step 2:** rodar → FAIL
- [ ] **Step 3: Implementar.**
  - **Rotas:** como nas interfaces acima.
  - **`app.js`:** segundo armazém (`criarClienteGitHub({..., caminho: 'casa.json'})`). `carregarLocal` na abertura. Sincroniza em segundo plano com `receberCasa`, que só redesenha numa rota da casa sem campo em foco. `conectar` carrega as duas. O evento `online` reenvia as duas.
  - **Espaço:** grava `projetoR.espaco` a cada rota (as da casa → `'casa'`, as outras → `'aposentadoria'`; o assistente não muda).
  - **Classes do `body`:** `espaco-casa` nas rotas da casa; `sem-abas` no assistente e na casa sem estado.
  - **Menu:** marcar `.menu a`.
  - **`index.html`:** `nav.menu.menu-aposentadoria` (o de hoje) e `nav.menu.menu-casa` com Mês (`#/casa`), Ano (`#/casa-ano`) e Ajustes (`#/casa-ajustes`), cada um com ícone SVG de traço 1.8.
  - **CSS:** mostrar o menu do espaço atual; grade de 3 colunas no da casa.
  - **Mais:** primeiro item "Contas da casa / Quanto cada um paga das contas".
  - **Assistente, passo 1:** cartão "Só quer as contas da casa?" com o botão "Abrir as contas da casa" para `#/casa`.
  - **`TELAS_SEGURAS`:** acrescentar `casa` e `casa-ano`.
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5: Commit** `feat(casa): espaço próprio com menu Mês, Ano e Ajustes`

### Task 5: Tela Mês da casa

**Files:**
- Create: `js/ui/casa.js`, `js/ui/conectar.js`
- Modify: `css/app.css`
- Test: `tests/ui/casa.test.js`

**Interfaces:**
- Consumes: Task 1 (`resumoDoMes`, mutações, `criarCasa`, `primeiroMes`), Task 4 (`ctx.casa`, `ctx.salvarCasa`, `parametroDoHash`, `folhaAberta`, `depoisDeSalvar`)
- Produces:
  - `estadoDaTela({ casa, conectado, casaSincronizada }) → 'mes'|'carregando'|'comecar'`;
  - `mesDaTela(hash, hoje) → 'AAAA-MM'` (parâmetro válido ou o mês de `hoje`);
  - `render`/`atualizar(container, ctx)`;
  - `cartaoConectar(ctx, { titulo, texto }) → Element` em `js/ui/conectar.js`.

- [ ] **Step 1: Testes:**
  - `estadoDaTela({casa:null, conectado:true, casaSincronizada:false}) === 'carregando'`.
  - `estadoDaTela({casa:null, conectado:true, casaSincronizada:true}) === 'comecar'`.
  - `estadoDaTela({casa:null, conectado:false}) === 'comecar'`.
  - Com casa → `'mes'`.
  - `mesDaTela('#/casa?mes=2026-10', '2026-11-19') === '2026-10'`.
  - Parâmetro inválido → `'2026-11'`.
- [ ] **Step 2:** rodar → FAIL
- [ ] **Step 3: Implementar** a tela como no desenho (§Telas › Mês).
  - **Navegação:** setas trocam `?mes=` (não passam do primeiro mês com dados nem de 12 meses à frente). "Voltar para este mês" quando o mês é outro.
  - **Folhas** `conta-<id>`, `salario-<id>` e `cartao-<id>`, com `data-sem-recarregar`. Abrir e fechar pelo histórico, como em `js/ui/mes.js`.
  - **Tela de começo:** dois nomes e "Começar", que chama `salvarCasa(() => criarCasa(...))`. Mais o `cartaoConectar` quando não há conexão.
  - **`.casa-*`:** usar os componentes que já existem (`cartao`, `linha`, `.tarefa`, `.folha`).
- [ ] **Step 4:** `npm test` → PASS. Com `npm run servir`, abrir `#/casa` com dados inventados e conferir as folhas e o botão voltar.
- [ ] **Step 5: Commit** `feat(casa): tela do mês com divisão, contas, cartão e salários`

### Task 6: Tela Ano

**Files:**
- Create: `js/ui/casa-ano.js`
- Modify: `css/app.css`

**Interfaces:**
- Consumes: `resumoDoAno`, `anosDisponiveis` (Task 2), `parametroDoHash` (Task 4)

- [ ] **Step 1:** Carregar a skill `dataviz` antes de desenhar as barras.
- [ ] **Step 2: Implementar** como no desenho (§Telas › Ano).
  - **Navegação:** `?ano=`, com setas limitadas a `anosDisponiveis`.
  - **Barras:** horizontais em CSS, numa cor só, rótulo e valor em texto, e cada linha de mês é um link para `#/casa?mes=`.
- [ ] **Step 3:** `npm test` → PASS (`tests/ui/modulos.test.js` carrega o módulo)
- [ ] **Step 4: Commit** `feat(casa): resumo do ano`

### Task 7: Ajustes da casa

**Files:**
- Create: `js/ui/casa-ajustes.js`

**Interfaces:**
- Consumes: mutações de contas e pessoas (Task 1), `cartaoConectar` (Task 5)

- [ ] **Step 1: Implementar** como no desenho (§Telas › Ajustes).
  - Cada mudança salva na hora: nome ao sair do campo; compra por compra, subir/descer e "Não uso mais" ao tocar.
  - "Adicionar conta" exige nome.
  - "Ir para o planejador de aposentadoria" grava o espaço e leva a `#/inicio`.
- [ ] **Step 2:** `npm test` → PASS
- [ ] **Step 3: Commit** `feat(casa): ajustes — pessoas, contas e sincronização`

### Task 8: Importação da planilha

**Files:**
- Create: `scripts/planilha-casa.mjs` (`lerXlsx`, `importarPlanilha`), `scripts/importar-planilha.mjs` (linha de comando)
- Test: `tests/scripts/planilha-casa.test.js`, `tests/scripts/xlsx-falso.js` (monta um xlsx em memória com `zlib.deflateRawSync` e `zlib.crc32`)

**Interfaces:**
- Produces: `lerXlsx(buffer) → [{ nome, celula(ref) → string|number|null }]`; `importarPlanilha(abas, { hoje, novoId }) → { casa, avisos: string[] }`

- [ ] **Step 1: Testes** (planilha falsa com abas `2025`, `2026` e `2027` e uma aba de compras):
  - Nomes:
    - pessoas tiradas dos cabeçalhos;
    - "Apê" e "Apartamento" são a mesma conta;
    - `CARTÃO CASA` vira "Cartão Casa" e `IPTU` continua;
    - conta fora da aba mais recente fica arquivada.
  - Meses e valores:
    - aba de 2027 ignorada com `hoje` em 2026;
    - mês real com zero guarda 0;
    - conta ativa ausente numa aba antiga vira 0 nos meses reais;
    - mês sem salário guarda só os valores diferentes de zero e nenhum salário;
    - valores com resto de ponto flutuante (`74.040000000000006`) viram centavos.
  - Compras do cartão:
    - a coluna NOVEMBRO vira compras de `2026-12` na conta do cartão, que passa a ter `compraPorCompra`;
    - itens repetidos em colunas seguidas ganham o mesmo `grupo`;
    - total diferente do valor da conta gera um aviso;
    - no mês com compras, o valor do cartão não é gravado.
- [ ] **Step 2:** rodar → FAIL
- [ ] **Step 3: Implementar.**
  - **Zip:** ler o diretório central, inflar com `zlib.inflateRawSync` (método 8) ou copiar (método 0).
  - **XML:** expressões regulares, como as do leitor de `scripts/` (strings compartilhadas, `<c r t><v>`).
  - **Linha de comando:** `node scripts/importar-planilha.mjs <xlsx> <saida.json> [--hoje AAAA-MM-DD]` imprime os avisos e um resumo por ano (meses, total das contas, renda).
- [ ] **Step 4:** rodar → PASS
- [ ] **Step 5: Commit** `feat(scripts): importa a planilha da casa para casa.json`

### Task 9: Publicação, versão e conferência visual

**Files:**
- Modify: `sw.js` (`VERSAO 'projeto-r-v6'`, casca), `js/versao.js`, `tests/dados/sw.test.js` (versão 6), `README.md` (seção "Contas da casa"), `index.html` (descrição)
- Create: `scripts/gerar-casa-exemplo.mjs <saida.json>` (gera `{ "projetoR.casa.estado": Casa }` inventada em volta do mês atual)

- [ ] **Step 1:** Subir a versão e a casca e rodar `npm test` → PASS.
- [ ] **Step 2: Fotografar as telas.**
  - Comando: `node scripts/capturar-telas.mjs <pasta> --rotas casa,casa-ano,casa-ajustes,casa?folha=<cartão>,mais --local <exemplo.json>` (servidor rodando).
  - Sem erros na página.
  - Conferir as fotos nos temas claro e escuro: nada cortado em 412 px e o menu da casa aceso.
- [ ] **Step 3:** Rodar a importação na planilha real, com a saída fora do repositório. Conferir com a planilha os totais de cada ano e o que cada pessoa pagou, anotando o resultado só no controle local (nunca no repositório).
- [ ] **Step 4: Commit** `chore: versão 6, README e dados de exemplo da casa`

### Task 10: Entrega

- [ ] **Step 1:** Revisão de código do ramo inteiro (superpowers:requesting-code-review) e correções.
- [ ] **Step 2:** Gravar o `casa.json` importado em `rodolss/Projeto_R-dados` (`gh api -X PUT .../contents/casa.json`) **antes** de publicar.
- [ ] **Step 3:** Fazer push, abrir o PR e mesclar no `main` (GitHub Pages publica). Conferir que o site no ar serve `projeto-r-v6`.
