# Salário digitado uma vez só — desenho curto

> **Substituído** por 2026-11-21-salario-no-balanco (versão 21): o salário passou a ser digitado só no Balanço.

Data: 2026-11-21. Pedido do usuário: "tenho a impressão que estou tendo que digitar meu salário muitas vezes […] só
preciso uma única vez e isso conta para tudo, pode tomar as decisões, não me pergunte nada". Exemplos INVENTADOS
(repositório público): Ana administra e tem o planejador; Leo divide a casa.

## Hoje

O salário de quem administra aparece em três lugares que não se falam: Ajustes do planejador › Renda (o salário do
plano: metas e "veio algo a mais?"); Dia de pagamento › "Salário que caiu" (todo mês); Contas da casa › Mês ›
Salários (todo mês, para a divisão e o Balanço; sem digitar, repete o anterior como "a confirmar").

## Decisões (todas do executor, revistas depois da revisão)

- **Só na visão única** (quem administra, com o planejador). A outra pessoa digita o salário dela no Mês da casa como
  sempre.
- **Um lugar por mês: Dia de pagamento › "Salário que caiu".** Ao salvar, o salário de todo mês contido no que caiu
  (o efetivo: com o adiantamento das férias guardado no mês anterior) vai para o salário do mês no Mês da casa —
  **só se lá ainda for previsão** (o digitado na casa manda). Com 13º, férias, PLR — ou um valor bem acima do
  salário, que o app trata como extra —, o salário de todo mês é o do plano. Editar um mês já registrado não mexe na
  casa.
- **O salário do plano não muda sozinho.** É a referência (Ajustes do planejador › Renda): metas, reserva, "veio algo
  a mais?". Trocar pelo valor de cada mês derrubaria e travaria o plano depois de um mês menor (como o depois das
  férias) e dobraria com um 13º digitado na casa. Ele muda em Ajustes, num aumento — e aí vale também para o salário
  deste mês no Mês da casa, se ele ainda for previsão.
- **Digitou primeiro no Mês da casa (mês atual):** o Dia de pagamento abre com o valor preenchido ("Confira: R$ X"),
  sem marcar feito — um toque confirma, e em mês de 13º dá para corrigir.
- Funções puras em `js/core/salario.js` (`salarioRegular`, `preencherRecebido`, `levarParaCasa`). Versão 20.
