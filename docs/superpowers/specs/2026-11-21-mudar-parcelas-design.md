# Corrigir o número de parcelas — desenho curto

Data: 2026-11-21. Pedido do usuário: "no cartão, em compras parceladas, se eu digitar um número errado de parcelas,
seria bom poder editar e alterar isso". Sem perguntas.

## Decisões (todas do executor)

- **Na folha de editar compra do Cartão**, logo abaixo do valor: "Parcelas" com − / + ("10 vezes") e uma dica que diz o
  que vai acontecer ("Entram 2 parcelas nas faturas seguintes. A última fica na fatura de novembro de 2027.").
- **A compra continua começando na mesma fatura.** Mais vezes: as parcelas que faltam entram nas faturas seguintes,
  com o valor e o "para quem" da última (o "já tenho" fica só na primeira, como ao anotar). Menos vezes: saem as do fim.
  Todas passam a dizer "n de N".
- **Vale também para a compra à vista** (digitou 1 vez por engano): mais vezes a transforma em parcelada, e o valor
  vira o de cada parcela; uma parcelada em 1 vez vira à vista.
- **Limites:** não dá para tirar a parcela que está sendo editada (nem as de antes dela), nem parcelas em faturas
  travadas; no máximo 48.
- Mudar o valor e as vezes juntos: primeiro a edição (o valor vale desta parcela em diante), depois as parcelas, que
  copiam o valor novo. Regra pura em `js/core/cartao.js` (`parcelasDaCompra`, `mudarParcelas`). Versão do site 65.
