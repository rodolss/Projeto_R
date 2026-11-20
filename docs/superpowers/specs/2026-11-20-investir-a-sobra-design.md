# Investir a sobra (com 10% para lazer) — desenho curto

Data: 2026-11-20. Pedido do usuário: "vou investir somente o que sobrar, e adiciona uns 10% do que sobrar para
lazer […] não me pergunte, só faça". Exemplos INVENTADOS (repositório público): Ana administra e tem o planejador.

## Decisões (todas do executor)

- **Só na visão única** (quem administra, com o planejador). Os outros: nada muda.
- **Quanto investir no Dia de pagamento de um mês:** a sobra do **Balanço do mês anterior** — o que já fechou: o
  salário daquele mês menos a parte nas contas da casa e o que é seu no cartão (a fatura que fechou nele, que vence
  no começo deste mês). É a única sobra conhecida de verdade no dia do salário (a fatura do mês corrente ainda está
  aberta). Dessa sobra, **10% para lazer** (`LAZER`) e **o resto para investir**.
- O motor recebe esse valor (`investirDefinido` em `calcularMes`) no lugar do excedente do orçamento: sem provisão
  das anuais, sem "separar para as anuais" e sem "guardar para o mês que vem" — o Balanço já conta as despesas no mês
  em que acontecem. A divisão entre reserva, carteira e caixa continua a mesma.
- **Dia de pagamento › Investir:** "Separe para investir este mês: R$ X" e, embaixo, "Sobrou em {mês}: R$ S. 10%
  para lazer: R$ L. Ver o balanço de {mês}" ("com valores ainda a confirmar" quando o balanço daquele mês ainda tem
  previsão). Sem sobra: "Em {mês} não sobrou nada: este mês não há o que investir".
- **Sem os dados do Balanço** (salários do mês anterior vazios ou sem divisão): o valor volta a sair do orçamento,
  com o aviso para preencher os salários.
- **Balanço (mês atual), cartão "Seu plano":** "Desta sobra, no Dia de pagamento de {mês seguinte}: R$ X para
  investir e R$ L para lazer (10%)", e é o que vai ser investido que se compara com o que o plano pede.
- O orçamento continua definindo as metas (independência) e a reserva; o aviso de gasto real acima do orçamento
  continua (média dos últimos meses fechados).

## Também nesta entrega (dados, fora do repositório)

O histórico falso de investimentos (importado do gerador em 12/11) foi tirado do `dados.json` do repositório
privado: voltou-se à última versão real (início em nov/2026, o mês registrado de verdade), mantendo a série do IPCA.
Versão do site 19.
