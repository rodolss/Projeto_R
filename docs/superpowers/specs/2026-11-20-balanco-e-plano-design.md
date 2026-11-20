# Balanço e plano juntos — desenho curto

Data: 2026-11-20. Depois da visão única, o executor sugeriu "uma tela inicial que junte o Balanço do mês com o
Plano, ou usar a sobra do Balanço para sugerir quanto investir"; o usuário: "pode fazer, não precisa me perguntar".
Exemplos INVENTADOS (repositório público): Ana administra e tem o planejador.

## Decisões (todas do executor)

- **Só na visão única** (quem administra, com o planejador). A outra pessoa e os demais: nada muda.
- **O Balanço é a tela inicial** (primeira aba). No mês atual, abaixo da sobra, um cartão **"Seu plano"**:
  - "Renda plena em X anos e Y meses" (a projeção do Início) e "Ver o plano ›";
  - a sobra do mês ao lado do que o plano pede por mês (`pmtNec`: o aporte que leva à renda plena no prazo):
    vermelho ("Neste mês não sobrou"), plano sem aporte ("o plano não pede mais aportes"), cobre ("A sobra cobre o
    que o plano pede ✓", com quanto fica livre) ou falta ("faltam R$ para o que o plano pede");
  - "Dia de pagamento ›" (a rotina do mês da aposentadoria).
- **Dia de pagamento › Investir:** abaixo de "Separe para investir", "Pelo Balanço, sobraram R$ X este mês". Se o
  gasto real do mês (o "saiu" do Balanço) passar 10% do custo mensal do orçamento: aviso para revisar o Orçamento.
- **O motor não muda:** o quanto investir continua saindo do salário e do orçamento. O Balanço só confere —
  trocar o orçamento pelo gasto real mudaria metas, reserva e projeções; fica para quando o usuário pedir.

## Abordagem

Funções puras em `js/core/balanco.js` (`compararComPlano`, `gastouMaisQueOOrcamento`) e um texto em
`js/ui/casa-balanco.js`; o painel vem de `calcularPainel` (o mesmo do Início). Versão do site 18.
