# Investir a sobra do próprio mês

## Por quê
O usuário recebe o salário no dia 27, e o salário de 27 de novembro paga as contas de dezembro. A regra anterior
(desenho 2026-11-20-investir-a-sobra) investia no Dia de pagamento de um mês a sobra do mês anterior, pensando num
pagamento no começo do mês. Com o salário no dia 27, isso ficava dois meses atrás. Ele quer "sempre ter uma noção do
quanto vai ter para investir": em dezembro, a sobra de dezembro.

## Decisão
- O Dia de pagamento de um mês investe a sobra do Balanço **do próprio mês**, menos 10% para lazer. No dia 27, as
  contas e as faturas do mês (que fecham dia 23/24) já fecharam: o valor é certo.
- Antes disso, a mesma conta é a previsão: a Carteira mostra "Para investir em <mês em foco>" com "(previsão)".
- As correções continuam: o vermelho de um mês compensa nas sobras seguintes (desde o 1º registro pela sobra, até
  6 meses), e um Dia de pagamento anterior feito pelo orçamento desconta o que já saiu deste salário.
- O a mais do mês (13º, PLR, 1/3 de férias) entra na sobra do mês e é investido no Dia de pagamento dele.

## Onde
`regraDaSobra` em `js/core/investir-sobra.js` (testes atualizados), os textos do Balanço ("no Dia de pagamento de
<mês>"), do salário a mais e do Dia de pagamento.
