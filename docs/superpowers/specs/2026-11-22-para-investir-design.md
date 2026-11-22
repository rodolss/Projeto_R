# Para investir este mês, na Carteira

## Por quê
O usuário quer ver na Carteira quanto tem para investir no mês: o que sobra todo mês.

## Decisões (recomendadas; o usuário autorizou seguir o recomendado)
- O valor é o mesmo do Dia de pagamento: a sobra do Balanço do mês anterior menos 10% para lazer, descontando o que
  o mês anterior já investiu pela regra antiga e o vermelho a compensar (`regraDaSobra`). Um número só no app.
- Junto, o potencial: a média dos últimos 3 Dias de pagamento com o Balanço completo (aparece com 2 meses ou mais).
- Fica no topo da aba Resumo, no lugar do cartão "Dia de pagamento?", com o botão "Investir agora" (ou "Continuar o
  Dia de pagamento"). Com o mês já registrado, ou fora da visão única (sem o Balanço), fica o cartão do pagamento.
- Faltando os salários do mês anterior no Balanço, o cartão diz isso e leva ao Balanço daquele mês.

## Como fica
`potencialDeInvestimento({ casa, estado, pessoaId, mes, hoje })` em `js/core/investir-sobra.js` (testada) e o cartão
`cartaoParaInvestir` em `js/ui/inicio.js`.
