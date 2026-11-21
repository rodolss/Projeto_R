# Planejador integrado ao resto do app — desenho curto

Data: 2026-11-21. Pedido do usuário: "o planejador não está totalmente integrado com o resto do app, até seus menus
parecem com outra formatação […] se já tiver alguma info em outro lugar não é necessário ali […] tudo precisa
funcionar como um ecossistema", com os exemplos do Orçamento (categorias) e da Renda nos Ajustes do planejador. Sem
perguntas (pedido anterior do usuário). Exemplos INVENTADOS (repositório público): Ana administra e tem o planejador.

## Decisões (todas do executor; só na visão única — a outra pessoa e os demais, nada muda)

- **Custo de vida pelo Balanço.** O custo de vida do plano (meta de independência, reserva de emergência) passa a ser
  a média do que saiu nos últimos 6 meses fechados (sem previsão, com a divisão das contas): a sua parte das contas da
  casa + o que é seu no cartão, inclusive o que já tinha guardado ("já tenho"); o que outras pessoas ainda vão devolver
  não conta. Sem mês fechado, vale o orçamento digitado. Funções puras em `js/core/custo-de-vida.js`.
- **Sincronizado como o salário.** O `app.js` (`acompanharCasa`, antes `acompanharSalario`) grava no plano, quando
  muda, o orçamento como um item só (`gasto-real`, do mês de hoje) e a revisão do orçamento em dia. As categorias
  digitadas ficam guardadas em `orcamentoManual`.
- **Orçamento vira "Custo de vida"** (só leitura): o valor no cartão herói, de onde vem (contas e cartão, com link) e
  mês a mês (cada mês abre o Balanço). Sem "adicionar categoria".
- **Um "Ajustes" só no Mais.** Os Ajustes da casa viram "Ajustes" e ganham a seção "Plano de aposentadoria", que leva
  aos "Ajustes do plano" (premissas, carteira-alvo, investimentos, lembretes, backup), com "‹ Ajustes" para voltar.
  Saem dali a **Renda** (o salário vem do Balanço; 13º e férias só valiam para a provisão das anuais da regra antiga
  do orçamento, que a regra da sobra não usa) e a **Sincronização** (é a mesma chave das contas da casa).
- **Dia de pagamento no visual do resto:** o cabeçalho do mês é o cartão herói e as tarefas viram uma lista só.
- **Sem o aviso "revise o orçamento"** no Dia de pagamento: com o custo de vida real, não há o que revisar
  (`gastoMedioFechado` e `gastouMaisQueOOrcamento` saíram do core).

## Fora do escopo

Restaurar `orcamentoManual` sozinho se a visão única deixar de valer; o assistente de primeiro uso (continua pedindo
salário e orçamento ao criar o plano). Versão do site 60.
