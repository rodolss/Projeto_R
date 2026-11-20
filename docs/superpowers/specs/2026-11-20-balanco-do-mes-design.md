# Balanço do mês (Contas da casa) — desenho curto

Data: 2026-11-20. Pedido do usuário: uma aba embaixo, ao lado do Mês, com o balanço geral do mês (o que entrou e o
que saiu), levando em conta as contas da casa e o cartão — cada um paga o próprio cartão e a sua parte das contas;
o que passa no cartão e é da casa já é dividido nas contas da casa. "Pode tomar todas as decisões; não precisa me
perguntar, só implemente até o fim" (sem entrevista). Exemplos INVENTADOS (repositório público): Ana e Leo dividem
a casa; o cartão c2 é do Leo; a Mãe é outra pessoa.

## Decisões (todas do executor)

- **Aba "Balanço"**, a segunda do menu da casa: Mês · Balanço · Cartão · Ano · Ajustes. Ícone de duas setas
  (entra/sai). Endereço `#/casa-balanco?mes=AAAA-MM` (e `&pessoa=pX` sem perfis).
- **De quem:** o balanço é de uma pessoa (o cartão de cada um é só dela, como nos perfis). Com perfil, o do perfil
  visto (quem administra vê o da outra pessoa trocando de perfil, como em todo o app). Sem perfis: botões com as
  pessoas da casa (a primeira por padrão).
- **O mês** é o mês em que se paga, como no Mês: o salário do mês, a parte das contas do mês e as faturas dos
  cartões da pessoa que vencem no mês.
- **Entrou:** o salário do mês (com "a confirmar · igual a {mês}" ou "Falta preencher").
- **Saiu:** (1) a parte da pessoa nas contas da casa ("paga" do Mês; já inclui a parte da casa dos cartões, que não
  é contada de novo); (2) para cada cartão dela, o que é dela própria na fatura (compras e de todo mês para ela).
- **Para outras pessoas** (no cartão dela, nem Casa nem ela): aparece à parte, com "Já tenho X · falta Y", e não
  entra na sobra — ela paga no cartão e recebe de volta.
- **Sobra** = entrou − saiu, em destaque (verde se ≥ 0; em vermelho se < 0), com "Entrou R$ · saiu R$" e o selo
  "previsão" quando algo ainda pode mudar (salário ou conta a confirmar, fatura ainda aberta).
- Tocar nas linhas leva ao lugar do detalhe: contas → Mês; cartão e outras pessoas → a fatura no Cartão.
- Sem divisão (salários vazios): a linha das contas mostra "—" e pede para preencher os salários no Mês.
- Perfil que não divide a casa (perfil novo): só os cartões.

## Abordagem

Núcleo `balancoDoMes(casa, mes, pessoaId, hoje)` em `js/core/balanco.js` (reaproveita `resumoDoMes` e
`faturaDoCartao`); tela `js/ui/casa-balanco.js` só desenha. Versão do site 15.

## Adendo (versão 16): a fatura que fecha no mês; Balanço em primeiro

- **Problema relatado:** o cartão da pessoa não aparecia no balanço do mês. Exemplo inventado: o cartão do Leo vira
  no dia 24 e vence no dia 1. O balanço usava a fatura que *vence* no mês: em novembro entrava a fatura que venceu
  em 01/11 (compras de 24/09 a 23/10), e a fatura das compras de novembro (vence em 01/12) só em dezembro.
- **Decisão:** no balanço, cada cartão entra com a fatura que **fecha** no mês. Com o vencimento antes do melhor dia,
  é a fatura que vence no começo do mês seguinte (as compras feitas no mês), paga com o dinheiro deste mês, antes do
  próximo salário. Com o vencimento depois do melhor dia (vira 3, vence 10) nada muda; com vira = 1, a fatura do mês
  traz as compras do mês anterior, como antes. Sem os dias: a do próprio mês. A linha diz "o que é seu na fatura que
  vence em dd/mm" e leva a essa fatura.
- **As contas da casa não mudam:** a parte da casa de uma fatura continua nas contas do mês em que ela vence (a regra
  da planilha). Com vencimento no dia 1, a parte da pessoa e a parte da casa da mesma fatura aparecem em meses
  vizinhos; cada uma conta uma vez só. O rodapé da tela diz isso.
- **Menu:** Balanço · Mês · Cartão · Ano · Ajustes. O aparelho também lembra o Balanço como tela de abertura da
  casa (como já lembrava Mês e Cartão).
