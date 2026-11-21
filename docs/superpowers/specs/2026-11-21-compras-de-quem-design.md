# As compras de cada um no Cartão — desenho curto

Data: 2026-11-21. Pedido do usuário: "na aba Cartão, na parte de 'De quem é', quero clicar no nome e abrir a lista das
compras para aquela pessoa, como é aberto o do cartão na aba Contas, para todos os nomes, e ter uma forma de organizar
por data crescente ou decrescente com apenas um ícone correspondente. Além disso, no perfil da Nínive, ao tocar em
'Casa' em 'De quem é', vai para a aba Contas, o que não faz sentido: era para listar as compras do cartão com a tag de
casa". Sem perguntas.

## Decisões (todas do executor)

- **Todo nome de "De quem é" abre uma folha** com as compras daquela pessoa nesta fatura: o nome, "Fatura de {mês}",
  o total, um resumo ("6 compras · entra nas contas da casa de dezembro" ou "2 compras · já tenho R$ X · falta R$ Y"),
  a lista (nome, data, "3 de 10", "Já tenho") e as de todo mês no fim. Tocar numa compra abre os detalhes dela.
- **A Casa também** (para todos os perfis): abre a lista das compras da casa no cartão, em vez de ir para as Contas;
  "Ver as contas da casa de {mês}" continua como link na folha.
- **Um ícone ordena**: mais novas primeiro (o começo) ↔ mais antigas primeiro; o desenho do ícone mostra a ordem do
  momento e a dica diz o que o toque faz. Compras sem data (da planilha) ficam no fim. A escolha vale até fechar o app.
- Folha no endereço: `pessoa-<id>` (`pessoa-casa`). Versão do site 68.
