# Tela do Mês em lista (versão C) — desenho

Data: 2026-11-12. Protótipo escolhido pelo usuário: versão **C · Lista do mês** em https://claude.ai/artifact/BmTM5tQhFBijKwJoNMUcYy (números inventados).

## Por quê

O usuário acha a aba **Mês** confusa por três motivos:

1. **Proventos caem em dias diferentes.** O campo atual é "Recebeu proventos este mês?". No dia do salário (quando ele registra), os proventos do mês ainda não caíram, e ele teria de esperar o mês fechar para informar.
2. **A ordem dos saldos não é clara.** "Atualizar saldos (copie da corretora)" fica num quadro separado no fim da tela. Os saldos precisam ser copiados **antes** de aplicar o dinheiro do mês (o app soma o aporte do mês por cima do saldo digitado) e mudam a divisão sugerida, mas nada na tela diz isso.
3. **Depois de registrar, a tela continua igual**, com o formulário preenchido e só um aviso pequeno no topo. Ele quer ver "já registrou este mês" e ter como editar.

## Objetivos

A aba Mês vira uma **lista com as 4 tarefas do dia do pagamento**, como no protótipo C:

- **Cabeçalho:** "Dia de pagamento de novembro" (o nome do mês em minúsculas, como no protótipo), "N de 4 feitos" e uma barra de 4 partes. Logo abaixo, a frase que já existe hoje: "Faltam X para a renda plena." (ou a variante de mais de 50 anos).
- **Cada tarefa é uma linha tocável** (bolinha com o número ou ✓, título, situação, seta). Tocar abre uma **folha por baixo** (bottom sheet) com o conteúdo da tarefa. Fechar: botão "Fechar", toque fora da folha ou **botão voltar do celular** (no app Android, voltar fecha a folha e não sai da tela).

As tarefas:

1. **Salário que caiu.** O campo de hoje ("O salário líquido que entrou, livre na mão."). Se o valor passar de 1,1× o salário, a mesma folha mostra a pergunta de hoje "O que veio a mais este mês?" com os chips 13º / Férias / PLR/bônus / Outro (regra `perguntarExtra`, sem mudança). **Salvar** marca a tarefa como feita. Situação na linha: o valor, ou "Falta preencher".
2. **Proventos desde o último registro.** Campo com a dica: "Dividendos, aluguéis de FIIs e juros do Tesouro que caíram desde DD/mmm, o seu último registro. Veja no extrato da corretora." A data é a do último mês registrado (`data` do último item de `meses`). Sem nenhum registro, a dica diz "desde que você começou". Tem o botão **"Não caiu nada"** (valor 0). **Salvar** marca como feita, mesmo com 0. Situação: o valor, ou "Desde DD/mmm".
3. **Saldos da corretora** (opcional). Os mesmos campos de hoje (todos os ativos menos FGTS, valor e cotas onde já há cotas), já preenchidos com o valor estimado, como hoje. Dica: "Copie antes de aplicar o dinheiro deste mês. Deixa a divisão mais precisa." Botões **"Usar estes saldos"** (situação "Atualizados em DD/mmm") e **"Pular"** (situação "Pulado: o app estima"). Antes de decidir, a situação é "Opcional". Só o que o usuário editou vira saldo digitado; o resto continua estimado, como hoje.
4. **Investir.** Bloqueada até as tarefas 1, 2 e 3 estarem feitas (a 3 vale como feita se foi pulada). A situação mostra "Libera depois das tarefas 1 a 3" e, depois, "Separe R$ X". A folha mostra **tudo o que a tela mostra hoje** depois de digitar o valor, sem mudar regras nem textos:
   - "Separe para investir este mês" e o que fica para o dia a dia, ou os avisos de sem aporte;
   - os avisos de despesas anuais, provisão e "guarde para o mês que vem" das férias;
   - "Onde aplicar", com reserva, caixa de oportunidade, da caixa para a carteira e as sugestões por ativo com cotas;
   - o "Por quê?", o aviso de saldos desatualizados, o aviso de IPCA e a nota de saldos estimados;
   - o botão "Já apliquei" ou "Registrar este mês" e a confirmação "Quanto você aplicou de fato?" com **Confirmar**.

   Confirmar registra o mês exatamente como hoje: `registrarAplicacao`, com os saldos da tarefa 3 se foram usados, e toast "Mês registrado! 👏".

**O mês registrado:**
- **Cabeçalho:** "✓ Novembro registrado", "em DD/mmm · R$ X aplicados" e a barra cheia.
- **As 4 linhas:** marcadas com os valores registrados.
- **Embaixo:** os botões **"Editar registro"** (secundário) e **"Atualizar só os saldos"** (link).

**Editar registro:**
- Abre a lista em modo edição, com o aviso "Editando o registro de novembro. Ao confirmar, os valores novos substituem os antigos." Tocar numa linha do mês registrado também entra em edição.
- As tarefas 1 a 3 vêm preenchidas com o que foi registrado e marcadas como feitas. A tarefa 4 precisa ser confirmada de novo.
- Confirmar substitui o registro, que é o comportamento atual de `registrarAplicacao`: a data da primeira aplicação continua a mesma, e sem mudanças vale o `aplicado` salvo, como o `usarSalvo` de hoje. O toast diz "Registro atualizado.".
- **Não existe "apagar registro"**: o usuário recusou.

**Atualizar só os saldos:** abre a folha da tarefa 3 e salva com `registrarSaldos`, como o "Salvar só os saldos" de hoje. O registro não muda. Toast "Saldos salvos.".

**Início:** o cartão "Dia de pagamento? / Abrir" vira, com o mês atual registrado:
- **Título:** "✓ Novembro registrado";
- **Texto:** "R$ X aplicados em DD/mmm";
- **Botão:** "Ver", que leva a `#/mes`.

No mês seguinte o cartão volta ao normal.

**Continua como está:**
- o aviso de 6 meses sem revisar o orçamento, no topo do Mês;
- a regra dos lembretes (registrar o mês tira os lembretes dele);
- o motor e todas as contas;
- o formato dos dados salvos.

## Não objetivos

- Estimar ou buscar proventos automaticamente.
- Dica com a média dos proventos dos últimos meses (o usuário recusou).
- Apagar um registro.
- Mudar regras, textos da sugestão ou o formato de `dados.json`.
- Mudar o app Android: a mudança é só no site, que o app carrega.

## Restrições

- JavaScript puro em módulos, sem bibliotecas. Elementos com `h()` e os componentes de `js/ui/dom.js`. Cores e fontes pelos tokens de `css/app.css`, nos temas claro e escuro.
- Testes com `node --test` (`npm test`). A lógica que não é desenho fica em `js/core/` com testes: situação das tarefas, "N de 4 feitos", quando a tarefa 4 libera, data do último registro e rascunho.
- Toda a interface em português do Brasil, no tom da tela atual.
- Conferência visual com `node scripts/capturar-telas.mjs <pasta> --estado <arquivo>`, usando o histórico falso de `scripts/gerar-historico-falso.mjs` (novembro em aberto). Os dois scripts estão no ramo `dados-falsos`, base deste ramo.
- O service worker (`sw.js`) guarda a casca do site com a versão `VERSAO`. Mudar arquivos da casca pede subir essa versão, senão o celular continua com a tela antiga.
- No app Android, o botão voltar chama `web.goBack()` quando há histórico. Então abrir uma folha precisa criar uma entrada de histórico, e voltar precisa fechá-la.

## Decisões que tomei (o usuário delegou detalhes)

- **Rascunho no aparelho:**
  - O que já foi preenchido nas tarefas 1 a 3 fica guardado no `localStorage` do aparelho, sem sincronizar, até o mês ser registrado ou o mês virar.
  - Assim, sair do app para copiar os saldos na corretora não apaga nada.
  - O rascunho de outro mês é descartado.
- **"Atualizar só os saldos"** fica no mês registrado. O usuário viu no protótipo e não objetou.
- **Cartão do Início com o mês pela metade:** se há rascunho com 1 a 3 tarefas feitas e o mês não está registrado, o cartão diz "Dia de pagamento? · N de 4 feitos" e o botão vira "Continuar".
- **Ao abrir uma folha**, o foco vai para o primeiro campo.

### Resolvidas depois da checagem do desenho

- **Os valores nas linhas**:
  - "Separe R$ X" (linha 4) é o mesmo número do cartão "Separe para investir este mês" da folha (`excedente`, sem os proventos).
  - Sem aporte, a linha 4 diz "Este mês não sobra nada para investir" ou "O seu dia a dia vem primeiro", conforme o `motivo`.
  - "R$ X aplicados" (cabeçalho do mês registrado e cartão do Início) é a soma do `aplicado` salvo, já descontado o que saiu da caixa de oportunidade (itens negativos).
- **A linha 3 do mês registrado**: o registro não guarda quais saldos foram copiados. Por isso a linha diz "Atualizados em DD/mmm" quando há saldo digitado de algum ativo da carteira com data dentro do mês, e "O app estima" quando não há.
- **Saldos depois do registro só por "Atualizar só os saldos".** No mês registrado e na edição, tocar na tarefa 3 abre essa folha, que salva na hora e não depende da edição. Confirmar uma edição não regrava saldos (`saldosAtualizados = null`). Motivo: saldos copiados depois de aplicar já incluem o aporte do mês.
- **A folha "Atualizar só os saldos"**:
  - título "Atualizar saldos";
  - texto "Copie os valores como estão na corretora agora. O registro de novembro não muda.";
  - botões "Salvar saldos" e "Cancelar".
- **Saldos salvos no dia do registro**:
  - O problema: um saldo salvo por "Atualizar só os saldos" no mesmo dia do registro do mês já inclui o aporte, e o motor somaria o aporte de novo (o patrimônio ficaria inflado). Isso já acontece hoje com "Salvar só os saldos".
  - A solução: nesse caso, a tela grava, para cada ativo, o valor digitado **menos o que foi aplicado nele naquele mês** (somando de volta o que saiu da caixa), e sem cotas, para não distorcer o preço por cota. Assim o motor e o formato dos dados não mudam.
  - Em outro dia, grava o valor digitado, como hoje.
  - É uma função pura em `js/core/`, com testes.
- **O modo de edição**:
  - o aviso de edição tem o botão **"Cancelar edição"**, que volta ao mês registrado sem mudar nada;
  - a edição em andamento também fica no rascunho do aparelho, então sobrevive a sair do app, a trocar de aba e a dados chegando de outro aparelho;
  - tocar numa linha do mês registrado entra em edição e já abre a folha daquela tarefa, menos a 3, que abre "Atualizar só os saldos";
  - na edição, a dica da tarefa 2 usa o registro **anterior** ao mês atual.

## O que fica para quem implementar

- Como a folha cria a entrada de histórico (hash com parâmetro, `history.pushState` ou outro meio). Precisa funcionar com o roteador atual (`js/ui/rotas.js`): voltar fecha a folha e não troca de tela.
- A divisão do código entre `js/ui/mes.js` e um módulo novo em `js/core/`.
- Os detalhes visuais que o protótipo não fixou (espaçamentos, animação da folha respeitando `prefers-reduced-motion`), sempre com os componentes existentes.
