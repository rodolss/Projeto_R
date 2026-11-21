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

## Correções da revisão

- **Troca de regra sem contar duas vezes:** cada mês registrado guarda a origem (`sugestao.origem`: `sobra` ou
  `orcamento`). Se o mês anterior foi registrado pelo orçamento (ou antes desta regra, sem origem), o que saiu do
  salário dele naquele Dia de pagamento (aplicado − proventos) é descontado da sobra.
- **13º, PLR e férias:** o que veio a mais no mês do pagamento é sobra extra: 10% para lazer e o resto investido
  agora; nas férias, só o 1/3 é extra e os 3/4 ficam guardados para o mês seguinte (como na regra do orçamento).
- **Vermelho:** um mês que fecha negativo fica para as próximas sobras cobrirem, desde o começo da regra (o mês antes
  do 1º Dia de pagamento registrado pela sobra), até 6 meses.
- **A regra é pura e testada** (`regraDaSobra` em `js/core/investir-sobra.js`). Sem as contas da casa carregadas, o
  valor sai do orçamento com aviso; o texto de "não sobrou nada" é o mesmo na lista e na folha; "dia a dia" fica 0 na
  regra nova; "Desta sobra (previsão)" no Balanço.
