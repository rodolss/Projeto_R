# Compras do cartão no Mês da casa — desenho curto

Data: 2026-11-20. Pedido do usuário: no Mês da casa, tocar na conta ligada ao cartão (ex.: "Cartão Ana") e ver as
compras detalhadas, para todos os perfis. Entrevista Q1–Q4 respondida com "pode seguir com tudo que achar
recomendado". Exemplos INVENTADOS (repositório público): Ana é a dona do cartão, Leo divide a casa com ela.

## Hoje

- Quem não é dono (com perfis): folha só de leitura com as compras da casa daquela fatura.
- A dona (ou sem perfis): sai do Mês e vai para a aba Cartão (a fatura inteira, com as compras pessoais).
- Meses de antes da primeira fatura com compras vieram da planilha só com o total: a folha diz "Nenhuma compra".

## Decisões

- **Q1 — a mesma folha para todos.** Toda conta ligada a um cartão abre a folha da parte da casa, no próprio Mês.
  Quem vê esse cartão (a dona; sem perfis, todos) tem também o botão **"Abrir no Cartão"** (para anotar ou
  corrigir), que troca a tela pela fatura no Cartão (voltar leva ao Mês).
- **Q2 — o que a folha mostra:** "{conta} · fatura de {mês}"; "Compras de dd/mm a dd/mm" (só com os dias do
  cartão); de quem é ("Do cartão de Ana: só o que é da casa. Quem anota é Ana." ou, para a dona, "Só o que é da
  casa. As suas compras pessoais ficam no Cartão."); total da parte da casa com o selo "conferida" ou "a
  confirmar"; as compras da casa (mais nova primeiro: nome, data, "2 de 10") e as de todo mês da casa. Nunca nada
  pessoal, nem para a dona.
- **Q3 — mês sem compras:** antes da primeira fatura com compras do cartão e com valor confirmado: "Este mês veio
  da planilha só com o total, sem as compras."; previsto: "Previsão: igual a {mês}." (como hoje); senão "Nenhuma
  compra da casa anotada nesta fatura."
- **Q4 — vale para qualquer conta ligada a um cartão**, de qualquer pessoa.

## Abordagem

Uma função do núcleo (`detalheDaContaNoMes` em `js/core/perfis.js`, junto de `parteDaCasaNoCartao`) decide tudo o
que a folha mostra; a folha em `js/ui/casa.js` só desenha. `aoTocarConta` passa a devolver `'parte'` para toda
conta com cartão. Outra abordagem (levar todos para o Cartão) mostraria compras pessoais da dona a quem não é dono
ou exigiria um modo "só casa" no Cartão: descartada. Versão do site 14.
