# Salário digitado uma vez só — desenho curto

Data: 2026-11-21. Pedido do usuário: "tenho a impressão que estou tendo que digitar meu salário muitas vezes […] só
preciso uma única vez e isso conta para tudo, pode tomar as decisões, não me pergunte nada". Exemplos INVENTADOS
(repositório público): Ana administra e tem o planejador; Leo divide a casa.

## Hoje

O salário de quem administra aparece em três lugares que não se falam: Ajustes do planejador › Renda (o salário do
plano: metas e "veio algo a mais?"); Dia de pagamento › "Salário que caiu" (todo mês); Contas da casa › Mês ›
Salários (todo mês, para a divisão e o Balanço; sem digitar, repete o anterior como "a confirmar").

## Decisões (todas do executor)

- **Só na visão única** (quem administra, com o planejador). A outra pessoa digita o salário dela no Mês da casa como
  sempre.
- **Dia de pagamento › "Salário que caiu":** ao salvar, o salário de todo mês contido no que caiu vale também para o
  salário do mês no Mês da casa e para o salário do plano (a partir deste mês). Com 13º, férias, PLR — ou um valor
  bem acima do salário, que o app trata como extra —, o salário de todo mês é o do plano.
- **Mês da casa › salário de quem administra (mês atual):** ao salvar, vale também para o salário do plano; e o Dia de
  pagamento já abre com "Salário que caiu" preenchido e feito (se ainda não foi digitado neste mês).
- **Ajustes do planejador › Renda:** um salário novo vale também para o salário deste mês no Mês da casa, se ele ainda
  for previsão.
- Funções puras em `js/core/salario.js` (`salarioRegular`, `preencherRecebido`, `configComSalario`). Versão 20.
