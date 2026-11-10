# Projeto R — Planejador de aposentadoria (design)

- **Data:** 2026-11-09
- **Status:** design acordado em conversa; aguardando aprovação final do documento.
- **Aviso:** este repositório é público. Nenhum dado pessoal do usuário (idade, salário, patrimônio, carteira) entra no código ou nos documentos. Todos os valores reais vivem apenas no repositório de dados privado.

## 1. Intenção e o porquê

Um único usuário, trabalhador CLT e leigo em investimentos, quer se aposentar em 10 anos. Ele quer um app que, todo mês, receba **o valor líquido que caiu na conta** e responda na hora **quanto separar para investir e onde aplicar**, reagindo às oscilações do mercado **sem nunca comprometer o estilo de vida atual**. Ele também quer saber, a qualquer momento, se está no caminho certo, e entender o próprio custo de vida (orçamento) para decidir quanto pode ou não gastar.

O app não prevê o mercado. Ele aplica **regras transparentes** (rebalanceamento por aportes + trajetória planejada) que fazem "comprar mais na baixa" sozinhas, e é honesto quando a meta não é alcançável.

**Estratégia escolhida pelo usuário: viver de renda.** Desde o primeiro aporte, a carteira é montada só com investimentos que pagam proventos (juros, dividendos, aluguéis de FII). Até a aposentadoria, todos os proventos são reinvestidos. Na aposentadoria, o usuário para de reinvestir e passa a viver deles, **sem precisar vender nada**. O indicador de progresso mais intuitivo passa a ser "quanto a carteira já me paga por mês" comparado com o custo de vida.

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos (v1)
1. Responder no dia do pagamento, em uma tela, quanto investir e em quais ativos, com explicação simples do porquê.
2. Ajudar a montar e manter um orçamento por categorias que define o custo de vida.
3. Mostrar um painel que diga se o usuário está no caminho, quanto está acima ou abaixo e quando cada meta chega no ritmo atual.
4. Guardar o histórico mensal e sincronizar entre celular e computador.

### Não-objetivos (fora da v1)
Registro de gastos do dia a dia; cotação ou atualização automática de saldos; cálculo de imposto de renda; lembretes e notificações; recomendação de ações individuais; criptomoedas; simulação do INSS; múltiplos usuários.

### Anti-objetivos (seria um fracasso mesmo que funcionasse)
- Fingir que uma meta inviável é viável, ou esconder o tamanho da distância.
- Sugerir um aporte que invada o custo de vida ou a reserva de emergência.
- Projetar o futuro a partir do rendimento de poucos meses (prometer demais depois de uma alta).
- Mandar o usuário vender investimentos para corrigir a carteira.
- Usar jargão sem explicação: todo ativo e todo número tem uma frase em linguagem simples.
- Colocar dados pessoais no repositório público.

## 3. Restrições

- **Tecnologia:** HTML, CSS e JavaScript puros, com ES modules, sem framework e sem etapa de build. Sem dependências em tempo de execução; os gráficos são SVG feitos à mão.
- **Hospedagem:** GitHub Pages a partir do repositório `Projeto_R`, que passa a ser **público** (o plano gratuito do GitHub exige isso). O `index.html` antigo é removido; ele permanece no histórico e foi verificado: não contém dados pessoais.
- **Dados:** um repositório **privado** `Projeto_R-dados` guarda os dados do usuário. O app lê e grava nele pela API REST do GitHub, usando um **fine-grained personal access token** restrito a esse único repositório, com a permissão *Contents: read and write*. O token fica apenas no `localStorage` de cada aparelho.
- **Testes:** o Node.js LTS é instalado na máquina de desenvolvimento só para rodar os testes (`node --test`). Um workflow do GitHub Actions roda os testes a cada push. O app não depende de Node.
- **Idioma e moeda:** pt-BR e BRL. Números no formato brasileiro (R$ 1.234,56).
- **Interface:** mobile-first, responsiva e com tema claro ou escuro conforme o sistema (`prefers-color-scheme`).

## 4. O modelo financeiro

### 4.1 Unidade de conta: reais de hoje
- Todos os cálculos de plano e projeção são feitos em **termos reais** (descontada a inflação), com base no IPCA.
- Cada valor monetário informado pelo usuário (salário, saldos, orçamento, aportes) é guardado com o **mês** a que se refere, em valor nominal. Para comparar valores de meses diferentes, o app usa o índice acumulado do IPCA.
- **Exibição:** tudo aparece em "reais de hoje", ou seja, corrigido até o último IPCA disponível. Com isso, as metas mostradas sobem com a inflação, cumprindo o pedido de "reajuste anual conforme a inflação". *Decisão do designer:* o reajuste é aplicado sempre que sai um IPCA novo (mensal), em vez de uma vez por ano. É mais preciso e evita que a inflação de 11 meses pareça ganho.
- **Fonte do IPCA:** API SGS do Banco Central, série 433 (variação mensal), `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json`. O IPCA de um mês sai por volta do dia 10 do mês seguinte, então usa-se o último disponível. Se o navegador não conseguir acessar a API (CORS), o IPCA vira um campo manual nas configurações. **Isso precisa ser verificado no início da implementação.** O resultado é guardado em cache nos dados.

### 4.2 Premissas (editáveis)
- Taxa de retirada (SWR): **4% ao ano**.
- Rentabilidade real esperada da carteira: **5% ao ano**. Taxa mensal: `i = (1 + r)^(1/12) − 1`.
- Faixa de incerteza das projeções: rentabilidade ± 2 pontos percentuais (de 3% a 7% com os padrões).
- Prazo: **120 meses** a partir do mês de início do plano, que é o mês do primeiro uso.

### 4.3 Metas
- **Custo de vida mensal** `C = soma das categorias mensais + (soma das categorias anuais) / 12`. As despesas anuais entram porque, depois de aposentado, não há 13º para pagá-las.
- **🥇 Independência** `M1 = C × 12 / SWR`, com alvo no mês `início + 120`.
- **🏆 Renda plena** `M2 = salário líquido mensal × 12 / SWR`. São 12 salários: o 13º e as férias não entram. Não tem data-alvo; o app só projeta quando ela chega.
- **Renda alcançável no prazo** = patrimônio projetado no mês-alvo × SWR / 12.
- **Patrimônio para as metas** = soma dos saldos de tudo o que tem papel *carteira*, *caixa de oportunidade* ou *fora do plano*. Não entram a reserva de emergência nem o FGTS (que é opcional e só informativo). O INSS não é considerado.

### 4.4 Papéis dos investimentos
Cada investimento cadastrado tem um **papel**:
- `reserva`: reserva de emergência (Tesouro Selic). Não conta para as metas.
- `caixa`: caixa de oportunidade (Tesouro Selic). Conta para as metas.
- `carteira`: pertence a uma classe da carteira-alvo. Conta para as metas.
- `fora-do-plano`: tudo o que o usuário já tinha e não faz parte da carteira-alvo (poupança, CDB, ação individual, cripto...). Conta para as metas e recebe comentários no check-up; nunca recebe aportes novos.
- `fgts`: só informativo.

ETFs e FIIs guardam **quantidade de cotas**, além do saldo em reais, para permitir a atualização automática no futuro.

### 4.5 Do valor recebido ao valor investível (ordem de proteção)
Entradas do mês: `R` (valor líquido recebido) e, opcionalmente, os proventos. Configuração: `S` (salário líquido cadastrado), `Cm` (soma das categorias mensais) e `A` (soma das categorias anuais).

1. **Custo de vida primeiro.** Se `R ≤ Cm`, não há aporte. A mensagem é: "Este mês não invista nada, o seu dia a dia vem primeiro."
2. **Meses com valor a mais.** Se `R > S × 1,10`, o app pergunta "o que veio a mais?", com opções rápidas: 13º, Férias, PLR/bônus e Outro. *Decisão do designer, para proteger o estilo de vida no CLT:* em **Férias**, só o 1/3 constitucional conta como extra. O restante é o adiantamento do salário do mês seguinte (que virá menor), então fica guardado na conta, e o app soma esse valor ao `R` do mês seguinte. Os demais tipos são extra integral: `E = R − S`.
3. **Despesas anuais.** O extra cobre primeiro o que falta das despesas anuais do **ciclo anual**. *Decisão do designer:* o ciclo vai de **novembro a outubro**, alinhado ao 13º, que paga as despesas do começo do ano (IPVA, IPTU). No primeiro uso, o assistente pergunta quanto já está separado para o ciclo atual, para não guardar o mesmo dinheiro duas vezes. O app mantém um contador por ciclo de quanto já foi separado e mostra na resposta: "Separe R$ X para as despesas anuais (deixe na conta ou no Tesouro Selic)". Esse valor não é um investimento e não conta para as metas. Se os extras esperados no ano (13º ≈ `S` + 1/3 de férias ≈ `S/3`) não cobrirem `A`, o app desconta todo mês uma provisão `p = max(0, (A − extras esperados) / 12)`.
4. **Excedente do mês** `T = min(R, S) − Cm − p` mais o extra que sobrou depois do passo 3. Se `T ≤ 0`, não há aporte.
5. **Reserva de emergência.** Alvo: `6 × C`. Enquanto o saldo da reserva estiver abaixo do alvo, **todo** o excedente vai para ela. Se a reserva for usada numa emergência, volta a ter prioridade até se recompor.

### 4.6 Quanto vai para a carteira e para a caixa (trajetória)
- **Trajetória planejada:** é traçada a partir do mês de início, saindo do patrimônio inicial `P0` e chegando a `M1` no mês 120 com um aporte real constante:
  `PMT0 = (M1 − P0·(1+i)^120) · i / ((1+i)^120 − 1)`
  `Pplan(t) = P0·(1+i)^t + PMT0·((1+i)^t − 1)/i`
  *Decisão do designer:* quando `M1` ou as premissas mudam (por uma edição do orçamento, por exemplo), a trajetória é **recalculada desde o início do plano**, mantendo `P0` e o mês de início. Assim, "quanto o plano previa para hoje" reflete sempre a meta atual.
- **Aporte necessário** a partir do mês `t`, com patrimônio `P(t)`:
  `PMTnec(t) = (M1 − P(t)·(1+i)^(120−t)) · i / ((1+i)^(120−t) − 1)`. Se a meta já foi atingida, o valor é 0. Depois do mês 120, a meta passa a ser "o quanto antes" e todo o excedente é investido.
- **Mês de queda** (*decisão do designer*): o app mantém um **índice de desempenho** da carteira, sem a caixa. É uma rentabilidade real ponderada no tempo, calculada **só com os meses em que os saldos foram realmente atualizados**, então aportes e saldos estimados não o movem. Há queda quando o índice está **10% ou mais abaixo do pico**.
- **Regra do mês** (com a reserva completa), na ordem:
  1. **Em mês de queda:** nada vai para a caixa e **todo** o excedente `T` vai para a carteira. Além disso, o app sugere transferir **1/3 do saldo que a caixa tinha no início da queda** para a carteira, todo mês enquanto a queda durar (ou até a caixa zerar). Como o gatilho vem do mercado e não da comparação com a trajetória, a sugestão não se repete à toa, e a caixa nunca é enchida e esvaziada no mesmo mês.
  2. **Fora de queda, com `PMTnec ≥ T`:** **tudo** vai para a carteira; aporte = `T`.
  3. **Fora de queda, com `PMTnec < T`** (adiantado): a carteira recebe `max(PMTnec, 0)` e a diferença vai para a **caixa de oportunidade**, até a caixa atingir o teto de **6 × o excedente médio**. O que passar do teto vai para a carteira.
- Os **proventos** informados no mês são somados ao valor a distribuir na carteira, ou seja, são reinvestidos.

### 4.7 Divisão entre os ativos (rebalanceamento só com aportes)
- **Carteira-alvo padrão: carteira de renda, igual do início ao fim**, sem fases nem transição, e editável. São 4 classes, cada uma com um ativo padrão:
  - Renda fixa **40%**: Tesouro IPCA+ com Juros Semestrais.
  - FIIs **25%**: XFIX11 (fundo que reúne vários FIIs).
  - Ações BR **25%**: ETF de dividendos (ex.: DIVO11).
  - Exterior **10%**: IVVB11. Não paga proventos (reinveste sozinho); fica na carteira como **proteção** contra concentração no Brasil e, na aposentadoria, funciona como reserva extra. O app explica isso ao usuário.
  - Como a carteira já nasce gerando renda, **nunca é preciso vender** para "virar" uma carteira de renda. A regra de nunca vender vale sem exceções.
  - *Decisão do designer:* os percentuais e os ativos padrão acima são um ponto de partida, e o usuário pode editar tudo. Os tickers sugeridos são exemplos, não uma recomendação profissional, e o app deixa isso claro.
- **Algoritmo:** com os valores atuais por classe `Vc`, o aporte `X` e `Tot = ΣVc + X`, o alvo de cada classe é `wc·Tot` e o déficit é `dc = max(0, wc·Tot − Vc)`. Se `Σdc ≥ X`, o aporte é dividido na proporção dos déficits. Caso contrário, os déficits são preenchidos e a sobra é dividida pelos pesos. Nunca há sugestão de venda.
- **Apresentação:** valor em R$ por ativo, mais uma estimativa em cotas para ETFs e FIIs, usando o preço implícito (saldo / cotas) ou um preço informado. A sobra de arredondamento vai para a classe de renda fixa.
- **"Por quê":** uma frase gerada a partir do maior déficit e da variação da classe em relação ao mês anterior. Exemplo: "A bolsa brasileira caiu este mês e ficou abaixo do alvo, então o BOVA11 recebe uma fatia maior."

### 4.8 Saldos desatualizados
*Decisão do designer:* entre uma atualização e outra, o saldo **estimado** de cada investimento é o último saldo informado, **corrigido pela rentabilidade da premissa** desde então, mais os aportes registrados. Sem essa correção, o patrimônio pareceria ficar para trás da trajetória (que cresce 5% ao ano) só porque o usuário não atualizou os saldos. Valores estimados aparecem marcados como "estimado". Se a atualização mais recente tiver mais de 35 dias, um aviso amarelo sugere atualizar. O aviso é opcional e nunca bloqueia a resposta.

### 4.9 Projeções e status (painel)
- **Ritmo:** média dos aportes **realizados** (carteira + caixa; a reserva não entra) nos últimos 6 meses, ou desde o início se houver menos de 6 meses.
- **Sem histórico suficiente** (*decisão do designer*): enquanto houver menos de 3 meses de aportes na carteira, a projeção usa o **excedente esperado** (`S − Cm − p`), identificado como "baseada no seu excedente esperado (ainda sem histórico)". Se a reserva ainda estiver em formação, a projeção simula primeiro os meses que faltam para completá-la e só depois os aportes na carteira. Assim, o painel não fica vermelho só porque o usuário está, corretamente, formando a reserva.
- **Projeção:** parte de `P(t)` com o ritmo atual, à taxa da premissa. Calcula a data de `M1` e de `M2` e a faixa (premissa ± 2 pp). A busca vai até 50 anos; acima disso, a meta é tratada como "não alcançada nesse ritmo". **O rendimento observado nunca entra na projeção**: ele aparece num cartão separado ("rendimento real desde o início"), cujo método de cálculo fica a critério do construtor.
- **Status** (compara a data projetada de `M1` com a data-alvo): 🔵 adiantado (3 meses ou mais antes), 🟢 no caminho (dentro de ±3 meses), 🟡 até 12 meses de atraso, 🔴 mais de 12 meses ou não alcançável. *Os limites são decisão do designer.*
- **Ação sugerida:** quando há atraso, mostra `PMTnec − ritmo` em R$ por mês a mais, ou "espere: uma alta da bolsa também fecha a diferença".
- **"Sua carteira já te paga"**: é o **indicador principal** do painel, logo abaixo do status. Mostra a média mensal dos proventos registrados nos últimos 12 meses (ou desde o início), comparada com o custo de vida `C` e com o salário, com uma barra de progresso. Exemplo: "R$ 410 de R$ 5.500 por mês". As metas em patrimônio (`M1`, `M2`) e a trajetória continuam guiando o cálculo do aporte. *Decisão do designer:* quando os proventos passarem de 4% ao ano do patrimônio, o app sugere, na aposentadoria, reinvestir o excedente para proteger a carteira da inflação. Isso é só informativo na v1.

### 4.10 Check-up da carteira (regras v1)
- Uma classe abaixo do alvo por mais de 5 pp: os próximos aportes vão priorizá-la.
- Uma classe acima do alvo por mais de 10 pp: apenas um aviso (sem venda).
- Poupança: rende menos que o Tesouro Selic; sugere considerar transferir para a reserva ou para a caixa.
- Qualquer outro item `fora-do-plano`: explica o que é e sugere não fazer novos aportes nele.
- Estado da reserva (completa ou formando) e estado da caixa (vazia, com saldo ou no teto).
- Saldos desatualizados há mais de 35 dias.

### 4.11 Orçamento
- Lista sugerida de categorias: moradia, condomínio, contas da casa, mercado, transporte, saúde/plano, educação, assinaturas, cuidados pessoais, lazer, pets, presentes, e anuais (IPVA, IPTU, seguros, material escolar, viagem). O usuário marca, cria, edita e remove categorias a qualquer momento.
- Cada categoria tem um nome, um tipo (mensal ou anual) e um valor.
- **Impacto ao vivo:** ao editar o valor de uma categoria, o app mostra o efeito na data projetada de `M1`. Exemplo: "+R$ 300/mês = 5 meses mais tarde".
- A cada 6 meses, um banner sugere revisar o orçamento.

## 5. Telas e fluxos

1. **Primeiro uso** (assistente em passos):
   1. Conectar os dados: um passo a passo para criar o token e colar no app. Se já existirem dados no repositório (segundo aparelho), o app os carrega e pula o resto do assistente.
   2. Dados básicos: salário líquido, se recebe 13º e férias (padrão: sim) e quanto já tem separado para as despesas anuais do ciclo atual.
   3. Orçamento (seção 4.11).
   4. Investimentos atuais: nome, papel, classe, saldo e cotas. Pode ficar vazio.
   5. Carteira-alvo: mostra a padrão, com edição opcional.
   6. Veredito: as duas metas, o aporte necessário comparado ao excedente e as datas projetadas, ditos com honestidade. Se `M1` não couber em 10 anos, o app diz em quanto tempo cabe e qual renda é alcançável no prazo.
2. **Mês (tela inicial):** pergunta "Quanto caiu na sua conta este mês?" e mostra a resposta ao vivo, na mesma tela: valor a investir, valor para o dia a dia, lista "onde aplicar" (ativo + frase simples + R$), o "por quê", avisos e o botão **"Já apliquei"**. Esse botão registra o valor aplicado por ativo (editável, caso tenha sido diferente do sugerido) e atualiza os saldos estimados. Na mesma tela, há uma opção para atualizar os saldos e o campo **"proventos recebidos este mês"** (com a dica "veja no extrato da corretora"). O campo não é obrigatório, mas é parte central do lançamento, porque alimenta o indicador principal do painel. Existe um lançamento por mês-calendário: abrir o app de novo no mesmo mês edita o lançamento existente. Esboço de referência: opção "A" da sessão de design.
3. **Painel:** status, números principais, gráfico "até a meta" (plano, real, projeção e faixa), gráfico de zoom dos últimos meses e check-up. Esboço de referência: o painel da sessão de design.
4. **Orçamento:** edição das categorias com o impacto ao vivo.
5. **Histórico:** lista mês a mês (recebido, sugerido, aplicado, patrimônio, proventos), com detalhe e correção de cada mês. Cada lançamento guarda uma **cópia da sugestão** feita na época.
6. **Configurações:** premissas, salário, carteira-alvo, ativos, conexão (token), IPCA manual se necessário, **exportar e importar backup em JSON** e voltar ao assistente.

## 6. Dados e sincronização

- Um arquivo `dados.json` no repositório privado, com um campo `schemaVersion` para migrações futuras.
- **Esboço do esquema** (os nomes ficam a critério do construtor):
  - `config`: salário, mês de início, prazo, SWR, rentabilidade, flags de 13º e férias.
  - `orcamento[]`: id, nome, tipo, valor e mês de referência.
  - `ativos[]`: id, nome, ticker, papel, classe e frase explicativa.
  - `carteiraAlvo`: peso e ativo padrão de cada uma das 4 classes.
  - `meses[]`: mês, recebido, tipo do extra, proventos, saldos e cotas por ativo, sugestão (cópia), aplicado por ativo e valores pendentes (como o adiantamento de férias).
  - `contadoresAnuais`: valor já separado para as despesas anuais em cada ano.
  - `ipca`: série em cache.
- **Leitura e gravação** pela Contents API (`GET`/`PUT /repos/{owner}/Projeto_R-dados/contents/dados.json`), usando o `sha` para detectar conflito. **Em caso de conflito, vale a última gravação**: o app recarrega o remoto, reaplica a alteração local e avisa o usuário.
- **Offline e instalação no celular** (*decisão do designer*): o app é um **PWA**, com manifest e service worker. Pode ser adicionado à tela inicial do celular e abre mesmo sem internet. Os dados ficam numa cópia local no `localStorage`; o app funciona com ela e sincroniza quando a conexão voltar. A estratégia de cache e atualização do service worker fica a critério do construtor, desde que uma nova versão publicada chegue ao usuário sem ele ter que limpar o cache.
- **Segurança do token:** o token fica no `localStorage` da origem `<usuário>.github.io`, que é compartilhada por todos os sites do GitHub Pages da mesma conta. Em 2026-11-09, a conta **não tinha nenhum outro site** no Pages, então todo código nessa origem é do próprio usuário. O token só alcança o repositório de dados. Se algum dia um site com código de terceiros for publicado na mesma conta, o caminho é mover o app para um domínio próprio.
- O repositório `Projeto_R-dados` é criado na implementação (via `gh`), já como privado, com um `README` que explica que contém dados pessoais.

## 7. Qualidade e testes

- Toda a lógica financeira e as regras de negócio ficam em **módulos puros**, sem acesso ao DOM, compartilhados entre o navegador e o Node: conversão de taxas, PMT/NPER/VF, metas, ordem de proteção, trajetória, alocação, projeções, status, check-up, orçamento e normalização pelo IPCA.
- Esses módulos são desenvolvidos com **testes primeiro** (`node:test`), incluindo casos conhecidos do PMT e do NPER do Excel e os casos de borda da seção 4.5.
- A camada de sincronização é testada com um `fetch` simulado.
- A interface é verificada manualmente no navegador, em largura de celular e de computador, nos temas claro e escuro.
- O GitHub Actions roda `node --test` a cada push.

## 8. O que fica a critério do construtor

Organização de pastas e módulos; nomes do esquema de dados; como desenhar os gráficos em SVG; o método do "rendimento real desde o início"; o texto exato das mensagens (desde que seja simples, honesto e em pt-BR); o tratamento de meses sem lançamento nas médias; os detalhes visuais dentro do estilo limpo dos esboços.

## 9. Questões resolvidas na revisão do construtor

- **Migração para renda na reta final versus nunca vender:** resolvida pela escolha do usuário de montar uma **carteira de renda desde o início** (seções 1 e 4.7). Não há fases, transição nem vendas.
- **Caixa de oportunidade em queda:** gatilho baseado no índice de desempenho, com regras em ordem de precedência (seção 4.6).
- **Saldos desatualizados:** corrigidos pela premissa (seção 4.8).
- **Projeção sem histórico ou com a reserva em formação:** usa o excedente esperado (seção 4.9).
- **Despesas anuais no primeiro ciclo:** ciclo de novembro a outubro, com o valor já separado informado no assistente (seção 4.5).
- **Offline:** PWA (seção 6).
- **Token na origem compartilhada do GitHub Pages:** risco aceito e documentado (seção 6).

Não há questões em aberto.
