# Salário só no Balanço — desenho curto

Data: 2026-11-21. Pedido do usuário: "quero digitar num único lugar e isso ser replicado para os demais sem poder
editar por outro lugar, somente no único lugar, e que seja na parte do balanço. não me pergunte só faça". Substitui o
desenho 2026-11-21-salario-unico (que deixava digitar em vários lugares e replicava). Exemplos INVENTADOS
(repositório público): Ana administra e tem o planejador; Leo divide a casa.

## Decisões (todas do executor)

- **Só na visão única** (quem administra, com o planejador, vendo o próprio perfil). A outra pessoa continua
  digitando o salário dela no Mês da casa; o Balanço dela segue só de leitura.
- **O único lugar: Balanço › Entrou › Salário.** Tocar abre a folha "Seu salário de {mês}" com:
  - **Salário do mês** (o de todo mês): o salário da casa naquele mês (divisão das contas e Balanço);
  - **A mais neste mês** (opcional): 13º, o 1/3 das férias, PLR, bônus. Fica em `casa.extras[mês][pessoa]`, não muda
    a divisão das contas, entra no "Entrou" e na sobra — e, pela regra de investir a sobra, é investido no Dia de
    pagamento seguinte (10% para lazer). O adiantamento das férias não é "a mais": é o salário do mês seguinte.
  - "Tirar o salário deste mês" volta à previsão.
- **Os outros lugares só mostram:**
  - Dia de pagamento › "Salário que caiu": o salário + o a mais do Balanço daquele mês; feito sozinho quando o
    salário do mês está confirmado; tocar explica e leva ao Balanço. Pela sobra, o motor não investe o a mais no
    próprio Dia de pagamento (ele já vai pela sobra; `semExtra`).
  - Mês da casa › Salários: a linha de quem administra só mostra e leva ao Balanço (a da outra pessoa continua
    editável).
  - Ajustes do planejador › Renda: o salário mostra o salário do plano (que vem do Balanço) e leva a ele; "recebo
    13º" e "recebo férias" continuam editáveis.
- **O salário do plano acompanha o Balanço (revisto depois da revisão):** é sempre o salário do último mês confirmado
  até hoje, recalculado (não acumulado) depois de cada gravação da casa e a cada desenho de tela (app.js). Um mês
  futuro não mexe; um mês menor seguido de um normal volta ao normal; tirar um mês volta ao anterior; nada trava. O a
  mais nunca entra nele.
- Mês já registrado: o Dia de pagamento mostra o salário do registro (só leitura) e, se o Balanço mudou depois, o
  valor de lá. Na folha do Balanço, aviso quando o Dia de pagamento do mês seguinte já foi registrado (o a mais
  digitado tarde não entra mais nele).
- `extras` fica fora de `meses` (no topo do casa.json) para um app antigo que regrava o mês não apagá-lo. Funções
  puras em `js/core/salario.js`. Versão 21.
